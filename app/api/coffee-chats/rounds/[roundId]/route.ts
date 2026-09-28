import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCoffeeChatAdminClient } from '@/lib/server/coffeeChats'

export async function GET(
  _request: Request,
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

    // Load round
    const { data: round, error: roundError } = await admin
      .from('cc_rounds')
      .select('id, month, status, signup_deadline, meet_deadline, created_at')
      .eq('id', roundId)
      .maybeSingle()

    if (roundError || !round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    // Load signups, pairs, and club members in parallel
    const [signupsResult, pairsResult, membersResult] = await Promise.all([
      admin
        .from('cc_signups')
        .select('id, member_id, signed_up_at')
        .eq('round_id', roundId)
        .order('signed_up_at', { ascending: true }),
      admin
        .from('cc_pairs')
        .select('id, round_id, person1_id, person2_id, person3_id, status, created_at, icebreaker_q1, icebreaker_q2, icebreaker_q3')
        .eq('round_id', roundId)
        .order('created_at', { ascending: true }),
      admin
        .from('members_main')
        .select('id, Name, Department, "TBC Email", cc_interests, cc_active, Role')
        .order('Name', { ascending: true }),
    ])

    if (signupsResult.error) {
      return NextResponse.json({ error: signupsResult.error.message }, { status: 500 })
    }
    if (pairsResult.error) {
      return NextResponse.json({ error: pairsResult.error.message }, { status: 500 })
    }

    type MemberItem = {
      id: number
      name: string
      department: string | null
      email: string | null
      interests: string[]
      active: boolean
      role: string | null
    }

    const memberMap = new Map<number, MemberItem>()
    const allMembers: MemberItem[] = (membersResult.data ?? []).map((m: Record<string, unknown>) => {
      const item: MemberItem = {
        id: m.id as number,
        name: (m.Name as string | null) ?? 'Unnamed Member',
        department: (m.Department as string | null) ?? null,
        email: (m['TBC Email'] as string | null) ?? null,
        interests: (m.cc_interests as string[] | null) ?? [],
        active: Boolean(m.cc_active),
        role: (m.Role as string | null) ?? null,
      }
      memberMap.set(item.id, item)
      return item
    })

    const signups = (signupsResult.data ?? []).map((s: Record<string, unknown>) => {
      const memberId = s.member_id as number
      const member = memberMap.get(memberId)
      return {
        id: s.id as string,
        memberId,
        signedUpAt: s.signed_up_at as string,
        name: member?.name ?? `Member #${memberId}`,
        department: member?.department ?? null,
        email: member?.email ?? null,
        interests: member?.interests ?? [],
      }
    })

    const rawPairs = pairsResult.data ?? []
    const pairedMemberIds = new Set<number>()

    const pairs = rawPairs.map((p: Record<string, unknown>) => {
      const p1Id = p.person1_id as number
      const p2Id = p.person2_id as number
      const p3Id = p.person3_id as number | null

      pairedMemberIds.add(p1Id)
      pairedMemberIds.add(p2Id)
      if (p3Id) pairedMemberIds.add(p3Id)

      return {
        id: p.id as string,
        roundId: p.round_id as string,
        status: p.status as string,
        createdAt: p.created_at as string,
        person1: memberMap.get(p1Id) ?? { id: p1Id, name: `Member #${p1Id}`, department: null, email: null, interests: [], active: false, role: null },
        person2: memberMap.get(p2Id) ?? { id: p2Id, name: `Member #${p2Id}`, department: null, email: null, interests: [], active: false, role: null },
        person3: p3Id ? (memberMap.get(p3Id) ?? { id: p3Id, name: `Member #${p3Id}`, department: null, email: null, interests: [], active: false, role: null }) : null,
        icebreakers: [p.icebreaker_q1, p.icebreaker_q2, p.icebreaker_q3].filter(Boolean) as string[],
      }
    })

    // Determine leftout members (signed up but not in any pair)
    const leftoutMembers = signups
      .filter((s) => !pairedMemberIds.has(s.memberId))
      .map((s) => ({
        id: s.memberId,
        name: s.name,
        department: s.department,
        email: s.email,
        interests: s.interests,
        signedUpAt: s.signedUpAt,
      }))

    const pairingDate = rawPairs.length > 0 ? (rawPairs[0].created_at as string) : null

    return NextResponse.json({
      ok: true,
      round: {
        id: round.id,
        month: round.month,
        status: round.status,
        signupDeadline: round.signup_deadline,
        meetDeadline: round.meet_deadline,
        createdAt: round.created_at,
        pairingDate,
      },
      signups,
      pairs,
      leftoutMembers,
      allMembers,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load round'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
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

    // Verify round exists
    const { data: round, error: roundError } = await admin
      .from('cc_rounds')
      .select('id, month')
      .eq('id', roundId)
      .maybeSingle()

    if (roundError || !round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    // Fetch any selfie paths associated with this round to clean up storage
    const { data: pairsWithSelfies } = await admin
      .from('cc_pairs')
      .select('selfie_path')
      .eq('round_id', roundId)
      .not('selfie_path', 'is', null)

    const selfiePaths = (pairsWithSelfies ?? [])
      .map((p) => p.selfie_path as string)
      .filter(Boolean)

    // Delete the round (foreign keys cascade to signups and pairs)
    const { error: deleteError } = await admin
      .from('cc_rounds')
      .delete()
      .eq('id', roundId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    if (selfiePaths.length > 0) {
      await admin.storage.from('coffee-chat-selfies').remove(selfiePaths).catch((err: unknown) => {
        console.warn('[coffee-chats/delete-round] storage cleanup warning:', err)
      })
    }

    return NextResponse.json({ ok: true, deletedRoundId: roundId, month: round.month })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete round'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
