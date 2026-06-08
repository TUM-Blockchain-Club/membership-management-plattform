import { NextResponse } from 'next/server'
import {
  AttendanceAuthError,
  requireBoardMember,
} from '@/lib/server/attendanceAuth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type AttendanceRow = {
  id: string
  lecture_id: string
  member_id: number
  checked_in_at: string
  members_main: {
    id: number
    Name: string | null
    Department: string | null
    Role: string | null
  } | null
  lectures: {
    id: string
    title: string | null
    kind: string | null
    scheduled_at: string | null
  } | null
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    await requireBoardMember(supabase)

    const { searchParams } = new URL(request.url)
    const lectureId = searchParams.get('lectureId')

    let query = supabase
      .from('attendance')
      .select(
        'id, lecture_id, member_id, checked_in_at, members_main(id, Name, Department, Role), lectures(id, title, kind, scheduled_at)'
      )
      .order('checked_in_at', { ascending: false })

    if (lectureId) {
      query = query.eq('lecture_id', lectureId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Could not load attendance.' },
        { status: 500 }
      )
    }

    const rows = ((data ?? []) as unknown) as AttendanceRow[]

    const attendance = rows.map((row) => {
      const memberRaw = row.members_main
      const lectureRaw = row.lectures
      const m = Array.isArray(memberRaw) ? memberRaw[0] ?? null : memberRaw
      const l = Array.isArray(lectureRaw) ? lectureRaw[0] ?? null : lectureRaw
      return {
        id: row.id,
        lecture_id: row.lecture_id,
        member_id: row.member_id,
        checked_in_at: row.checked_in_at,
        member: m
          ? { id: m.id, name: m.Name, department: m.Department, role: m.Role }
          : null,
        lecture: l
          ? { id: l.id, title: l.title, kind: l.kind, scheduled_at: l.scheduled_at }
          : null,
      }
    })

    return NextResponse.json({ attendance })
  } catch (error) {
    if (error instanceof AttendanceAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Could not load attendance.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
