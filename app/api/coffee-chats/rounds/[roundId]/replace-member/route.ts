import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCoffeeChatAdminClient, sendMatchEmail } from '@/lib/server/coffeeChats'
import { getQuestionsForPair } from '@/lib/coffee-chat-icebreakers'

export async function POST(
  request: Request,
  props: { params: Promise<{ roundId: string }> },
) {
  try {
    const { roundId } = await props.params
    if (!roundId) {
      return NextResponse.json({ error: 'roundId is required' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
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

    const admin = getCoffeeChatAdminClient()
    if (!admin) {
      return NextResponse.json({ error: 'Admin client unavailable' }, { status: 500 })
    }

    const body = (await request.json()) as {
      pairId?: string
      spot?: 'person1' | 'person2' | 'person3'
      newMemberId?: number
    }

    const { pairId, spot, newMemberId } = body
    if (!pairId || !spot || !newMemberId) {
      return NextResponse.json(
        { error: 'pairId, spot (person1|person2|person3), and newMemberId are required' },
        { status: 400 },
      )
    }

    if (spot !== 'person1' && spot !== 'person2' && spot !== 'person3') {
      return NextResponse.json({ error: 'Invalid spot' }, { status: 400 })
    }

    // Load round
    const { data: round, error: roundError } = await admin
      .from('cc_rounds')
      .select('id, month, meet_deadline')
      .eq('id', roundId)
      .maybeSingle()

    if (roundError || !round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    // Load pair
    const { data: pair, error: pairError } = await admin
      .from('cc_pairs')
      .select('*')
      .eq('id', pairId)
      .eq('round_id', roundId)
      .maybeSingle()

    if (pairError || !pair) {
      return NextResponse.json({ error: 'Pair not found' }, { status: 404 })
    }

    if (pair.status === 'met') {
      return NextResponse.json({ error: 'Completed meetings cannot be changed.' }, { status: 409 })
    }

    // Check duplicate in same pair
    if (
      (spot !== 'person1' && pair.person1_id === newMemberId) ||
      (spot !== 'person2' && pair.person2_id === newMemberId) ||
      (spot !== 'person3' && pair.person3_id === newMemberId)
    ) {
      return NextResponse.json(
        { error: 'Member is already assigned to this pair' },
        { status: 400 },
      )
    }

    // Load new member and partners in pair
    const partnerIds = [
      spot !== 'person1' ? pair.person1_id : null,
      spot !== 'person2' ? pair.person2_id : null,
      spot !== 'person3' ? pair.person3_id : null,
    ].filter((id): id is number => id !== null)

    const allNeededMemberIds = [newMemberId, ...partnerIds]

    const { data: members, error: membersError } = await admin
      .from('members_main')
      .select('id, Name, "TBC Email", cc_interests')
      .in('id', allNeededMemberIds)

    if (membersError || !members) {
      return NextResponse.json({ error: 'Failed to fetch member details' }, { status: 500 })
    }

    type MemberRecord = {
      id: number
      Name: string | null
      'TBC Email': string | null
      cc_interests: string[] | null
    }

    const memberMap = new Map<number, MemberRecord>(
      (members as MemberRecord[]).map((m) => [m.id, m]),
    )

    const newMember = memberMap.get(newMemberId)
    if (!newMember) {
      return NextResponse.json({ error: 'New member not found' }, { status: 404 })
    }

    const partner1 = partnerIds.length > 0 ? memberMap.get(partnerIds[0]) : null
    const partner2 = partnerIds.length > 1 ? memberMap.get(partnerIds[1]) : null

    const partnerInterests = [
      ...(partner1?.cc_interests ?? []),
      ...(partner2?.cc_interests ?? []),
    ]

    const [q1, q2, q3] = getQuestionsForPair(newMember.cc_interests ?? [], partnerInterests)

    // Update pair
    const updatePayload: Record<string, unknown> = {
      [`${spot}_id`]: newMemberId,
      [`${spot}_signed_off`]: false,
      icebreaker_q1: q1,
      icebreaker_q2: q2,
      icebreaker_q3: q3,
    }

    const { data: updatedPair, error: updateError } = await admin
      .from('cc_pairs')
      .update(updatePayload)
      .eq('id', pairId)
      .eq('round_id', roundId)
      .neq('status', 'met')
      .select('id')
      .maybeSingle()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (!updatedPair) {
      return NextResponse.json({ error: 'The pair changed. Refresh the round before replacing a member.' }, { status: 409 })
    }

    // Ensure signup entry exists for new member
    await admin.from('cc_signups').upsert(
      { round_id: roundId, member_id: newMemberId },
      { onConflict: 'round_id,member_id' },
    )

    // Trigger match email to newly replaced person
    let emailSent = false
    if (newMember['TBC Email'] && partner1) {
      try {
        await sendMatchEmail({
          toEmail: newMember['TBC Email'],
          toName: newMember.Name ?? 'Member',
          partnerName: partner1.Name ?? 'your match',
          partnerEmail: partner1['TBC Email'] ?? '',
          thirdPersonName: partner2?.Name ?? undefined,
          thirdPersonEmail: partner2?.['TBC Email'] ?? undefined,
          month: round.month as string,
          meetDeadline: round.meet_deadline as string | null,
        })
        emailSent = true
      } catch (emailErr) {
        console.warn('[replace-member] failed to send email to replaced member:', emailErr)
      }
    }

    return NextResponse.json({
      ok: true,
      message: emailSent
        ? `Replaced member and sent match email to ${newMember.Name ?? 'new member'}.`
        : `Replaced member with ${newMember.Name ?? 'new member'}.`,
      emailSent,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to replace member'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
