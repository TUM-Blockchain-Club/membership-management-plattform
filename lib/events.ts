import { supabase } from './supabase'
import type { MemberPicture } from './types/database.types'

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
  event_link_url: string | null
  tally_url: string | null
  whatsapp_url: string | null
  is_hackathon: boolean
  attending_names: string[]
  all_day: boolean
  to_be_approved: boolean
  // Optional camelCase alias for parity with older client code; the DB only
  // ever returns the snake_case `to_be_approved` column.
  toBeApproved?: boolean
  current_registrations?: number
  is_registered?: boolean
  is_pending?: boolean
  interest_count?: number
  is_interested?: boolean
}

export interface Participant {
  member_id: number
  members_main: {
    id: number
    Name: string
  } | null
}

export interface InterestedMember {
  member_id: number
  members_main: {
    id: number
    Name: string
    Picture: MemberPicture
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
  event_link_url: string | null
  tally_url: string | null
  whatsapp_url: string | null
  is_hackathon: boolean
  attending_names: string[]
  all_day: boolean
  to_be_approved: boolean
}

type EventRegistrationRow = {
  event_id: string | number
  member_id: number
  status?: string | null
}

type EventInterestRow = {
  event_id: string | number
  member_id: number
}

type ParticipantJoinRow = {
  member_id: number
  members_main: Participant['members_main'] | Participant['members_main'][]
}

type InterestedMemberJoinRow = {
  member_id: number
  members_main: InterestedMember['members_main'] | InterestedMember['members_main'][]
}

export const eventService = {
  getUpcomingEvents: async (memberId?: number, limit: number = 500) => {
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

      const [registrationsResult, interestResult] = await Promise.all([
        supabase
          .from('event_registrations')
          .select('event_id, member_id, status')
          .in('event_id', eventIds),
        supabase
          .from('event_interest')
          .select('event_id, member_id')
          .in('event_id', eventIds),
      ])

      if (registrationsResult.error) return { data: null, error: registrationsResult.error }
      if (interestResult.error) return { data: null, error: interestResult.error }

      const typedRegistrationsData = (registrationsResult.data ?? []) as EventRegistrationRow[]
      const typedInterestData = (interestResult.data ?? []) as EventInterestRow[]

      const eventsWithData = typedEventsData.map(event => {
        const eventRegistrations = typedRegistrationsData.filter(reg => reg.event_id === event.id)
        const eventInterests = typedInterestData.filter(row => row.event_id === event.id)
        // A row's status is only meaningful once the enforce_event_registration_status
        // trigger has run on it. Older rows predate the trigger and have no status
        // set, which counts as legacy-approved.
        const approvedRegistrations = eventRegistrations.filter(reg => (reg.status ?? 'approved') === 'approved')
        const currentRegistrations = approvedRegistrations.length
        const isRegistered = memberId ? approvedRegistrations.some(reg => reg.member_id === memberId) : false
        const isPending = memberId
          ? eventRegistrations.some(reg => reg.member_id === memberId && (reg.status ?? 'approved') === 'pending')
          : false
        const interestCount = eventInterests.length
        const isInterested = memberId ? eventInterests.some(row => row.member_id === memberId) : false

        return {
          ...event,
          current_registrations: currentRegistrations,
          is_registered: isRegistered,
          is_pending: isPending,
          interest_count: interestCount,
          is_interested: isInterested,
        }
      })

      return { data: eventsWithData, error: null }
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
        .select('member_id, members_main!event_registrations_member_id_fkey(id, Name)')
        .eq('event_id', eventId)
        .eq('status', 'approved')

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
  },

  /**
   * Fetch the members who expressed interest in a given external event.
   */
  getEventInterestedMembers: async (eventId: string | number) => {
    try {
      const { data, error } = await supabase
        .from('event_interest')
        .select('member_id, members_main(id, Name, Picture)')
        .eq('event_id', eventId)

      if (error) {
        return { data: null, error }
      }

      const typedData = (data ?? []) as InterestedMemberJoinRow[]

      const normalized: InterestedMember[] = typedData.map((r) => {
        let memberObj = r.members_main
        if (Array.isArray(memberObj)) memberObj = memberObj[0] || null
        return { member_id: r.member_id, members_main: memberObj }
      })

      return { data: normalized, error: null }
    } catch (err) {
      return { data: null, error: err as Error }
    }
  },
}
