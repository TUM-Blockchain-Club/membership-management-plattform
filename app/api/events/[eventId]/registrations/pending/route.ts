import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireEventAdmin } from '@/lib/server/eventAdmin'

type RouteContext = {
  params: Promise<{ eventId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { eventId } = await context.params
    const supabase = await createSupabaseServerClient()
    await requireEventAdmin(supabase)

    const eventIdNum = Number(eventId)
    const { data, error } = await supabase
      .from('event_registrations')
      .select('member_id, members_main(id, Name, Picture), created_at')
      .eq('event_id', eventIdNum)
      .eq('status', 'pending')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load pending registrations.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
