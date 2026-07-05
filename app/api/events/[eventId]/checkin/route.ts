import { NextResponse } from 'next/server'
import { EventAdminError } from '@/lib/server/eventAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    eventId: string
  }>
}

type AttendanceJoinRow = {
  member_id: number
  checked_in_at: string
  members_main: {
    id: number
    Name: string
    Picture: unknown
  } | Array<{
    id: number
    Name: string
    Picture: unknown
  }> | null
}

type EventSummaryRow = {
  id: string | number
  title: string
  event_kind: 'internal' | 'external' | 'meeting'
  check_in_enabled?: boolean
  check_in_token?: string | null
}

const isMissingColumnError = (error: { code?: string } | null | undefined) => error?.code === '42703'

const normalizeMembers = (rows: AttendanceJoinRow[]) => {
  return rows.map((row) => {
    const member = Array.isArray(row.members_main) ? row.members_main[0] ?? null : row.members_main
    return {
      member_id: row.member_id,
      checked_in_at: row.checked_in_at,
      members_main: member,
    }
  })
}

async function loadCheckInSummary(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, eventId: string) {
  const selectEvent = async (columns: string) =>
    supabase
      .from('events')
      .select(columns)
      .eq('id', eventId)
      .single()

  let { data: event, error: eventError } = await selectEvent('id, title, event_kind, check_in_enabled, check_in_token')
  let normalizedEvent = event as EventSummaryRow | null

  if (isMissingColumnError(eventError)) {
    const legacyResult = await selectEvent('id, title, event_kind, check_in_token')
    normalizedEvent = legacyResult.data
      ? ({ ...(legacyResult.data as unknown as EventSummaryRow), check_in_enabled: false } as EventSummaryRow)
      : null
    eventError = legacyResult.error
  }

  if (eventError || !normalizedEvent) {
    return { error: eventError?.message || 'Could not load the event.', status: 404 }
  }

  const [attendanceResult, accessResult, memberIdResult] = await Promise.all([
    supabase
      .from('attendance')
      .select('member_id, checked_in_at, members_main(id, Name, Picture)')
      .eq('event_id', eventId)
      .order('checked_in_at', { ascending: false }),
    supabase.rpc('has_special_access'),
    supabase.rpc('current_member_id'),
  ])

  if (attendanceResult.error && !isMissingColumnError(attendanceResult.error)) {
    return { error: attendanceResult.error.message, status: 500 }
  }

  if (accessResult.error) {
    return { error: accessResult.error.message, status: 500 }
  }

  const currentMemberId = typeof memberIdResult.data === 'number' ? memberIdResult.data : null
  const attendanceMembers = isMissingColumnError(attendanceResult.error)
    ? []
    : normalizeMembers((attendanceResult.data ?? []) as AttendanceJoinRow[])
  const isCheckedIn = currentMemberId
    ? attendanceMembers.some((row) => row.member_id === currentMemberId)
    : false

  return {
    data: {
      event: normalizedEvent,
      attendance_count: attendanceMembers.length,
      attendance_members: attendanceMembers,
      can_manage_checkins: accessResult.data === true,
      is_checked_in: isCheckedIn,
    },
  }
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { eventId } = await context.params
    const supabase = await createSupabaseServerClient()
    const summary = await loadCheckInSummary(supabase, eventId)

    if ('error' in summary) {
      return NextResponse.json({ error: summary.error }, { status: summary.status })
    }

    const origin = new URL(request.url).origin
    return NextResponse.json({
      ...summary.data,
      check_in_url: summary.data.event.check_in_token ? `${origin}/checkin/${summary.data.event.check_in_token}` : null,
    })
  } catch (error) {
    if (error instanceof EventAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : 'Could not load check-in summary.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

type CheckInPayload = {
  member_id?: number | null
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { eventId } = await context.params
    const payload = (await request.json().catch(() => ({}))) as CheckInPayload
    const supabase = await createSupabaseServerClient()
    const { data: authData } = await supabase.auth.getUser()

    if (!authData.user) {
      return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, check_in_enabled')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: eventError?.message || 'Could not load the event.' }, { status: 404 })
    }

    const { data: currentMemberIdResult, error: currentMemberError } = await supabase.rpc('current_member_id')
    if (currentMemberError || currentMemberIdResult === null || currentMemberIdResult === undefined) {
      return NextResponse.json({ error: 'Could not resolve member.' }, { status: 400 })
    }

    const { data: hasSpecialAccess, error: accessError } = await supabase.rpc('has_special_access')
    if (accessError) {
      return NextResponse.json({ error: accessError.message }, { status: 500 })
    }

    const targetMemberId = payload.member_id ?? (currentMemberIdResult as number)
    const isAdminCheckIn = payload.member_id !== undefined && payload.member_id !== null

    if (!event.check_in_enabled && !isAdminCheckIn && hasSpecialAccess !== true) {
      return NextResponse.json({ error: 'Check-in is not enabled for this event.' }, { status: 403 })
    }

    if (isAdminCheckIn && hasSpecialAccess !== true) {
      return NextResponse.json({ error: 'You are not allowed to check in other members.' }, { status: 403 })
    }

    const { error: upsertError } = await supabase
      .from('attendance')
      .upsert(
        {
          event_id: Number(eventId),
          member_id: targetMemberId,
          checked_in_at: new Date().toISOString(),
        },
        { onConflict: 'member_id,event_id' }
      )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    const summary = await loadCheckInSummary(supabase, eventId)
    if ('error' in summary) {
      return NextResponse.json({ error: summary.error }, { status: summary.status })
    }

    return NextResponse.json({
      ...summary.data,
      checked_in_member_id: targetMemberId,
    })
  } catch (error) {
    if (error instanceof EventAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : 'Could not check in.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
