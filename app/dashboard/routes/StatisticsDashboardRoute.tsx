'use client'

import { DashboardFrame } from '@/app/dashboard/DashboardFrame'
import { StatsTab } from '@/app/dashboard/tabs/StatsTab'
import { useDashboardController } from '@/app/dashboard/useDashboardController'

export function StatisticsDashboardRoute() {
  const dashboard = useDashboardController('stats')

  return (
    <DashboardFrame dashboard={dashboard}>
      <StatsTab stats={dashboard.stats} membersVisibleByRole={dashboard.membersVisibleByRole} />
    </DashboardFrame>
  )
}
