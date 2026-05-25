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
  start_date?: string | null
  end_date?: string | null
  event_types?: string[]
  priority?: string | null
  external_status?: string | null
  city?: string | null
  formats?: string[]
  image_link_url?: string | null
}

const EVENT_COLUMNS =
  "id, title, description, start_at, end_at, location, organizer_department, capacity_total, event_kind, event_type, priority, external_status, city, format, image_url, image_link_url, is_hackathon, interested_names, attending_names, all_day"

const nullableString = (value: unknown) => {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed || null
}

export const optionalStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
}

export const dateRange = (startDate: unknown, endDate: unknown) => {
  const start = typeof startDate === "string" ? startDate.trim() : ""
  const end = typeof endDate === "string" && endDate.trim() ? endDate.trim() : start

  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return null
  }

  return {
    start_at: `${start}T00:00:00+00:00`,
    end_at: `${end}T23:59:59+00:00`,
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { eventId } = await context.params
    const payload = (await request.json()) as EventUpdatePayload
    const supabase = await createSupabaseServerClient()
    const { dataClient } = await requireEventAdmin(supabase)

    const title = nullableString(payload.title)
    const eventTypes = optionalStringArray(payload.event_types)
    const eventType = eventTypes.join(", ") || null
    const formats = optionalStringArray(payload.formats)
    const format = formats.join(", ") || null
    const city = nullableString(payload.city)
    const dates = dateRange(payload.start_date, payload.end_date)

    if (!title) {
      return NextResponse.json({ error: "Event title is required." }, { status: 400 })
    }

    if (!dates) {
      return NextResponse.json({ error: "Valid start and end dates are required." }, { status: 400 })
    }

    const updates = {
      title,
      start_at: dates.start_at,
      end_at: dates.end_at,
      event_type: eventType,
      priority: nullableString(payload.priority),
      external_status: nullableString(payload.external_status),
      city,
      format,
      image_link_url: nullableString(payload.image_link_url),
      location: city,
      organizer_department: eventType,
      is_hackathon: eventTypes.includes("Hackathon"),
      all_day: true,
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
