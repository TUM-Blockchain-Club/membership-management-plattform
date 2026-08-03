import { NextResponse } from 'next/server'
import { getMembershipAssetState } from '@/lib/nftLifecycle'
import {
  confirmNftChainOperation,
  failNftChainOperation,
  startNftChainOperation,
} from '@/lib/server/nftChainOperation'
import { NftRequestAdminError, requireNftRequestAdmin } from '@/lib/server/nftRequestAdmin'
import {
  loadMembershipNftRecord,
  deleteSupersededMembershipPublicAssets,
  deleteSupersededMembershipSourceImages,
  renderAndUploadMembershipAssets,
} from '@/lib/server/membershipNftAssets'
import { mintMembershipAsset, updateMembershipAsset } from '@/lib/server/solanaMembership'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ requestId: string }> }

export async function POST(request: Request, context: RouteContext) {
  let operationId: string | null = null

  try {
    const { requestId } = await context.params
    const supabase = await createSupabaseServerClient()
    const { user } = await requireNftRequestAdmin(supabase, request)
    const dataClient = getSupabaseAdminClient() ?? supabase
    const record = await loadMembershipNftRecord(dataClient, requestId)
    const desiredState = getMembershipAssetState(record.member.status)

    if (desiredState === 'revoked') {
      return NextResponse.json(
        { error: 'Left, kicked or revoked members cannot receive a membership NFT.' },
        { status: 409 }
      )
    }
    if (record.request.asset_state === 'burned') {
      return NextResponse.json({ error: 'This membership NFT has been burned.' }, { status: 409 })
    }

    const assetState = desiredState === 'alumni' ? 'alumni' : 'active'
    const rendered = await renderAndUploadMembershipAssets(dataClient, record, assetState)
    const operation = record.request.asset_address ? 'update' : 'mint'
    operationId = await startNftChainOperation(dataClient, requestId, operation)
    const chainResult = record.request.asset_address
      ? await updateMembershipAsset({
          assetAddress: record.request.asset_address,
          name: `${record.request.display_name} — TBC Membership`,
          uri: rendered.metadataUrl,
        })
      : await mintMembershipAsset({
          name: `${record.request.display_name} — TBC Membership`,
          uri: rendered.metadataUrl,
        })

    const mintedAssetAddress =
      'assetAddress' in chainResult && typeof chainResult.assetAddress === 'string'
        ? chainResult.assetAddress
        : null
    const assetAddress = record.request.asset_address || mintedAssetAddress
    await confirmNftChainOperation(dataClient, operationId, {
      assetAddress: assetAddress ?? undefined,
      signature: chainResult.signature,
    })

    const now = new Date().toISOString()
    const { data: updatedRequest, error: updateError } = await dataClient
      .from('nft_requests')
      .update({
        status: 'approved',
        reviewed_at: now,
        reviewed_by: user?.id ?? null,
        review_note: null,
        rendered_image_path: rendered.imagePath,
        image_url: rendered.imageUrl,
        metadata_path: rendered.metadataPath,
        metadata_url: rendered.metadataUrl,
        metadata_version: rendered.metadataVersion,
        approved_display_name: record.request.display_name,
        approved_fun_facts: record.request.fun_facts,
        approved_image_path: record.request.image_path,
        approved_image_bucket: record.request.request_image_bucket,
        chain_network: chainResult.network,
        collection_address: 'collectionAddress' in chainResult ? chainResult.collectionAddress : undefined,
        asset_address: assetAddress,
        owner_address: 'ownerAddress' in chainResult ? chainResult.ownerAddress : undefined,
        custody_status: record.request.asset_address ? undefined : 'club',
        asset_state: assetState,
        mint_tx_hash: record.request.asset_address ? undefined : chainResult.signature,
        update_tx_hash: record.request.asset_address ? chainResult.signature : undefined,
        minted_at: record.request.asset_address ? undefined : now,
        updated_on_chain_at: now,
        last_chain_error: null,
        reconciled_at: now,
      })
      .eq('id', requestId)
      .select('*')
      .single()

    if (updateError || !updatedRequest) {
      return NextResponse.json(
        {
          error: `Confirmed on Solana (${chainResult.signature}) but failed to save the request: ${updateError?.message || 'unknown database error'}`,
          assetAddress,
          transactionSignature: chainResult.signature,
        },
        { status: 500 }
      )
    }

    if (record.request.asset_address) {
      await Promise.all([
        deleteSupersededMembershipPublicAssets(dataClient, record, [
          rendered.imagePath,
          rendered.metadataPath,
        ]),
        deleteSupersededMembershipSourceImages(dataClient, record, {
          bucket: record.request.request_image_bucket,
          path: record.request.image_path,
        }),
      ])
    }

    return NextResponse.json({
      request: updatedRequest,
      assetAddress,
      transactionSignature: chainResult.signature,
      operation,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Solana membership operation failed.'
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
