import 'server-only'
import type { DashboardEvent, DashboardMember } from '@/app/components/dashboard/types'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRequestMember, MEMBER_COLUMNS } from '@/lib/server/requestMember'

type EventRow = {
  id: string | number
  title: string
  description: string
  start_at: string
  end_at: string
  location: string
  organizer_department: string
  capacity_total: number
  event_kind: 'internal' | 'external'
  event_type: string | null
  priority: string | null
  external_status: string | null
  city: string | null
  format: string | null
  image_url: string | null
  event_link_url: string | null
  grant_url?: string | null
  tally_url: string | null
  whatsapp_url: string | null
  is_hackathon: boolean
  attending_names: string[]
  all_day: boolean
}

type EventRegistrationRow = {
  event_id: string | number
  member_id: number
}

type EventInterestRow = {
  event_id: string | number
  member_id: number
}


const EVENTS_FETCH_LIMIT = 500
const EVENT_COLUMNS = 'id, title, description, start_at, end_at, location, organizer_department, capacity_total, event_kind, event_type, priority, external_status, city, format, image_url, event_link_url, tally_url, grant_url, whatsapp_url, is_hackathon, attending_names, all_day'
export const loadDashboardEvents = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  memberId: number,
  limit = EVENTS_FETCH_LIMIT
): Promise<DashboardEvent[]> => {
  const { data: eventsData, error: eventsError } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .order('start_at', { ascending: true })
    .limit(limit)

  if (eventsError) {
    throw eventsError
  }

  const typedEventsData = (eventsData ?? []) as EventRow[]
  if (typedEventsData.length === 0) {
    return []
  }

  const eventIds = typedEventsData.map((event) => event.id)

  const [registrationsResult, interestResult] = await Promise.all([
    supabase
      .from('event_registrations')
      .select('event_id, member_id')
      .in('event_id', eventIds),
    supabase
      .from('event_interest')
      .select('event_id, member_id')
      .in('event_id', eventIds),
  ])

  if (registrationsResult.error) {
    throw registrationsResult.error
  }

  if (interestResult.error) {
    throw interestResult.error
  }

  const typedRegistrationsData = (registrationsResult.data ?? []) as EventRegistrationRow[]
  const typedInterestData = (interestResult.data ?? []) as EventInterestRow[]

  const registrationsByEventId = new Map<string, EventRegistrationRow[]>()
  typedRegistrationsData.forEach((registration) => {
    const key = String(registration.event_id)
    const registrations = registrationsByEventId.get(key)
    if (registrations) {
      registrations.push(registration)
      return
    }
    registrationsByEventId.set(key, [registration])
  })

  const interestByEventId = new Map<string, EventInterestRow[]>()
  typedInterestData.forEach((row) => {
    const key = String(row.event_id)
    const rows = interestByEventId.get(key)
    if (rows) {
      rows.push(row)
      return
    }
    interestByEventId.set(key, [row])
  })

  return typedEventsData.map((event) => {
    const eventRegistrations = registrationsByEventId.get(String(event.id)) ?? []
    const eventInterests = interestByEventId.get(String(event.id)) ?? []

    return {
      ...event,
      current_registrations: eventRegistrations.length,
      is_registered: eventRegistrations.some((registration) => registration.member_id === memberId),
      interest_count: eventInterests.length,
      is_interested: eventInterests.some((row) => row.member_id === memberId),
    }
  })
}


export async function loadHomeEvents(): Promise<DashboardEvent[]> {
  const { member, dataClient } = await getRequestMember()
  if (!member) return []
  const { data, error } = await dataClient.from('events').select(EVENT_COLUMNS)
    .gte('end_at', new Date().toISOString()).order('start_at', { ascending: true }).limit(2)
  if (error) throw error
  return (data ?? []) as DashboardEvent[]
}

export async function loadDashboardMembers(client: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data, error } = await client.from('members_main').select(MEMBER_COLUMNS).order('Name', { ascending: true })
  if (error) throw error
  return (data ?? []) as DashboardMember[]
}
