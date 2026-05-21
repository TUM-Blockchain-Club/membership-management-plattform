import { EventCard } from '@/app/components/dashboard/EventCard'
import type { DashboardEvent, DashboardMember, DashboardParticipant } from '@/app/components/dashboard/types'

export function EventsPage({
  events,
  formatEventDate,
  formatEventTime,
  handleEventRegistration,
  member,
  hasSpecialAccess,
  handleViewParticipants,
  showParticipantsModal,
  modalEventTitle,
  participants,
  participantsLoading,
  setShowParticipantsModal,
}: {
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
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Upcoming Events</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event, index) => {
          const colors = ['blue', 'purple', 'green', 'orange', 'cyan', 'pink']
          const color = colors[index % colors.length]

          return (
            <EventCard
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
              color={color}
              onApply={() => handleEventRegistration(event.id, event.is_registered || false)}
              showParticipantsButton={!!event.current_registrations && (member?.Role === 'Board Member' || hasSpecialAccess)}
              onViewParticipants={() => handleViewParticipants(event.id, event.title)}
            />
          )
        })}
      </div>

      {showParticipantsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-black/90 rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center justify-between">
              <span>Participants for {modalEventTitle}</span>
              <span className="text-sm text-white/60">{participants.length} registered</span>
            </h3>

            {participantsLoading ? (
              <p className="text-white/60">Loading...</p>
            ) : participants.length === 0 ? (
              <p className="text-white/60">No registrations yet.</p>
            ) : (
              <ul className="divide-y divide-white/20">
                {participants.map((p) => (
                  <li key={p.member_id} className="py-2 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-white font-medium">{p.members_main?.Name || 'Unknown'}</span>
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={() => setShowParticipantsModal(false)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
