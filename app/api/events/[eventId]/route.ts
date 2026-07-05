import { NextResponse } from "next/server"
import { EventAdminError, requireEventAdmin } from "@/lib/server/eventAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type RouteContext = {
  params: Promise<{
    eventId: string
  }>
}

type EventUpdatePayload = {
  event_kind?: string | null
  title?: string | null
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  event_types?: string[]
  priority?: string | null
  external_status?: string | null
  city?: string | null
  location?: string | null
  organizer_department?: string | null
  formats?: string[]
  event_link_url?: string | null
  tally_url?: string | null
  whatsapp_url?: string | null
  check_in_enabled?: boolean | null
}

const EVENT_COLUMNS =
  "id, title, description, start_at, end_at, location, organizer_department, capacity_total, event_kind, event_type, priority, external_status, city, format, image_url, event_link_url, tally_url, whatsapp_url, is_hackathon, attending_names, all_day, check_in_enabled, check_in_token"

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
    const { data: existingEvent } = await dataClient
      .from('events')
      .select('check_in_token')
      .eq('id', eventId)
      .single()

    const title = nullableString(payload.title)
    const eventTypes = optionalStringArray(payload.event_types)
    const eventType = eventTypes.join(", ") || null
    const formats = optionalStringArray(payload.formats)
    const format = formats.join(", ") || null
    const city = nullableString(payload.city)
    const location = nullableString(payload.location) ?? city
    const organizerDepartment = nullableString(payload.organizer_department) ?? eventType ?? location
    const dates = dateRange(payload.start_date, payload.end_date)
    const eventKind = payload.event_kind === "meeting" ? "meeting" : "external"
    const checkInEnabled = payload.check_in_enabled === true || eventKind === "meeting"

    if (!title) {
      return NextResponse.json({ error: "Event title is required." }, { status: 400 })
    }

    if (!dates) {
      return NextResponse.json({ error: "Valid start and end dates are required." }, { status: 400 })
    }

    const updates = {
      title,
      description: nullableString(payload.description) ?? (eventKind === "meeting" ? "Meeting record." : "External ecosystem event."),
      start_at: dates.start_at,
      end_at: dates.end_at,
      event_kind: eventKind,
      event_type: eventKind === "meeting" ? null : eventType,
      priority: eventKind === "meeting" ? null : nullableString(payload.priority),
      external_status: eventKind === "meeting" ? null : nullableString(payload.external_status),
      city: eventKind === "meeting" ? null : city,
      format: eventKind === "meeting" ? null : format,
      event_link_url: eventKind === "meeting" ? null : nullableString(payload.event_link_url),
      tally_url: eventKind === "meeting" ? null : nullableString(payload.tally_url),
      whatsapp_url: eventKind === "meeting" ? null : nullableString(payload.whatsapp_url),
      location: eventKind === "meeting" ? location : city,
      organizer_department: eventKind === "meeting" ? organizerDepartment : eventType,
      is_hackathon: eventKind === "meeting" ? false : eventTypes.includes("Hackathon"),
      all_day: eventKind === "meeting" ? false : true,
      check_in_enabled: checkInEnabled,
      check_in_token: checkInEnabled ? existingEvent?.check_in_token ?? crypto.randomUUID() : existingEvent?.check_in_token ?? null,
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
