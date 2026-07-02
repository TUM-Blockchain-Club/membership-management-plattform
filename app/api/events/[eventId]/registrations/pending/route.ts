import { NextResponse } from "next/server"
import { EventAdminError, requireEventAdmin } from "@/lib/server/eventAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type RouteContext = {
  params: Promise<{ eventId: string }>
}

/**
 * GET /api/events/[eventId]/registrations/pending
 *
 * Board/admin-only. Returns event_registrations rows with status = 'pending'
 * for the given event, joined with basic member info, for the approval UI.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { eventId } = await context.params
    const supabase = await createSupabaseServerClient()
    const { dataClient } = await requireEventAdmin(supabase)

    const eventIdNum = Number(eventId)
    const { data, error } = await dataClient
      .from("event_registrations")
      .select("member_id, members_main(id, Name), created_at")
      .eq("event_id", eventIdNum)
      .eq("status", "pending")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (error) {
    if (error instanceof EventAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : "Could not load pending registrations."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
