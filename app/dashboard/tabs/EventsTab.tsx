import type {
  DashboardEvent,
  DashboardInterestedMember,
  DashboardMember,
  DashboardParticipant,
} from "@/app/components/dashboard/types"
import type { EventEditorDraft } from "./events/EventEditorDialog"
import { EventsPage } from "./events/EventsPage"

export function EventsTab(props: {
  events: DashboardEvent[]
  formatEventDate: (startAt: string, endAt: string) => string
  formatEventTime: (startAt: string, endAt: string) => string
  handleCreateExternalEvent: (draft: EventEditorDraft) => Promise<DashboardEvent | null>
  handleEventRegistration: (eventId: string | number, isCurrentlyRegistered: boolean) => void
  handleUpdateExternalEvent: (eventId: string | number, draft: EventEditorDraft) => Promise<DashboardEvent | null>
  handleUploadExternalEventImage: (eventId: string | number, file: File) => Promise<string | null>
  handleToggleInterest: (eventId: string | number) => void
  handleViewInterestedMembers: (eventId: string | number, title: string) => void
  interestedMembers: DashboardInterestedMember[]
  interestedMembersLoading: boolean
  interestedModalTitle: string
  showInterestedModal: boolean
  setShowInterestedModal: (show: boolean) => void
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
  return <EventsPage {...props} />
}
