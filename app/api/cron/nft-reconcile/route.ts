import { NextResponse } from 'next/server'
import { reconcileMembershipNfts } from '@/lib/server/reconcileMembershipNfts'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase admin credentials are not configured.' }, { status: 500 })
  }

  const results = await reconcileMembershipNfts(supabase)
  return NextResponse.json({ results })
}
