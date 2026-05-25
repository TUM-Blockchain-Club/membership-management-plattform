import { supabase } from './supabase'

export interface Event {
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
  image_link_url: string | null
  is_hackathon: boolean
  interested_names: string[]
  attending_names: string[]
  all_day: boolean
  current_registrations?: number
  is_registered?: boolean
}

export interface Participant {
  member_id: number
  members_main: {
    id: number
    Name: string
  } | null
}

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
  image_link_url: string | null
  is_hackathon: boolean
  interested_names: string[]
  attending_names: string[]
  all_day: boolean
}

type EventRegistrationRow = {
  event_id: string | number
  member_id: number
}

type ParticipantJoinRow = {
  member_id: number
  members_main: Participant['members_main'] | Participant['members_main'][]
}

export const eventService = {
  getUpcomingEvents: async (memberId?: number, limit: number = 100) => {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('start_at', { ascending: true })
        .limit(limit)

      if (eventsError) {
        return { data: null, error: eventsError }
      }

      const typedEventsData = (eventsData ?? []) as EventRow[]

      if (typedEventsData.length === 0) {
        return { data: [], error: null }
      }

      const eventIds = typedEventsData.map(event => event.id)
      const { data: registrationsData, error: registrationsError } = await supabase
        .from('event_registrations')
        .select('event_id, member_id')
        .in('event_id', eventIds)

      if (registrationsError) return { data: null, error: registrationsError }

      const typedRegistrationsData = (registrationsData ?? []) as EventRegistrationRow[]

      const eventsWithRegistrations = typedEventsData.map(event => {
        const eventRegistrations = typedRegistrationsData.filter(reg => reg.event_id === event.id)
        const currentRegistrations = eventRegistrations.length
        const isRegistered = memberId ? eventRegistrations.some(reg => reg.member_id === memberId) : false

        return {
          ...event,
          current_registrations: currentRegistrations,
          is_registered: isRegistered
        }
      })

      return { data: eventsWithRegistrations, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  },

  /**
   * Fetch the participants (registered members) for a given event.
   */
  getEventParticipants: async (eventId: string | number) => {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('member_id, members_main(id, Name)')
        .eq('event_id', eventId)

      if (error) {
        return { data: null, error }
      }

      const typedData = (data ?? []) as ParticipantJoinRow[]

      const normalized: Participant[] = typedData.map((r) => {
        let memberObj = r.members_main
        if (Array.isArray(memberObj)) memberObj = memberObj[0] || null
        return { member_id: r.member_id, members_main: memberObj }
      })

      return { data: normalized, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  }
}
