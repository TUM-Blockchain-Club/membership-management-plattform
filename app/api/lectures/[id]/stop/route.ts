import { NextResponse } from 'next/server'
import {
  AttendanceAuthError,
  requireBoardMember,
} from '@/lib/server/attendanceAuth'
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

    const { error } = await supabase
      .from('lectures')
      .update({
        is_active: false,
        current_code: null,
        current_code_at: null,
        previous_code: null,
        previous_code_at: null,
      })
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Could not stop lecture.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AttendanceAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Could not stop lecture.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
