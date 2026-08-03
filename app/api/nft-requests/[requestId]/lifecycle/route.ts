import { NextResponse } from 'next/server'
import { getMembershipAssetAction } from '@/lib/nftLifecycle'
import {
  confirmNftChainOperation,
  failNftChainOperation,
  startNftChainOperation,
} from '@/lib/server/nftChainOperation'
import { NftRequestAdminError, requireNftRequestAdmin } from '@/lib/server/nftRequestAdmin'
import {
  deleteMembershipPublicAssets,
  deleteMembershipSourceImages,
  deleteSupersededMembershipPublicAssets,
  loadMembershipNftRecord,
  renderAndUploadMembershipAssets,
} from '@/lib/server/membershipNftAssets'
import { burnMembershipAsset, updateMembershipAsset } from '@/lib/server/solanaMembership'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ requestId: string }> }
type LifecyclePayload = { action?: 'sync' | 'revoke' }

export async function POST(request: Request, context: RouteContext) {
  let operationId: string | null = null

  try {
    const { requestId } = await context.params
    const payload = (await request.json()) as LifecyclePayload
    const supabase = await createSupabaseServerClient()
    await requireNftRequestAdmin(supabase, request)
    const dataClient = getSupabaseAdminClient() ?? supabase
    const record = await loadMembershipNftRecord(dataClient, requestId, 'approved')

    if (!record.request.asset_address || record.request.asset_state === 'unminted') {
      return NextResponse.json({ error: 'This request has no Solana asset.' }, { status: 409 })
    }
    if (record.request.asset_state === 'burned') {
      return NextResponse.json({ error: 'This Solana asset is already burned.' }, { status: 409 })
    }

    const action = payload.action === 'revoke'
      ? 'burn'
      : getMembershipAssetAction(record.member.status, record.request.asset_state)

    if (action === 'none') {
      return NextResponse.json({ request: record.request, action: 'none' })
    }

    if (action === 'update_alumni') {
      const rendered = await renderAndUploadMembershipAssets(dataClient, record, 'alumni')
      operationId = await startNftChainOperation(dataClient, requestId, 'update')
      const result = await updateMembershipAsset({
        assetAddress: record.request.asset_address,
        name: `${record.request.display_name} — TBC Alumni`,
        uri: rendered.metadataUrl,
      })
      await confirmNftChainOperation(dataClient, operationId, {
        assetAddress: record.request.asset_address,
        signature: result.signature,
      })

      const now = new Date().toISOString()
      const { data, error } = await dataClient
        .from('nft_requests')
        .update({
          asset_state: 'alumni',
          rendered_image_path: rendered.imagePath,
          image_url: rendered.imageUrl,
          metadata_path: rendered.metadataPath,
          metadata_url: rendered.metadataUrl,
          metadata_version: rendered.metadataVersion,
          update_tx_hash: result.signature,
          updated_on_chain_at: now,
          reconciled_at: now,
          last_chain_error: null,
        })
        .eq('id', requestId)
        .select('*')
        .single()
      if (error || !data) throw new Error(error?.message || 'Could not save the alumni update.')
      await deleteSupersededMembershipPublicAssets(dataClient, record, [
        rendered.imagePath,
        rendered.metadataPath,
      ])
      return NextResponse.json({ request: data, action, transactionSignature: result.signature })
    }

    operationId = await startNftChainOperation(dataClient, requestId, 'burn')
    const result = await burnMembershipAsset(record.request.asset_address)
    await confirmNftChainOperation(dataClient, operationId, {
      assetAddress: record.request.asset_address,
      signature: result.signature,
    })
    await Promise.all([
      deleteMembershipPublicAssets(dataClient, record),
      deleteMembershipSourceImages(dataClient, record),
    ])

    const now = new Date().toISOString()
    const { data, error } = await dataClient
      .from('nft_requests')
      .update({
        asset_state: 'burned',
        custody_status: 'club',
        owner_address: null,
        claim_wallet_address: null,
        claim_requested_at: null,
        display_name: 'Removed membership',
        fun_facts: null,
        approved_display_name: null,
        approved_fun_facts: null,
        approved_image_path: null,
        approved_image_bucket: null,
        image_path: `removed/${requestId}`,
        image_url: `removed:${requestId}`,
        rendered_image_path: null,
        metadata_path: null,
        metadata_url: null,
        burn_tx_hash: result.signature,
        burned_at: now,
        updated_on_chain_at: now,
        reconciled_at: now,
        last_chain_error: null,
      })
      .eq('id', requestId)
      .select('*')
      .single()
    if (error || !data) throw new Error(error?.message || 'Could not save the burned membership state.')

    return NextResponse.json({ request: data, action, transactionSignature: result.signature })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Membership lifecycle update failed.'
    if (operationId) {
      const dataClient = getSupabaseAdminClient()
      if (dataClient) await failNftChainOperation(dataClient, operationId, message)
    }
    if (error instanceof NftRequestAdminError) {
      return NextResponse.json({ error: message }, { status: error.status })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
