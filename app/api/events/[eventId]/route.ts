import { NextResponse } from "next/server"
import { EventAdminError, requireEventAdmin } from "@/lib/server/eventAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type RouteContext = {
  params: Promise<{
    eventId: string
  }>
}

type EventUpdatePayload = {
  title?: string | null
  event_type?: string | null
  priority?: string | null
  external_status?: string | null
  city?: string | null
  format?: string | null
  image_url?: string | null
  image_link_url?: string | null
  interested_names?: string[]
  attending_names?: string[]
}

const EVENT_COLUMNS =
  "id, title, description, start_at, end_at, location, organizer_department, capacity_total, event_kind, event_type, priority, external_status, city, format, image_url, image_link_url, is_hackathon, interested_names, attending_names, all_day"

const nullableString = (value: unknown) => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed || null
}

const optionalStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { eventId } = await context.params
    const payload = (await request.json()) as EventUpdatePayload
    const supabase = await createSupabaseServerClient()
    const { dataClient } = await requireEventAdmin(supabase)

    const title = nullableString(payload.title)
    const eventType = nullableString(payload.event_type)
    const city = nullableString(payload.city)

    if (!title) {
      return NextResponse.json({ error: "Event title is required." }, { status: 400 })
    }

    const updates = {
      title,
      event_type: eventType,
      priority: nullableString(payload.priority),
      external_status: nullableString(payload.external_status),
      city,
      format: nullableString(payload.format),
      image_url: nullableString(payload.image_url),
      image_link_url: nullableString(payload.image_link_url),
      interested_names: optionalStringArray(payload.interested_names),
      attending_names: optionalStringArray(payload.attending_names),
      location: city,
      organizer_department: eventType,
      is_hackathon: eventType?.toLowerCase().includes("hackathon") ?? false,
    }

    const { data, error } = await dataClient
      .from("events")
      .update(updates)
      .eq("id", eventId)
      .eq("event_kind", "external")
      .select(EVENT_COLUMNS)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Could not update the event." }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof EventAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : "Could not update the event."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
