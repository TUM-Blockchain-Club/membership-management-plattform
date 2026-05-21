'use client'

import { DashboardFrame } from '@/app/dashboard/DashboardFrame'
import { NftStatusTab } from '@/app/dashboard/tabs/NftStatusTab'
import { useDashboardController } from '@/app/dashboard/useDashboardController'
import type { DashboardInitialData } from '@/app/dashboard/lib/initialDataTypes'

export function NftStatusDashboardRoute({ initialData }: { initialData: DashboardInitialData }) {
  const dashboard = useDashboardController('nft-status', { initialData })

  return (
    <DashboardFrame dashboard={dashboard}>
      <NftStatusTab member={dashboard.member} />
    </DashboardFrame>
  )
}
