import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { runPairing } from '@/lib/coffee-chats/pairing'
import { getQuestionsForPair } from '@/lib/coffee-chats/icebreakers'
import { sendMatchEmail } from '@/lib/coffee-chats/emails'
import { getCoffeeChatAdminClient } from '@/lib/coffee-chats/supabase'

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()

    // Only special-access users can run pairings
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: isAdmin } = await supabase.rpc('check_email_can_manage_coffee_chats', {
      check_email: user.email ?? '',
    })
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { roundId } = await request.json() as { roundId?: string }
    if (!roundId) {
      return NextResponse.json({ error: 'roundId is required' }, { status: 400 })
    }

    const admin = getCoffeeChatAdminClient()
    if (!admin) {
      return NextResponse.json({ error: 'Admin client unavailable' }, { status: 500 })
    }

    // Load the round
    const { data: round, error: roundError } = await admin
      .from('cc_rounds')
      .select('id, month, status, meet_deadline')
      .eq('id', roundId)
      .maybeSingle()

    if (roundError || !round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    if (round.status !== 'open') {
      return NextResponse.json({ error: 'Round is not in open status' }, { status: 400 })
    }

    // Load signups with member data
    const { data: signups, error: signupsError } = await admin
      .from('cc_signups')
      .select('member_id')
      .eq('round_id', roundId)

    if (signupsError) {
      return NextResponse.json({ error: signupsError.message }, { status: 500 })
    }

    if (!signups || signups.length < 2) {
      return NextResponse.json({ error: 'Not enough signups to pair (need at least 2)' }, { status: 400 })
    }

    const memberIds = signups.map((s) => s.member_id as number)

    // Load member coffee-chat profile data
    const { data: members, error: membersError } = await admin
      .from('members_main')
      .select('id, Name, "TBC Email", cc_interests, cc_already_know')
      .in('id', memberIds)

    if (membersError || !members) {
      return NextResponse.json({ error: membersError?.message ?? 'Could not load members' }, { status: 500 })
    }

    // Load prior round pairs to build exclusion lists
    const { data: priorPairs } = await admin
      .from('cc_pairs')
      .select('person1_id, person2_id, person3_id, round_id')
      .neq('round_id', roundId)
      .or(
        memberIds
          .flatMap((id) => [`person1_id.eq.${id}`, `person2_id.eq.${id}`, `person3_id.eq.${id}`])
          .join(','),
      )

    const priorPartnerMap = new Map<number, number[]>()
    for (const pair of (priorPairs ?? [])) {
      const p1 = pair.person1_id as number
      const p2 = pair.person2_id as number
      const p3 = pair.person3_id as number | null

      const add = (a: number, b: number) => {
        if (!priorPartnerMap.has(a)) priorPartnerMap.set(a, [])
        priorPartnerMap.get(a)!.push(b)
      }
      add(p1, p2); add(p2, p1)
      if (p3) { add(p1, p3); add(p3, p1); add(p2, p3); add(p3, p2) }
    }

    const pairingMembers = members.map((m) => ({
      id: m.id as number,
      interests: (m.cc_interests as string[] | null) ?? [],
      alreadyKnow: (m.cc_already_know as number[] | null) ?? [],
      priorPartners: priorPartnerMap.get(m.id as number) ?? [],
    }))

    const pairs = runPairing(pairingMembers)

    // Persist pairs
    const memberMap = new Map(members.map((m) => [m.id as number, m]))

    const pairInserts = pairs.map((pair) => {
      const m1 = memberMap.get(pair.person1Id)
      const m2 = memberMap.get(pair.person2Id)
      const m3 = pair.person3Id ? memberMap.get(pair.person3Id) : null

      const interests1 = (m1?.cc_interests as string[] | null) ?? []
      const interests2 = (m2?.cc_interests as string[] | null) ?? []
      const [q1, q2, q3] = getQuestionsForPair(interests1, interests2)

      return {
        person1_id: pair.person1Id,
        person2_id: pair.person2Id,
        person3_id: m3 ? pair.person3Id ?? null : null,
        icebreaker_q1: q1,
        icebreaker_q2: q2,
        icebreaker_q3: q3,
      }
    })

    const { data: pairsCreated, error: commitError } = await admin.rpc('commit_coffee_chat_pairing', {
      target_round_id: roundId,
      pair_rows: pairInserts,
    })

    if (commitError) {
      return NextResponse.json({ error: commitError.message }, { status: 409 })
    }

    const { data: insertedPairs, error: insertedPairsError } = await admin
      .from('cc_pairs')
      .select()
      .eq('round_id', roundId)

    if (insertedPairsError) {
      return NextResponse.json({ error: insertedPairsError.message }, { status: 500 })
    }

    // Send match emails (best-effort, errors logged but not fatal)
    const meetDeadline = round.meet_deadline as string | null
    const month = round.month as string

    const emailPromises = (insertedPairs ?? []).flatMap((pair: Record<string, unknown>) => {
      const p1 = memberMap.get(pair.person1_id as number)
      const p2 = memberMap.get(pair.person2_id as number)
      const p3 = pair.person3_id ? memberMap.get(pair.person3_id as number) : null
      const questions: [string, string, string] = [
        pair.icebreaker_q1 as string,
        pair.icebreaker_q2 as string,
        pair.icebreaker_q3 as string,
      ]

      type Participant = { member: NonNullable<typeof p1>; partner: typeof p2; third: typeof p3 | null }
      const participants = (
        [
          p1 ? { member: p1, partner: p2, third: p3 } : null,
          p2 ? { member: p2, partner: p1, third: p3 } : null,
          p3 ? { member: p3, partner: p1, third: p2 } : null,
        ] as (Participant | null)[]
      ).filter((x): x is Participant => x !== null)

      return participants.map(({ member, partner, third }) =>
        sendMatchEmail({
          toEmail: (member['TBC Email'] as string | null) ?? '',
          toName: (member.Name as string | null) ?? 'Member',
          partnerName: (partner?.Name as string | null) ?? 'your match',
          partnerEmail: (partner?.['TBC Email'] as string | null) ?? '',
          thirdPersonName: third ? (third.Name as string | null) ?? undefined : undefined,
          thirdPersonEmail: third ? (third['TBC Email'] as string | null) ?? undefined : undefined,
          month,
          questions,
          meetDeadline,
        }),
      )
    })

    const emailResults = await Promise.allSettled(emailPromises)
    const emailsSent = emailResults.filter((result) => result.status === 'fulfilled').length
    const emailsFailed = emailResults.length - emailsSent

    return NextResponse.json({
      ok: true,
      pairsCreated: pairsCreated ?? pairInserts.length,
      memberCount: memberIds.length,
      emailsSent,
      emailsFailed,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Pairing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
