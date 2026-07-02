'use client'

import { use } from 'react'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { EventApprovalsPage } from '@/app/dashboard/tabs/event-approvals/EventApprovalsPage'

export default function EventApprovalsPageRoute() {
  const d = use(DashboardContext)!
  return d.showEventApprovalsTab ? <EventApprovalsPage events={d.events} /> : null
}
