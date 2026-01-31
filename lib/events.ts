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
  current_registrations?: number
  is_registered?: boolean
}

export const eventService = {
  getUpcomingEvents: async (memberId?: number, limit: number = 6) => {
    console.log('🔍 Events Service: Fetching upcoming events')
    console.log('👤 Member ID:', memberId)
    console.log('🔢 Limit:', limit)

    try {
      // First get all events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .limit(limit)

      if (eventsError) {
        console.error('❌ Events Service Error:', eventsError)
        return { data: null, error: eventsError }
      }

      if (!eventsData || eventsData.length === 0) {
        console.log('⚠️ No events found')
        return { data: [], error: null }
      }

      console.log('✅ Found events:', eventsData.length)

      // Get registration counts for all events
      const eventIds = eventsData.map(event => event.id)
      const { data: registrationsData, error: registrationsError } = await supabase
        .from('event_registrations')
        .select('event_id, member_id')
        .in('event_id', eventIds)

      if (registrationsError) {
        console.error('❌ Registrations fetch error:', registrationsError)
      }

      // Process events with registration data
      const eventsWithRegistrations = eventsData.map(event => {
        const eventRegistrations = registrationsData?.filter(reg => reg.event_id === event.id) || []
        const currentRegistrations = eventRegistrations.length
        const isRegistered = memberId ? eventRegistrations.some(reg => reg.member_id === memberId) : false

        return {
          ...event,
          current_registrations: currentRegistrations,
          is_registered: isRegistered
        }
      })

      console.log('✅ Events with registration data:', eventsWithRegistrations.map(e => ({
        id: e.id,
        title: e.title,
        registrations: e.current_registrations,
        is_registered: e.is_registered
      })))

      return { data: eventsWithRegistrations, error: null }
    } catch (err) {
      console.error('💥 Events Service Exception:', err)
      return { data: null, error: err as Error }
    }
  }
}