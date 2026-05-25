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

type ExternalEventDraft = {
  title: string
  start_date: string
  end_date: string
  event_types: string[]
  priority: string
  external_status: string
  city: string
  formats: string[]
  image_url: string
  image_link_url: string
}

export function useDashboardEvents(
  member: DashboardMember | null,
  setMessage: SetDashboardMessage,
  initialEvents: DashboardEvent[] = []
) {
  const [events, setEvents] = useState<DashboardEvent[]>(initialEvents)
  const [participants, setParticipants] = useState<DashboardParticipant[]>([])
  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [showParticipantsModal, setShowParticipantsModal] = useState(false)
  const [modalEventTitle, setModalEventTitle] = useState('')
  const [savingEvent, setSavingEvent] = useState(false)
  const [uploadingEventImage, setUploadingEventImage] = useState(false)

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

  const handleUpdateExternalEvent = useCallback(async (eventId: string | number, draft: ExternalEventDraft) => {
    setSavingEvent(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          start_date: draft.start_date,
          end_date: draft.end_date,
          event_types: draft.event_types,
          priority: draft.priority === 'none' ? null : draft.priority,
          external_status: draft.external_status === 'none' ? null : draft.external_status,
          city: draft.city,
          formats: draft.formats,
          image_url: draft.image_url,
          image_link_url: draft.image_link_url,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update the event.')
      }

      const updatedEvent = payload as DashboardEvent
      setEvents((current) => current.map((event) => event.id === updatedEvent.id ? updatedEvent : event))
      setMessage({ type: 'success', text: 'Event updated successfully.' })
      setTimeout(() => setMessage(null), 3000)
      return updatedEvent
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update the event.'
      setMessage({ type: 'error', text: message })
      return null
    } finally {
      setSavingEvent(false)
    }
  }, [setMessage])

  const handleCreateExternalEvent = useCallback(async (draft: ExternalEventDraft) => {
    setSavingEvent(true)
    setMessage(null)

    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          start_date: draft.start_date,
          end_date: draft.end_date,
          event_types: draft.event_types,
          priority: draft.priority === 'none' ? null : draft.priority,
          external_status: draft.external_status === 'none' ? null : draft.external_status,
          city: draft.city,
          formats: draft.formats,
          image_url: draft.image_url,
          image_link_url: draft.image_link_url,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not create the event.')
      }

      const createdEvent = payload as DashboardEvent
      setEvents((current) => [...current, createdEvent].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()))
      setMessage({ type: 'success', text: 'Event created successfully.' })
      setTimeout(() => setMessage(null), 3000)
      return createdEvent
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create the event.'
      setMessage({ type: 'error', text: message })
      return null
    } finally {
      setSavingEvent(false)
    }
  }, [setMessage])

  const handleUploadExternalEventImage = useCallback(async (eventId: string | number, file: File) => {
    setUploadingEventImage(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch(`/api/events/${eventId}/image`, {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload?.error || 'Could not upload the event image.')
      }

      const imageUrl = typeof payload?.image_url === 'string' ? payload.image_url : null
      if (imageUrl) {
        setEvents((current) => current.map((event) => event.id === eventId ? { ...event, image_url: imageUrl } : event))
      }

      return imageUrl
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not upload the event image.'
      setMessage({ type: 'error', text: message })
      return null
    } finally {
      setUploadingEventImage(false)
    }
  }, [setMessage])

  return {
    events,
    handleEventRegistration,
    handleCreateExternalEvent,
    handleUpdateExternalEvent,
    handleUploadExternalEventImage,
    handleViewParticipants,
    loadEvents,
    modalEventTitle,
    participants,
    participantsLoading,
    savingEvent,
    setEvents,
    setParticipants,
    setShowParticipantsModal,
    showParticipantsModal,
    uploadingEventImage,
  }
}
