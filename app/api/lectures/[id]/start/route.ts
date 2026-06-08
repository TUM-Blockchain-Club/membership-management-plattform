import { NextResponse } from 'next/server'
import {
  AttendanceAuthError,
  requireBoardMember,
} from '@/lib/server/attendanceAuth'
import { generateLectureCode } from '@/lib/server/lectureCodes'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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

    const now = new Date().toISOString()
    const code = generateLectureCode()

    const { data, error } = await supabase
      .from('lectures')
      .update({
        is_active: true,
        started_at: now,
        current_code: code,
        current_code_at: now,
        previous_code: null,
        previous_code_at: null,
      })
      .eq('id', id)
      .select('id, title, kind, started_at, current_code, current_code_at')
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Could not start lecture.' },
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
    const message = error instanceof Error ? error.message : 'Could not start lecture.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
