import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type RouteContext = {
  params: Promise<{ eventId: string }>
}

type InterestRow = { id: number }

/**
 * POST /api/events/[eventId]/interest
 *
 * Toggle the current member's interest for an external event.
 * Returns { is_interested: boolean, interest_count: number }.
 */
export async function POST(_request: Request, context: RouteContext) {
  try {
    const { eventId } = await context.params
    const supabase = await createSupabaseServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 })
    }

    const { data: memberIdResult, error: memberIdError } = await supabase.rpc(
      "current_member_id"
    )

    if (memberIdError || memberIdResult === null || memberIdResult === undefined) {
      return NextResponse.json(
        { error: "Could not resolve member." },
        { status: 400 }
      )
    }

    const memberId = memberIdResult as number
    const eventIdNum = Number(eventId)

    // Check existing interest row
    const { data: existing } = await supabase
      .from("event_interest")
      .select("id")
      .eq("event_id", eventIdNum)
      .eq("member_id", memberId)
      .maybeSingle<InterestRow>()

    let isInterested: boolean

    if (existing) {
      const { error: deleteError } = await supabase
        .from("event_interest")
        .delete()
        .eq("event_id", eventIdNum)
        .eq("member_id", memberId)

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      isInterested = false
    } else {
      const { error: insertError } = await supabase
        .from("event_interest")
        .insert({ event_id: eventIdNum, member_id: memberId })

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      isInterested = true
    }

    const { count } = await supabase
      .from("event_interest")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventIdNum)

    return NextResponse.json({ is_interested: isInterested, interest_count: count ?? 0 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not toggle interest."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
