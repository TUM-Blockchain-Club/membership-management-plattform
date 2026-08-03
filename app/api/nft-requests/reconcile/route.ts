import { NextResponse } from 'next/server'
import { NftRequestAdminError, requireNftRequestAdmin } from '@/lib/server/nftRequestAdmin'
import { reconcileMembershipNfts } from '@/lib/server/reconcileMembershipNfts'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    await requireNftRequestAdmin(supabase, request)
    const results = await reconcileMembershipNfts(getSupabaseAdminClient() ?? supabase)
    return NextResponse.json({ results })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'NFT reconciliation failed.'
    if (error instanceof NftRequestAdminError) {
      return NextResponse.json({ error: message }, { status: error.status })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
