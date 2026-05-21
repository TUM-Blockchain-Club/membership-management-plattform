'use client'

import { DashboardFrame } from '@/app/dashboard/DashboardFrame'
import { EventsTab } from '@/app/dashboard/tabs/EventsTab'
import { useDashboardController } from '@/app/dashboard/useDashboardController'
import type { DashboardInitialData } from '@/app/dashboard/lib/initialDataTypes'

export function EventsDashboardRoute({ initialData }: { initialData: DashboardInitialData }) {
  const dashboard = useDashboardController('events', { initialData })

  return (
    <DashboardFrame dashboard={dashboard}>
      <EventsTab
        events={dashboard.events}
        formatEventDate={dashboard.formatEventDate}
        formatEventTime={dashboard.formatEventTime}
        handleEventRegistration={dashboard.handleEventRegistration}
        member={dashboard.member}
        hasSpecialAccess={dashboard.effectiveHasSpecialAccess}
        handleViewParticipants={dashboard.handleViewParticipants}
        showParticipantsModal={dashboard.showParticipantsModal}
        modalEventTitle={dashboard.modalEventTitle}
        participants={dashboard.participants}
        participantsLoading={dashboard.participantsLoading}
        setShowParticipantsModal={dashboard.setShowParticipantsModal}
      />
    </DashboardFrame>
  )
}
