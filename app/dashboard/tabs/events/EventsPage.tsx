'use client'

import { ExternalEventCard, InternalEventCard } from '@/app/components/dashboard/EventCard'
import type { DashboardEvent, DashboardMember, DashboardParticipant } from '@/app/components/dashboard/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'
import { useState } from 'react'
import { EventEditorDialog, type EventEditorDraft } from './EventEditorDialog'

export function EventsPage({
  events,
  formatEventDate,
  formatEventTime,
  handleEventRegistration,
  handleUpdateExternalEvent,
  handleUploadExternalEventImage,
  member,
  hasSpecialAccess,
  handleViewParticipants,
  showParticipantsModal,
  modalEventTitle,
  participants,
  participantsLoading,
  savingEvent,
  uploadingEventImage,
  setShowParticipantsModal,
}: {
  events: DashboardEvent[]
  formatEventDate: (startAt: string, endAt: string) => string
  formatEventTime: (startAt: string, endAt: string) => string
  handleEventRegistration: (eventId: string | number, isCurrentlyRegistered: boolean) => void
  handleUpdateExternalEvent: (eventId: string | number, draft: EventEditorDraft) => Promise<DashboardEvent | null>
  handleUploadExternalEventImage: (eventId: string | number, file: File) => Promise<string | null>
  member: DashboardMember | null
  hasSpecialAccess: boolean
  handleViewParticipants: (eventId: string | number, title: string) => void
  showParticipantsModal: boolean
  modalEventTitle: string
  participants: DashboardParticipant[]
  participantsLoading: boolean
  savingEvent: boolean
  uploadingEventImage: boolean
  setShowParticipantsModal: (show: boolean) => void
}) {
  const [editingEvent, setEditingEvent] = useState<DashboardEvent | null>(null)
  const internalEvents = events.filter((event) => event.event_kind === 'internal')
  const externalEvents = events.filter((event) => event.event_kind === 'external')
  const showInternalEvents = false
  const canManageEvents = member?.Role === 'Board Member' || hasSpecialAccess

  const handleSaveEvent = async (eventId: string | number, draft: EventEditorDraft) => {
    const updatedEvent = await handleUpdateExternalEvent(eventId, draft)
    if (updatedEvent) {
      setEditingEvent(null)
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Events</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {events.length} upcoming {events.length === 1 ? 'event' : 'events'}
          </p>
        </div>
      </div>

      {showInternalEvents && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Our Events
            </span>
            <Separator className="flex-1" />
            <Badge variant="secondary">{internalEvents.length}</Badge>
          </div>

          {internalEvents.length === 0 ? (
            <Empty className="border-dashed">
              <EmptyHeader>
                <EmptyTitle>No internal events</EmptyTitle>
                <EmptyDescription>New events organized by the club will show up here.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {internalEvents.map((event) => (
                <InternalEventCard
                  key={event.id}
                  title={event.title}
                  date={formatEventDate(event.start_at, event.end_at)}
                  time={formatEventTime(event.start_at, event.end_at)}
                  location={event.location}
                  description={event.description}
                  organizer={event.organizer_department}
                  maxAttendees={event.capacity_total}
                  currentAttendees={event.current_registrations || 0}
                  hasApplyButton={true}
                  isApplied={event.is_registered || false}
                  onApply={() => handleEventRegistration(event.id, event.is_registered || false)}
                  showParticipantsButton={!!event.current_registrations && (member?.Role === 'Board Member' || hasSpecialAccess)}
                  onViewParticipants={() => handleViewParticipants(event.id, event.title)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            External Events
          </span>
          <Separator className="flex-1" />
          <Badge variant="secondary">{externalEvents.length}</Badge>
        </div>

        {externalEvents.length === 0 ? (
          <Empty className="border-dashed">
            <EmptyHeader>
              <EmptyTitle>No external events</EmptyTitle>
              <EmptyDescription>Imported conferences and hackathons will show up here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {externalEvents.map((event) => (
              <ExternalEventCard
                key={event.id}
                title={event.title}
                date={formatEventDate(event.start_at, event.end_at)}
                location={event.city || event.location}
                eventType={event.event_type}
                priority={event.priority}
                status={event.external_status}
                format={event.format}
                imageUrl={event.image_url}
                imageLinkUrl={event.image_link_url}
                interestedNames={event.interested_names}
                attendingNames={event.attending_names}
                canEdit={canManageEvents}
                onEdit={() => setEditingEvent(event)}
              />
            ))}
          </div>
        )}
      </section>

      <Dialog open={showParticipantsModal} onOpenChange={setShowParticipantsModal}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Participants for {modalEventTitle}</DialogTitle>
            <DialogDescription>{participants.length} registered</DialogDescription>
          </DialogHeader>

          {participantsLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : participants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No registrations yet.</p>
          ) : (
            <ul className="flex flex-col">
              {participants.map((p) => (
                <li key={p.member_id} className="flex items-center justify-between gap-3 border-b py-2 last:border-b-0">
                  <span className="font-medium text-foreground">{p.members_main?.Name || 'Unknown'}</span>
                </li>
              ))}
            </ul>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowParticipantsModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EventEditorDialog
        key={editingEvent?.id ?? 'event-editor'}
        event={editingEvent}
        open={!!editingEvent}
        saving={savingEvent}
        uploading={uploadingEventImage}
        onOpenChange={(open) => { if (!open) setEditingEvent(null) }}
        onSave={handleSaveEvent}
        onUploadImage={handleUploadExternalEventImage}
      />
    </div>
  )
}
