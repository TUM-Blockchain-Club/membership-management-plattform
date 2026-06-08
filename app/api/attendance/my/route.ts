import { NextResponse } from 'next/server'
import {
  AttendanceAuthError,
  requireAttendanceMember,
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

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const member = await requireAttendanceMember(supabase)

    const { data, error } = await supabase
      .from('attendance')
      .select(
        'id, lecture_id, checked_in_at, lectures(id, title, kind, scheduled_at, location)'
      )
      .eq('member_id', member.id)
      .order('checked_in_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Could not load your attendance.' },
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

    const { count: totalLecturesCount } = await supabase
      .from('lectures')
      .select('id', { count: 'exact', head: true })

    return NextResponse.json({
      member: { id: member.id, name: member.name },
      attendance,
      totalLectures: totalLecturesCount ?? 0,
    })
  } catch (error) {
    if (error instanceof AttendanceAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Could not load your attendance.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
