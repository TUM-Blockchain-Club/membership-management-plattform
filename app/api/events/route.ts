import { NextResponse } from "next/server"
import { EventAdminError, requireEventAdmin } from "@/lib/server/eventAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dateRange, optionalStringArray } from "@/app/api/events/[eventId]/route"

type EventCreatePayload = {
  title?: string | null
  start_date?: string | null
  end_date?: string | null
  event_types?: string[]
  priority?: string | null
  external_status?: string | null
  city?: string | null
  formats?: string[]
  event_link_url?: string | null
}

const EVENT_COLUMNS =
  "id, title, description, start_at, end_at, location, organizer_department, capacity_total, event_kind, event_type, priority, external_status, city, format, image_url, event_link_url, is_hackathon, interested_names, attending_names, all_day"

const nullableString = (value: unknown) => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed || null
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as EventCreatePayload
    const supabase = await createSupabaseServerClient()
    const { dataClient } = await requireEventAdmin(supabase)

    const title = nullableString(payload.title)
    const dates = dateRange(payload.start_date, payload.end_date)
    const eventTypes = optionalStringArray(payload.event_types)
    const eventType = eventTypes.join(", ") || null
    const formats = optionalStringArray(payload.formats)
    const format = formats.join(", ") || null
    const city = nullableString(payload.city)

    if (!title) {
      return NextResponse.json({ error: "Event title is required." }, { status: 400 })
    }

    if (!dates) {
      return NextResponse.json({ error: "Valid start and end dates are required." }, { status: 400 })
    }

    const { data, error } = await dataClient
      .from("events")
      .insert({
        title,
        description: "External ecosystem event.",
        start_at: dates.start_at,
        end_at: dates.end_at,
        location: city,
        organizer_department: eventType,
        capacity_total: 0,
        event_kind: "external",
        event_type: eventType,
        priority: nullableString(payload.priority),
        external_status: nullableString(payload.external_status),
        city,
        format,
        event_link_url: nullableString(payload.event_link_url),
        is_hackathon: eventTypes.includes("Hackathon"),
        interested_names: [],
        attending_names: [],
        all_day: true,
      })
      .select(EVENT_COLUMNS)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Could not create the event." }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof EventAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : "Could not create the event."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
