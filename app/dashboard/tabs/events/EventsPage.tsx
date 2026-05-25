'use client'

import { ExternalEventCard, InternalEventCard } from '@/app/components/dashboard/EventCard'
import type { DashboardEvent, DashboardMember, DashboardParticipant } from '@/app/components/dashboard/types'
import { ChevronDownIcon, HistoryIcon, PlusIcon, SearchIcon, XIcon } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { EventEditorDialog, type EventEditorDraft } from './EventEditorDialog'

const PRIORITY_OPTIONS = [
  { value: 'P1', label: 'P1 🚀' },
  { value: 'P2', label: 'P2 🔥' },
  { value: 'P3', label: 'P3 😁' },
  { value: 'P4', label: 'P4 🧐' },
]
const DEFAULT_PRIORITY_FILTER = ['P1', 'P2']
const RECENT_PAST_DAYS = 7

export function EventsPage({
  events,
  formatEventDate,
  formatEventTime,
  handleCreateExternalEvent,
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
  handleCreateExternalEvent: (draft: EventEditorDraft) => Promise<DashboardEvent | null>
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
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState<string[]>(DEFAULT_PRIORITY_FILTER)
  const [showOlderPastEvents, setShowOlderPastEvents] = useState(false)
  const [, startTransition] = useTransition()
  const internalEvents = events.filter((event) => event.event_kind === 'internal')
  const externalEvents = events.filter((event) => event.event_kind === 'external')
  const showInternalEvents = false
  const canManageEvents = hasSpecialAccess
  const recentPastCutoffMs = useMemo(() => {
    const cutoff = new Date()
    cutoff.setHours(0, 0, 0, 0)
    cutoff.setDate(cutoff.getDate() - RECENT_PAST_DAYS)
    return cutoff.getTime()
  }, [])

  useEffect(() => {
    const id = setTimeout(() => startTransition(() => setSearchQuery(inputValue)), 300)
    return () => clearTimeout(id)
  }, [inputValue, setSearchQuery])

  const updateTypeFilter = useCallback((value: string) => {
    startTransition(() => setTypeFilter(value))
  }, [])

  const updatePriorityFilter = useCallback((value: string, checked: boolean) => {
    startTransition(() => {
      setPriorityFilter((current) => {
        if (checked) return current.includes(value) ? current : [...current, value]
        return current.filter((item) => item !== value)
      })
    })
  }, [])

  const isDefaultPriorityFilter =
    priorityFilter.length === DEFAULT_PRIORITY_FILTER.length &&
    DEFAULT_PRIORITY_FILTER.every((priority) => priorityFilter.includes(priority))
  const hasActiveFilters = searchQuery || typeFilter !== 'all' || !isDefaultPriorityFilter || showOlderPastEvents

  const clearFilters = useCallback(() => {
    setInputValue('')
    startTransition(() => {
      setSearchQuery('')
      setTypeFilter('all')
      setPriorityFilter(DEFAULT_PRIORITY_FILTER)
      setShowOlderPastEvents(false)
    })
  }, [])

  const filteredExternalEvents = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    return externalEvents.filter((event) => {
      const eventType = event.event_type?.toLowerCase() ?? ''
      const eventPriority = event.priority ?? 'none'
      const eventEndMs = new Date(event.end_at).getTime()
      const searchText = [
        event.title,
        event.city,
        event.location,
        event.event_type,
        event.external_status,
        event.format,
      ].filter(Boolean).join(' ').toLowerCase()

      if (!showOlderPastEvents && Number.isFinite(eventEndMs) && eventEndMs < recentPastCutoffMs) return false
      if (normalizedSearch && !searchText.includes(normalizedSearch)) return false
      if (typeFilter !== 'all' && !eventType.includes(typeFilter)) return false
      if (priorityFilter.length > 0 && !priorityFilter.includes(eventPriority)) return false

      return true
    })
  }, [externalEvents, priorityFilter, recentPastCutoffMs, searchQuery, showOlderPastEvents, typeFilter])

  const priorityFilterLabel = useMemo(() => {
    if (priorityFilter.length === 0) return 'Priority'
    if (priorityFilter.length === 1) {
      return PRIORITY_OPTIONS.find((option) => option.value === priorityFilter[0])?.label ?? priorityFilter[0]
    }
    return `${priorityFilter.length} priorities`
  }, [priorityFilter])

  const handleSaveEvent = async (eventId: string | number | null, draft: EventEditorDraft) => {
    if (eventId === null) return null
    const updatedEvent = await handleUpdateExternalEvent(eventId, draft)
    if (updatedEvent) {
      setEditingEvent(null)
    }
    return updatedEvent
  }

  const handleCreateEvent = async (_eventId: string | number | null, draft: EventEditorDraft) => {
    const createdEvent = await handleCreateExternalEvent(draft)
    if (createdEvent) {
      setCreatingEvent(false)
    }
    return createdEvent
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Events</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {events.length} tracked {events.length === 1 ? 'event' : 'events'}
          </p>
        </div>
        {canManageEvents && (
          <Button size="sm" onClick={() => setCreatingEvent(true)} className="shrink-0">
            <PlusIcon data-icon="inline-start" />
            Add Event
          </Button>
        )}
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
        <div className="flex flex-wrap gap-2">
          <InputGroup className="h-8 w-48">
            <InputGroupAddon align="inline-start">
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              type="text"
              placeholder="Search..."
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              className="text-sm"
            />
          </InputGroup>

          <Select value={typeFilter} onValueChange={updateTypeFilter}>
            <SelectTrigger size="sm" className="h-8 w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="conference">Conferences</SelectItem>
                <SelectItem value="hackathon">Hackathons</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 min-w-36 justify-between font-normal">
                {priorityFilterLabel}
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44">
              <DropdownMenuGroup>
                {PRIORITY_OPTIONS.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={priorityFilter.includes(option.value)}
                    onCheckedChange={(checked) => updatePriorityFilter(option.value, checked === true)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant={showOlderPastEvents ? 'secondary' : 'outline'}
            size="sm"
            className="h-8"
            aria-pressed={showOlderPastEvents}
            onClick={() => startTransition(() => setShowOlderPastEvents((current) => !current))}
          >
            <HistoryIcon data-icon="inline-start" />
            Older past
          </Button>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-muted-foreground hover:text-foreground">
              <XIcon data-icon="inline-start" />
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            External Events
          </span>
          <Separator className="flex-1" />
          <Badge variant="secondary">{filteredExternalEvents.length}</Badge>
        </div>

        {filteredExternalEvents.length === 0 ? (
          <Empty className="border-dashed">
            <EmptyHeader>
              <EmptyTitle>No external events</EmptyTitle>
              <EmptyDescription>Try adjusting your search or filters.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredExternalEvents.map((event) => (
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
                imageLinkUrl={event.event_link_url}
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
        mode="edit"
        open={!!editingEvent}
        saving={savingEvent}
        uploading={uploadingEventImage}
        onOpenChange={(open) => { if (!open) setEditingEvent(null) }}
        onSave={handleSaveEvent}
        onUploadImage={handleUploadExternalEventImage}
      />

      <EventEditorDialog
        key={creatingEvent ? 'create-event' : 'create-event-closed'}
        event={null}
        mode="create"
        open={creatingEvent}
        saving={savingEvent}
        uploading={uploadingEventImage}
        onOpenChange={(open) => { if (!open) setCreatingEvent(false) }}
        onSave={handleCreateEvent}
        onUploadImage={handleUploadExternalEventImage}
      />
    </div>
  )
}
