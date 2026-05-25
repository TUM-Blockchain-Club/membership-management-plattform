'use client'

import { use } from 'react'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { StatsPage } from '@/app/dashboard/tabs/stats/StatsPage'

export default function StatisticsPage() {
  const d = use(DashboardContext)!
  return <StatsPage stats={d.stats} membersVisibleByRole={d.membersVisibleByRole} />
}
