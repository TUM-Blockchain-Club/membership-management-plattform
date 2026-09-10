'use client'

import { use } from 'react'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { AttendanceTab } from '@/app/dashboard/tabs/AttendanceTab'

export default function AttendancePageRoute() {
  const dashboard = use(DashboardContext)!
  const isBoard = dashboard.effectiveHasSpecialAccess || dashboard.member?.Role === 'Board Member'

  return (
    <AttendanceTab
      isBoard={Boolean(isBoard)}
      allMembers={dashboard.membersVisibleByRole}
    />
  )
}
