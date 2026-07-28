import { NextResponse } from 'next/server'
import {
  AttendanceAuthError,
  requireBoardMember,
} from '@/lib/server/attendanceAuth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const LECTURE_COLUMNS =
  'id, title, kind, scheduled_at, location, lecturer_member_id, is_active, started_at, created_at, updated_at'

type PatchPayload = {
  title?: string
  kind?: 'core' | 'side'
  scheduled_at?: string
  location?: string | null
  lecturer_member_id?: number | null
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    if (!id) {
      return NextResponse.json({ error: 'Missing lecture id.' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    await requireBoardMember(supabase)

    const payload = (await request.json().catch(() => ({}))) as PatchPayload
    const updates: Record<string, unknown> = {}

    if (payload.title !== undefined) {
      const trimmed = payload.title.trim()
      if (!trimmed) {
        return NextResponse.json({ error: 'Title cannot be empty.' }, { status: 400 })
      }
      updates.title = trimmed
    }

    if (payload.kind !== undefined) {
      if (payload.kind !== 'core' && payload.kind !== 'side') {
        return NextResponse.json({ error: 'Kind must be "core" or "side".' }, { status: 400 })
      }
      updates.kind = payload.kind
    }

    if (payload.scheduled_at !== undefined) {
      if (!Number.isFinite(Date.parse(payload.scheduled_at))) {
        return NextResponse.json({ error: 'Invalid scheduled_at.' }, { status: 400 })
      }
      updates.scheduled_at = new Date(payload.scheduled_at).toISOString()
    }

    if (payload.location !== undefined) {
      updates.location = payload.location?.trim() || null
    }

    if (payload.lecturer_member_id !== undefined) {
      updates.lecturer_member_id = payload.lecturer_member_id ?? null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('lectures')
      .update(updates)
      .eq('id', id)
      .select(LECTURE_COLUMNS)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Could not update lecture.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ lecture: data })
  } catch (error) {
    if (error instanceof AttendanceAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Could not update lecture.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
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

    const { error } = await supabase.from('lectures').delete().eq('id', id)
    if (error) {
      return NextResponse.json(
        { error: error.message || 'Could not delete lecture.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof AttendanceAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Could not delete lecture.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
