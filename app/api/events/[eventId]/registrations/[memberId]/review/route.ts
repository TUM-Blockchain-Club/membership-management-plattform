import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireEventAdmin } from '@/lib/server/eventAdmin'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'

type RouteContext = {
  params: Promise<{ eventId: string; memberId: string }>
}

type ReviewPayload = {
  status?: string
}

const REVIEWABLE = new Set(['approved', 'rejected'])

export async function POST(request: Request, context: RouteContext) {
  try {
    const { eventId, memberId } = await context.params
    const payload = (await request.json()) as ReviewPayload
    const status = typeof payload.status === 'string' ? payload.status.trim() : ''

    if (!REVIEWABLE.has(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    const { user, dataClient: maybeClient } = await requireEventAdmin(supabase)
    const dataClient = getSupabaseAdminClient() ?? maybeClient

    const eventIdNum = Number(eventId)
    const memberIdNum = Number(memberId)

    const { data, error } = await dataClient
      .from('event_registrations')
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null })
      .match({ event_id: eventIdNum, member_id: memberIdNum })
      .select('event_id, member_id, status, reviewed_at, reviewed_by')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Could not update registration.' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update registration.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
