import { NextResponse } from 'next/server'
import {
  AttendanceAuthError,
  requireAttendanceMember,
  requireBoardMember,
} from '@/lib/server/attendanceAuth'
import { isLectureWindowActive } from '@/lib/server/lectureCodes'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const LECTURE_COLUMNS =
  'id, title, kind, scheduled_at, location, lecturer_member_id, is_active, started_at, created_at, updated_at'

type LectureRow = {
  id: string
  title: string
  kind: string
  scheduled_at: string
  location: string | null
  lecturer_member_id: number | null
  is_active: boolean
  started_at: string | null
  created_at: string
  updated_at: string
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    await requireAttendanceMember(supabase)

    const { data, error } = await supabase
      .from('lectures')
      .select(LECTURE_COLUMNS)
      .order('scheduled_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Could not load lectures.' },
        { status: 500 }
      )
    }

    const lectures = ((data ?? []) as LectureRow[]).map((row) => ({
      ...row,
      is_active: row.is_active && isLectureWindowActive(row.started_at),
    }))

    return NextResponse.json({ lectures })
  } catch (error) {
    if (error instanceof AttendanceAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Could not load lectures.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

type CreatePayload = {
  title?: string
  kind?: 'core' | 'side'
  scheduled_at?: string
  location?: string | null
  lecturer_member_id?: number | null
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    await requireBoardMember(supabase)

    const payload = (await request.json().catch(() => ({}))) as CreatePayload
    const title = payload.title?.trim()
    const kind = payload.kind
    const scheduledAt = payload.scheduled_at?.trim()

    if (!title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
    }
    if (kind !== 'core' && kind !== 'side') {
      return NextResponse.json({ error: 'Kind must be "core" or "side".' }, { status: 400 })
    }
    if (!scheduledAt || !Number.isFinite(Date.parse(scheduledAt))) {
      return NextResponse.json({ error: 'Valid scheduled_at is required.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('lectures')
      .insert({
        title,
        kind,
        scheduled_at: new Date(scheduledAt).toISOString(),
        location: payload.location?.trim() || null,
        lecturer_member_id: payload.lecturer_member_id ?? null,
      })
      .select(LECTURE_COLUMNS)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Could not create lecture.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ lecture: data })
  } catch (error) {
    if (error instanceof AttendanceAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Could not create lecture.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
