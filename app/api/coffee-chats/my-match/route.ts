import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCoffeeChatAdminClient } from '@/lib/server/coffeeChats'

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

    // Prefer this member's latest unfinished pair, then fall back to their latest pair.
    const pairColumns =
      'id, person1_id, person2_id, person3_id, icebreaker_q1, icebreaker_q2, icebreaker_q3, status, selfie_path, date_met, person1_signed_off, person2_signed_off, person3_signed_off, rating, highlight_note, created_at, cc_rounds!inner(id, month, meet_deadline)'
    const pairFilter = `person1_id.eq.${memberId},person2_id.eq.${memberId},person3_id.eq.${memberId}`
    const [pendingPairResult, latestPairResult] = await Promise.all([
      admin
        .from('cc_pairs')
        .select(pairColumns)
        .or(pairFilter)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('cc_pairs')
        .select(pairColumns)
        .or(pairFilter)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    const pair = pendingPairResult.data ?? latestPairResult.data

    if (!pair) {
      return NextResponse.json({ match: null })
    }

    const pairRound = Array.isArray(pair.cc_rounds) ? pair.cc_rounds[0] : pair.cc_rounds

    // Load partner info
    const partnerIds = [pair.person1_id, pair.person2_id, pair.person3_id]
      .filter((id): id is number => id !== null && id !== memberId)

    const { data: partners } = await admin
      .from('members_main')
      .select('id, Name, "TBC Email", Department, cc_interests, cc_favourite_coffee, cc_favourite_spots, cc_fun_fact')
      .in('id', partnerIds)

    const selfiePath = pair.selfie_path
    const pairData = {
      id: pair.id,
      person1_id: pair.person1_id,
      person2_id: pair.person2_id,
      person3_id: pair.person3_id,
      icebreaker_q1: pair.icebreaker_q1,
      icebreaker_q2: pair.icebreaker_q2,
      icebreaker_q3: pair.icebreaker_q3,
      status: pair.status,
      date_met: pair.date_met,
      person1_signed_off: pair.person1_signed_off,
      person2_signed_off: pair.person2_signed_off,
      person3_signed_off: pair.person3_signed_off,
      rating: pair.rating,
      highlight_note: pair.highlight_note,
    }
    const { data: signedSelfie } = selfiePath
      ? await admin.storage.from('coffee-chat-selfies').createSignedUrl(selfiePath, 60 * 60)
      : { data: null }

    return NextResponse.json({
      match: {
        pair: { ...pairData, selfie_url: signedSelfie?.signedUrl ?? null },
        partners: partners ?? [],
        round: pairRound,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load match'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
