'use client'

import { use } from 'react'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { EventsPage } from '@/app/dashboard/tabs/events/EventsPage'

export default function EventsPageRoute() {
  const d = use(DashboardContext)!
  return (
    <EventsPage
      events={d.events}
      formatEventDate={d.formatEventDate}
      formatEventTime={d.formatEventTime}
      handleEventRegistration={d.handleEventRegistration}
      member={d.member}
      hasSpecialAccess={d.effectiveHasSpecialAccess}
      handleViewParticipants={d.handleViewParticipants}
      showParticipantsModal={d.showParticipantsModal}
      modalEventTitle={d.modalEventTitle}
      participants={d.participants}
      participantsLoading={d.participantsLoading}
      setShowParticipantsModal={d.setShowParticipantsModal}
    />
  )
}
