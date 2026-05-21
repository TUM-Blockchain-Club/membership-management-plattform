'use client'

import { DashboardFrame } from '@/app/dashboard/DashboardFrame'
import { StatsTab } from '@/app/dashboard/tabs/StatsTab'
import { useDashboardController } from '@/app/dashboard/useDashboardController'
import type { DashboardInitialData } from '@/app/dashboard/lib/initialDataTypes'

export function StatisticsDashboardRoute({ initialData }: { initialData: DashboardInitialData }) {
  const dashboard = useDashboardController('stats', { initialData })

  return (
    <DashboardFrame dashboard={dashboard}>
      <StatsTab stats={dashboard.stats} membersVisibleByRole={dashboard.membersVisibleByRole} />
    </DashboardFrame>
  )
}
