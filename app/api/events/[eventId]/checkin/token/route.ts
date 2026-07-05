import { NextResponse } from 'next/server'
import { EventAdminError, requireEventAdmin } from '@/lib/server/eventAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    eventId: string
  }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { eventId } = await context.params
    const supabase = await createSupabaseServerClient()
    const { dataClient } = await requireEventAdmin(supabase)

    const { data: event, error: eventError } = await dataClient
      .from('events')
      .select('id, check_in_token, check_in_enabled, title')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: eventError?.message || 'Could not load the event.' }, { status: 404 })
    }

    const checkInToken = event.check_in_token || crypto.randomUUID()
    const { error: updateError } = await dataClient
      .from('events')
      .update({
        check_in_enabled: true,
        check_in_token: checkInToken,
      })
      .eq('id', eventId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const origin = new URL(request.url).origin
    return NextResponse.json({
      check_in_enabled: true,
      check_in_token: checkInToken,
      check_in_url: `${origin}/checkin/${checkInToken}`,
    })
  } catch (error) {
    if (error instanceof EventAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : 'Could not create a check-in token.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
