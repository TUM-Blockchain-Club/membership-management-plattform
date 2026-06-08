import { NextResponse } from 'next/server'
import {
  AttendanceAuthError,
  requireAttendanceMember,
} from '@/lib/server/attendanceAuth'
import {
  isCodeWithinValidity,
  isLectureWindowActive,
} from '@/lib/server/lectureCodes'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type CheckInPayload = {
  token?: string
}

type LectureRow = {
  id: string
  title: string | null
  scheduled_at: string | null
  kind: string | null
  is_active: boolean
  started_at: string | null
  current_code: string | null
  current_code_at: string | null
  previous_code: string | null
  previous_code_at: string | null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const parseToken = (raw: string | undefined) => {
  if (!raw) return null
  const [lectureId, code] = raw.split(':')
  if (!lectureId || !code) return null
  if (!UUID_RE.test(lectureId)) return null
  return { lectureId, code: code.trim().toUpperCase() }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as CheckInPayload
    const parsed = parseToken(body.token?.trim())

    if (!parsed) {
      return NextResponse.json({ error: 'Invalid check-in token.' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    const member = await requireAttendanceMember(supabase)

    const { data: lectureData, error: lectureError } = await supabase
      .from('lectures')
      .select(
        'id, title, scheduled_at, kind, is_active, started_at, current_code, current_code_at, previous_code, previous_code_at'
      )
      .eq('id', parsed.lectureId)
      .maybeSingle()

    if (lectureError) {
      return NextResponse.json(
        { error: lectureError.message || 'Could not look up the lecture.' },
        { status: 500 }
      )
    }

    const lecture = lectureData as LectureRow | null
    if (!lecture) {
      return NextResponse.json({ error: 'Lecture not found.' }, { status: 404 })
    }

    if (!lecture.is_active || !isLectureWindowActive(lecture.started_at)) {
      return NextResponse.json(
        { error: 'Lecture is not currently active.' },
        { status: 403 }
      )
    }

    const matchesCurrent =
      lecture.current_code === parsed.code &&
      isCodeWithinValidity(lecture.current_code_at)
    const matchesPrevious =
      lecture.previous_code === parsed.code &&
      isCodeWithinValidity(lecture.previous_code_at)

    if (!matchesCurrent && !matchesPrevious) {
      return NextResponse.json(
        { error: 'The QR code has expired. Please scan the latest code.' },
        { status: 410 }
      )
    }

    const { error: insertError } = await supabase
      .from('attendance')
      .insert({ member_id: member.id, lecture_id: lecture.id })

    let alreadyCheckedIn = false
    if (insertError) {
      const code = (insertError as { code?: string }).code
      if (code === '23505') {
        alreadyCheckedIn = true
      } else {
        return NextResponse.json(
          { error: insertError.message || 'Could not record attendance.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      lecture: {
        id: lecture.id,
        title: lecture.title,
        kind: lecture.kind,
        scheduled_at: lecture.scheduled_at,
      },
      alreadyCheckedIn,
    })
  } catch (error) {
    if (error instanceof AttendanceAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Could not record attendance.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
