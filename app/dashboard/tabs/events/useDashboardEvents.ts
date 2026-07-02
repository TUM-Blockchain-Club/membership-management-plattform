import { useCallback, useState } from 'react'
import type {
  DashboardEvent,
  DashboardInterestedMember,
  DashboardMember,
  DashboardMessage,
  DashboardParticipant,
} from '@/app/components/dashboard/types'
import { eventService } from '@/lib/events'
import { supabase } from '@/lib/supabase'
import type { EventEditorDraft } from './EventEditorDialog'

type SetDashboardMessage = (message: DashboardMessage | null) => void

export function useDashboardEvents(
  member: DashboardMember | null,
  setMessage: SetDashboardMessage,
  initialEvents: DashboardEvent[] = []
) {
  const [events, setEvents] = useState<DashboardEvent[]>(initialEvents)

  // Internal event participants modal
  const [participants, setParticipants] = useState<DashboardParticipant[]>([])
  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [showParticipantsModal, setShowParticipantsModal] = useState(false)
  const [modalEventTitle, setModalEventTitle] = useState('')

  // External event interested members modal
  const [interestedMembers, setInterestedMembers] = useState<DashboardInterestedMember[]>([])
  const [interestedMembersLoading, setInterestedMembersLoading] = useState(false)
  const [showInterestedModal, setShowInterestedModal] = useState(false)
  const [interestedModalTitle, setInterestedModalTitle] = useState('')

  // Save / upload state
  const [savingEvent, setSavingEvent] = useState(false)
  const [uploadingEventImage, setUploadingEventImage] = useState(false)

  const loadEvents = useCallback(async (memberId?: number) => {
    const { data: eventsData, error: eventsError } = await eventService.getUpcomingEvents(memberId)
    if (eventsError || !eventsData) return
    setEvents(eventsData)
  }, [])

  const handleEventRegistration = useCallback(async (
    eventId: string | number,
    isCurrentlyRegistered: boolean,
    requiresApproval?: boolean
  ) => {
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
        // The DB trigger (enforce_event_registration_status) decides the
        // resulting status from the event's to_be_approved flag — the client
        // never sends status.
        const { error } = await supabase
          .from('event_registrations')
          .insert({
            event_id: eventId,
            member_id: member.id,
          })

        if (error) throw error

        if (requiresApproval) {
          setMessage({ type: 'success', text: 'Registration request submitted — awaiting board approval.' })
          setTimeout(() => setMessage(null), 3000)
        }
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

  /**
   * Toggle the current member's interest for an external event.
   * Uses the API route so the client receives the authoritative interest count
   * after the database write.
   */
  const handleToggleInterest = useCallback(async (eventId: string | number) => {
    if (!member) return

    try {
      const response = await fetch(`/api/events/${eventId}/interest`, {
        method: 'POST',
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error || 'Could not update interest.')
      }

      const isInterested = Boolean(payload?.is_interested)
      const interestCount = typeof payload?.interest_count === 'number' ? payload.interest_count : 0

      setEvents((current) =>
        current.map((event) => event.id === eventId
          ? { ...event, is_interested: isInterested, interest_count: interestCount }
          : event)
      )
    } catch {
      setMessage({ type: 'error', text: 'Failed to update interest. Please try again.' })
    }
  }, [member, setMessage])

  /**
   * Load and display the list of members interested in an external event.
   */
  const handleViewInterestedMembers = useCallback(async (eventId: string | number, title: string) => {
    setInterestedMembersLoading(true)
    setInterestedModalTitle(title)

    const { data, error } = await eventService.getEventInterestedMembers(eventId)
    if (error) {
      setMessage({ type: 'error', text: 'Could not load interested members.' })
      setInterestedMembers([])
    } else {
      setInterestedMembers(data || [])
    }

    setInterestedMembersLoading(false)
    setShowInterestedModal(true)
  }, [setMessage])

  const handleUpdateExternalEvent = useCallback(async (eventId: string | number, draft: EventEditorDraft) => {
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
          event_link_url: draft.event_link_url,
          tally_url: draft.tally_url,
          whatsapp_url: draft.whatsapp_url,
          description: draft.description,
          location: draft.location,
          organizer_department: draft.organizer_department,
          capacity_total: draft.capacity_total,
          to_be_approved: draft.to_be_approved,
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

  const handleCreateExternalEvent = useCallback(async (draft: EventEditorDraft) => {
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
          event_link_url: draft.event_link_url,
          tally_url: draft.tally_url,
          whatsapp_url: draft.whatsapp_url,
          event_kind: draft.event_kind,
          description: draft.description,
          location: draft.location,
          organizer_department: draft.organizer_department,
          capacity_total: draft.capacity_total,
          to_be_approved: draft.to_be_approved,
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
    handleToggleInterest,
    handleViewInterestedMembers,
    interestedMembers,
    interestedMembersLoading,
    interestedModalTitle,
    loadEvents,
    modalEventTitle,
    participants,
    participantsLoading,
    savingEvent,
    setEvents,
    setInterestedMembers,
    setShowInterestedModal,
    setParticipants,
    setShowParticipantsModal,
    showInterestedModal,
    showParticipantsModal,
    uploadingEventImage,
  }
}
