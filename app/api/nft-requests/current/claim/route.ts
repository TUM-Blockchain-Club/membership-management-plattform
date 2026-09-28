import { NextResponse } from 'next/server'
import { isSolanaPublicKey } from '@/lib/server/solanaMembership'
import {
  NftRequestCurrentMemberError,
  resolveCurrentNftRequestMember,
} from '@/lib/server/nftRequestCurrentMember'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type ClaimPayload = { walletAddress?: string }

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ClaimPayload
    const walletAddress = payload.walletAddress?.trim() || ''
    if (!isSolanaPublicKey(walletAddress)) {
      return NextResponse.json({ error: 'Enter a valid Solana wallet address.' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    const { member, dataClient } = await resolveCurrentNftRequestMember(supabase, request)
    const { data: current, error: lookupError } = await dataClient
      .from('nft_requests')
      .select('id, asset_address, asset_state')
      .eq('member_id', member.ID)
      .maybeSingle()
    if (lookupError || !current) {
      return NextResponse.json({ error: lookupError?.message || 'NFT request not found.' }, { status: 404 })
    }
    if (!current.asset_address || current.asset_state === 'unminted' || current.asset_state === 'burned') {
      return NextResponse.json({ error: 'There is no claimable membership NFT.' }, { status: 409 })
    }

    const { data, error } = await dataClient
      .from('nft_requests')
      .update({
        claim_wallet_address: walletAddress,
        claim_requested_at: new Date().toISOString(),
      })
      .eq('id', current.id)
      .select('*')
      .single()
    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Could not save the claim request.' }, { status: 500 })
    }
    return NextResponse.json({ request: data })
  } catch (error) {
    if (error instanceof NftRequestCurrentMemberError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Could not request the NFT transfer.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
