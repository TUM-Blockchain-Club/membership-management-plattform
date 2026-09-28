import { NextResponse } from 'next/server'
import {
  confirmNftChainOperation,
  failNftChainOperation,
  startNftChainOperation,
} from '@/lib/server/nftChainOperation'
import { NftRequestAdminError, requireNftRequestAdmin } from '@/lib/server/nftRequestAdmin'
import { claimMembershipAsset, isSolanaPublicKey } from '@/lib/server/solanaMembership'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type RouteContext = { params: Promise<{ requestId: string }> }

export async function POST(request: Request, context: RouteContext) {
  let operationId: string | null = null
  try {
    const { requestId } = await context.params
    const supabase = await createSupabaseServerClient()
    await requireNftRequestAdmin(supabase, request)
    const dataClient = getSupabaseAdminClient() ?? supabase
    const { data: record, error: lookupError } = await dataClient
      .from('nft_requests')
      .select('id, asset_address, asset_state, claim_wallet_address')
      .eq('id', requestId)
      .maybeSingle()
    if (lookupError || !record) {
      return NextResponse.json({ error: lookupError?.message || 'NFT request not found.' }, { status: 404 })
    }
    if (!record.asset_address || record.asset_state === 'unminted' || record.asset_state === 'burned') {
      return NextResponse.json({ error: 'There is no transferable membership NFT.' }, { status: 409 })
    }
    if (!record.claim_wallet_address || !isSolanaPublicKey(record.claim_wallet_address)) {
      return NextResponse.json({ error: 'The member has not supplied a valid Solana wallet.' }, { status: 409 })
    }

    operationId = await startNftChainOperation(dataClient, requestId, 'claim')
    const result = await claimMembershipAsset({
      assetAddress: record.asset_address,
      recipientAddress: record.claim_wallet_address,
    })
    await confirmNftChainOperation(dataClient, operationId, {
      assetAddress: record.asset_address,
      signature: result.signature,
    })

    const now = new Date().toISOString()
    const { data, error } = await dataClient
      .from('nft_requests')
      .update({
        owner_address: record.claim_wallet_address,
        custody_status: 'member',
        claimed_at: now,
        update_tx_hash: result.signature,
        updated_on_chain_at: now,
        reconciled_at: now,
        last_chain_error: null,
      })
      .eq('id', requestId)
      .select('*')
      .single()
    if (error || !data) throw new Error(error?.message || 'Could not save the claimed NFT state.')
    return NextResponse.json({ request: data, transactionSignature: result.signature })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'NFT claim failed.'
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
