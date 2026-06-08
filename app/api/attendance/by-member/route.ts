import { NextResponse } from 'next/server'
import {
  AttendanceAuthError,
  requireBoardMember,
} from '@/lib/server/attendanceAuth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type AttendanceRow = {
  id: string
  lecture_id: string
  checked_in_at: string
  lectures: {
    id: string
    title: string | null
    kind: string | null
    scheduled_at: string | null
    location: string | null
  } | null
}

type MemberRow = {
  id: number
  Name: string | null
  Department: string | null
  Role: string | null
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    await requireBoardMember(supabase)

    const { searchParams } = new URL(request.url)
    const memberIdParam = searchParams.get('memberId')
    const memberId = Number(memberIdParam)
    if (!Number.isFinite(memberId)) {
      return NextResponse.json({ error: 'Valid memberId is required.' }, { status: 400 })
    }

    const { data: memberData, error: memberError } = await supabase
      .from('members_main')
      .select('id, Name, Department, Role')
      .eq('id', memberId)
      .maybeSingle()

    if (memberError) {
      return NextResponse.json(
        { error: memberError.message || 'Could not load member.' },
        { status: 500 }
      )
    }

    const memberRow = memberData as MemberRow | null
    if (!memberRow) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('attendance')
      .select(
        'id, lecture_id, checked_in_at, lectures(id, title, kind, scheduled_at, location)'
      )
      .eq('member_id', memberId)
      .order('checked_in_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Could not load attendance.' },
        { status: 500 }
      )
    }

    const rows = ((data ?? []) as unknown) as AttendanceRow[]
    const attendance = rows.map((row) => {
      const lectureRaw = row.lectures
      const lecture = Array.isArray(lectureRaw) ? lectureRaw[0] ?? null : lectureRaw
      return {
        id: row.id,
        lecture_id: row.lecture_id,
        checked_in_at: row.checked_in_at,
        lecture: lecture
          ? {
              id: lecture.id,
              title: lecture.title,
              kind: lecture.kind,
              scheduled_at: lecture.scheduled_at,
              location: lecture.location,
            }
          : null,
      }
    })

    return NextResponse.json({
      member: {
        id: memberRow.id,
        name: memberRow.Name,
        department: memberRow.Department,
        role: memberRow.Role,
      },
      attendance,
    })
  } catch (error) {
    if (error instanceof AttendanceAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Could not load attendance.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
