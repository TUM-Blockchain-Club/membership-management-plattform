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
  event_link_url?: string | null
  tally_url?: string | null
  whatsapp_url?: string | null
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

export const nullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null
  const num = typeof value === "number" ? value : Number(value)
  return Number.isFinite(num) && num >= 0 ? Math.trunc(num) : null
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
    const dates = dateRange(payload.start_date, payload.end_date)

    if (!title) {
      return NextResponse.json({ error: "Event title is required." }, { status: 400 })
    }

    if (!dates) {
      return NextResponse.json({ error: "Valid start and end dates are required." }, { status: 400 })
    }

    // The event's kind is fixed at creation and is never taken from the
    // client payload here — it's read back from the row itself so a PATCH
    // request can't switch an event between internal and external.
    const { data: existingEvent, error: existingEventError } = await dataClient
      .from("events")
      .select("event_kind")
      .eq("id", eventId)
      .maybeSingle()

    if (existingEventError || !existingEvent) {
      return NextResponse.json({ error: existingEventError?.message || "Event not found." }, { status: 404 })
    }

    const isInternal = existingEvent.event_kind === "internal"

    const updates = isInternal
      ? {
          title,
          description: nullableString(payload.description),
          start_at: dates.start_at,
          end_at: dates.end_at,
          location: nullableString(payload.location),
          organizer_department: nullableString(payload.organizer_department),
          capacity_total: nullableNumber(payload.capacity_total),
          to_be_approved: payload.to_be_approved === true,
          all_day: true,
        }
      : (() => {
          const eventTypes = optionalStringArray(payload.event_types)
          const eventType = eventTypes.join(", ") || null
          const formats = optionalStringArray(payload.formats)
          const format = formats.join(", ") || null
          const city = nullableString(payload.city)

          return {
            title,
            start_at: dates.start_at,
            end_at: dates.end_at,
            event_type: eventType,
            priority: nullableString(payload.priority),
            external_status: nullableString(payload.external_status),
            city,
            format,
            event_link_url: nullableString(payload.event_link_url),
            tally_url: nullableString(payload.tally_url),
            whatsapp_url: nullableString(payload.whatsapp_url),
            location: city,
            organizer_department: eventType,
            is_hackathon: eventTypes.includes("Hackathon"),
            all_day: true,
          }
        })()

    const { data, error } = await dataClient
      .from("events")
      .update(updates)
      .eq("id", eventId)
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
