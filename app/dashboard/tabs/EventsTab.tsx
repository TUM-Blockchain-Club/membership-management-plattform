import type { DashboardEvent, DashboardMember, DashboardParticipant } from "@/app/components/dashboard/types"
import { EventsPage } from "./events/EventsPage"

export function EventsTab(props: {
  events: DashboardEvent[]
  formatEventDate: (startAt: string, endAt: string) => string
  formatEventTime: (startAt: string, endAt: string) => string
  handleEventRegistration: (eventId: string | number, isCurrentlyRegistered: boolean) => void
  member: DashboardMember | null
  hasSpecialAccess: boolean
  handleViewParticipants: (eventId: string | number, title: string) => void
  showParticipantsModal: boolean
  modalEventTitle: string
  participants: DashboardParticipant[]
  participantsLoading: boolean
  setShowParticipantsModal: (show: boolean) => void
}) {
  return <EventsPage {...props} />
}
