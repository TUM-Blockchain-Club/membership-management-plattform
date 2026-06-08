import { NextResponse } from 'next/server'
import {
  AttendanceAuthError,
  requireBoardMember,
} from '@/lib/server/attendanceAuth'
import {
  generateLectureCode,
  isLectureWindowActive,
} from '@/lib/server/lectureCodes'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type LectureRow = {
  id: string
  is_active: boolean
  started_at: string | null
  current_code: string | null
  current_code_at: string | null
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Missing lecture id.' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    await requireBoardMember(supabase)

    const { data: existingData, error: existingError } = await supabase
      .from('lectures')
      .select('id, is_active, started_at, current_code, current_code_at')
      .eq('id', id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message || 'Could not load lecture.' },
        { status: 500 }
      )
    }

    const existing = existingData as LectureRow | null
    if (!existing) {
      return NextResponse.json({ error: 'Lecture not found.' }, { status: 404 })
    }

    if (!existing.is_active || !isLectureWindowActive(existing.started_at)) {
      return NextResponse.json(
        { error: 'Lecture is not active. Start it before rotating codes.' },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()
    const code = generateLectureCode()

    const { data, error } = await supabase
      .from('lectures')
      .update({
        previous_code: existing.current_code,
        previous_code_at: existing.current_code_at,
        current_code: code,
        current_code_at: now,
      })
      .eq('id', id)
      .select('id, title, current_code, current_code_at, started_at')
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Could not rotate code.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      lecture: data,
      token: `${data.id}:${data.current_code}`,
    })
  } catch (error) {
    if (error instanceof AttendanceAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Could not rotate code.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
