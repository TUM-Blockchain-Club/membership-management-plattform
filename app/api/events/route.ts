import { NextResponse } from "next/server"
import { EventAdminError, requireEventAdmin } from "@/lib/server/eventAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { dateRange, nullableNumber, optionalStringArray } from "@/app/api/events/[eventId]/route"

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
  tally_url?: string | null
  whatsapp_url?: string | null
  event_kind?: string | null
  description?: string | null
  location?: string | null
  organizer_department?: string | null
  capacity_total?: number | null
  to_be_approved?: boolean | null
}

const EVENT_COLUMNS =
  "id, title, description, start_at, end_at, location, organizer_department, capacity_total, event_kind, event_type, priority, external_status, city, format, image_url, event_link_url, tally_url, whatsapp_url, is_hackathon, attending_names, all_day, to_be_approved"

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
    const isInternal = payload.event_kind === "internal"

    if (!title) {
      return NextResponse.json({ error: "Event title is required." }, { status: 400 })
    }

    if (!dates) {
      return NextResponse.json({ error: "Valid start and end dates are required." }, { status: 400 })
    }

    const eventTypes = optionalStringArray(payload.event_types)
    const eventType = eventTypes.join(", ") || null
    const formats = optionalStringArray(payload.formats)
    const format = formats.join(", ") || null
    const city = nullableString(payload.city)

    // Both branches must produce the same set of keys — supabase-js infers a
    // single row shape for .insert() and rejects a union of differently
    // keyed object literals, so kind-irrelevant columns are set to null
    // rather than omitted.
    const { data, error } = await dataClient
      .from("events")
      .insert({
        title,
        description: isInternal ? nullableString(payload.description) : "External ecosystem event.",
        start_at: dates.start_at,
        end_at: dates.end_at,
        location: isInternal ? nullableString(payload.location) : city,
        organizer_department: isInternal ? nullableString(payload.organizer_department) : eventType,
        capacity_total: isInternal ? nullableNumber(payload.capacity_total) : 0,
        event_kind: isInternal ? "internal" : "external",
        event_type: isInternal ? null : eventType,
        priority: isInternal ? null : nullableString(payload.priority),
        external_status: isInternal ? null : nullableString(payload.external_status),
        city: isInternal ? null : city,
        format: isInternal ? null : format,
        event_link_url: isInternal ? null : nullableString(payload.event_link_url),
        tally_url: isInternal ? null : nullableString(payload.tally_url),
        whatsapp_url: isInternal ? null : nullableString(payload.whatsapp_url),
        to_be_approved: isInternal ? payload.to_be_approved === true : false,
        is_hackathon: isInternal ? false : eventTypes.includes("Hackathon"),
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
