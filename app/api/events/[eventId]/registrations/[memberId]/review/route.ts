import { NextResponse } from "next/server"
import { EventAdminError, requireEventAdmin } from "@/lib/server/eventAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type RouteContext = {
  params: Promise<{ eventId: string; memberId: string }>
}

type ReviewPayload = {
  status?: string
}

const REVIEWABLE = new Set(["approved", "rejected"])

/**
 * POST /api/events/[eventId]/registrations/[memberId]/review
 *
 * Board/admin-only. Body: { status: 'approved' | 'rejected' }.
 * Sets status, reviewed_at = now(), and reviewed_by = the caller's
 * members_main.id (reviewed_by is a bigint FK to members_main.id, not the
 * Supabase auth user's uuid).
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { eventId, memberId } = await context.params
    const payload = (await request.json()) as ReviewPayload
    const status = typeof payload.status === "string" ? payload.status.trim() : ""

    if (!REVIEWABLE.has(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    const { dataClient } = await requireEventAdmin(supabase)

    // Resolve the reviewing board member's members_main.id. Uses the
    // request-scoped client (not dataClient) so auth.jwt() resolves to the
    // caller, not the service role.
    const { data: reviewerId, error: reviewerError } = await supabase.rpc("current_member_id")

    if (reviewerError || typeof reviewerId !== "number") {
      return NextResponse.json(
        { error: reviewerError?.message || "Could not resolve your member record." },
        { status: 500 }
      )
    }

    const eventIdNum = Number(eventId)
    const memberIdNum = Number(memberId)

    const { data, error } = await dataClient
      .from("event_registrations")
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: reviewerId })
      .match({ event_id: eventIdNum, member_id: memberIdNum })
      .select("event_id, member_id, status, reviewed_at, reviewed_by")
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Could not update registration." }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof EventAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : "Could not update registration."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
