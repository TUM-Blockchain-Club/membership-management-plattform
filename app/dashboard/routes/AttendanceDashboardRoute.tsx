'use client'

import { DashboardFrame } from '@/app/dashboard/DashboardFrame'
import { AttendanceTab } from '@/app/dashboard/tabs/AttendanceTab'
import { useDashboardController } from '@/app/dashboard/useDashboardController'
import type { DashboardInitialData } from '@/app/dashboard/lib/initialDataTypes'

export function AttendanceDashboardRoute({ initialData }: { initialData: DashboardInitialData }) {
  const dashboard = useDashboardController('attendance', { initialData })

  const isBoard = dashboard.effectiveHasSpecialAccess || dashboard.member?.Role === 'Board Member'

  return (
    <DashboardFrame dashboard={dashboard}>
      <AttendanceTab
        isBoard={Boolean(isBoard)}
        allMembers={dashboard.membersVisibleByRole}
      />
    </DashboardFrame>
  )
}
