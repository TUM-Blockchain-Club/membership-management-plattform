import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCoffeeChatAdminClient } from '@/lib/coffee-chats/supabase'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: member, error: memberError } = await supabase
      .from('members_main')
      .select('id')
      .ilike('"TBC Email"', user.email ?? '')
      .maybeSingle()

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member profile not found' }, { status: 404 })
    }

    const memberId = member.id as number
    const admin = getCoffeeChatAdminClient()
    if (!admin) {
      return NextResponse.json({ error: 'Admin client unavailable' }, { status: 500 })
    }

    // Find the most recent paired round
    const { data: latestRound } = await admin
      .from('cc_rounds')
      .select('id, month, meet_deadline')
      .in('status', ['paired', 'closed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!latestRound) {
      return NextResponse.json({ match: null })
    }

    // Find this member's pair in that round
    const { data: pair } = await admin
      .from('cc_pairs')
      .select('id, person1_id, person2_id, person3_id, icebreaker_q1, icebreaker_q2, icebreaker_q3, status, selfie_path, date_met, person1_signed_off, person2_signed_off, person3_signed_off, rating, highlight_note')
      .eq('round_id', latestRound.id)
      .or(`person1_id.eq.${memberId},person2_id.eq.${memberId},person3_id.eq.${memberId}`)
      .maybeSingle()

    if (!pair) {
      return NextResponse.json({ match: null, round: latestRound })
    }

    // Load partner info
    const partnerIds = [pair.person1_id, pair.person2_id, pair.person3_id]
      .filter((id): id is number => id !== null && id !== memberId)

    const { data: partners } = await admin
      .from('members_main')
      .select('id, Name, "TBC Email", Department, cc_interests, cc_favourite_coffee, cc_favourite_spots, cc_fun_fact')
      .in('id', partnerIds)

    const { selfie_path: selfiePath, ...pairData } = pair
    const { data: signedSelfie } = selfiePath
      ? await admin.storage.from('coffee-chat-selfies').createSignedUrl(selfiePath, 60 * 60)
      : { data: null }

    return NextResponse.json({
      match: {
        pair: { ...pairData, selfie_url: signedSelfie?.signedUrl ?? null },
        partners: partners ?? [],
        round: latestRound,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load match'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
