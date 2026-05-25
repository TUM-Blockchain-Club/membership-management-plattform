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
      handleCreateExternalEvent={d.handleCreateExternalEvent}
      handleEventRegistration={d.handleEventRegistration}
      handleUpdateExternalEvent={d.handleUpdateExternalEvent}
      handleUploadExternalEventImage={d.handleUploadExternalEventImage}
      member={d.member}
      hasSpecialAccess={d.effectiveHasSpecialAccess}
      handleViewParticipants={d.handleViewParticipants}
      showParticipantsModal={d.showParticipantsModal}
      modalEventTitle={d.modalEventTitle}
      participants={d.participants}
      participantsLoading={d.participantsLoading}
      savingEvent={d.savingEvent}
      uploadingEventImage={d.uploadingEventImage}
      setShowParticipantsModal={d.setShowParticipantsModal}
    />
  )
}
