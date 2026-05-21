import { useCallback, useState } from 'react'
import type {
  DashboardEvent,
  DashboardMember,
  DashboardMessage,
  DashboardParticipant,
} from '@/app/components/dashboard/types'
import { eventService } from '@/lib/events'
import { supabase } from '@/lib/supabase'

type SetDashboardMessage = (message: DashboardMessage | null) => void

export function useDashboardEvents(member: DashboardMember | null, setMessage: SetDashboardMessage) {
  const [events, setEvents] = useState<DashboardEvent[]>([])
  const [participants, setParticipants] = useState<DashboardParticipant[]>([])
  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [showParticipantsModal, setShowParticipantsModal] = useState(false)
  const [modalEventTitle, setModalEventTitle] = useState('')

  const loadEvents = useCallback(async (memberId?: number) => {
    const { data: eventsData, error: eventsError } = await eventService.getUpcomingEvents(memberId)
    if (eventsError || !eventsData) return
    setEvents(eventsData)
  }, [])

  const handleEventRegistration = useCallback(async (eventId: string | number, isCurrentlyRegistered: boolean) => {
    if (!member) return

    try {
      if (isCurrentlyRegistered) {
        const { error } = await supabase
          .from('event_registrations')
          .delete()
          .eq('event_id', eventId)
          .eq('member_id', member.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('event_registrations')
          .insert({
            event_id: eventId,
            member_id: member.id,
          })

        if (error) throw error
      }

      await loadEvents(member.id)
    } catch {
      setMessage({ type: 'error', text: 'Failed to update event registration. Please try again.' })
    }
  }, [loadEvents, member, setMessage])

  const handleViewParticipants = useCallback(async (eventId: string | number, title: string) => {
    setParticipantsLoading(true)
    setModalEventTitle(title)

    const { data: participantsData, error } = await eventService.getEventParticipants(eventId)
    if (error) {
      setMessage({ type: 'error', text: 'Could not load event participants.' })
      setParticipants([])
    } else {
      setParticipants(participantsData || [])
    }

    setParticipantsLoading(false)
    setShowParticipantsModal(true)
  }, [setMessage])

  return {
    events,
    handleEventRegistration,
    handleViewParticipants,
    loadEvents,
    modalEventTitle,
    participants,
    participantsLoading,
    setEvents,
    setParticipants,
    setShowParticipantsModal,
    showParticipantsModal,
  }
}
