'use client'

import { DashboardFrame } from '@/app/dashboard/DashboardFrame'
import { NftStatusTab } from '@/app/dashboard/tabs/NftStatusTab'
import { useDashboardController } from '@/app/dashboard/useDashboardController'

export function NftStatusDashboardRoute() {
  const dashboard = useDashboardController('nft-status')

  return (
    <DashboardFrame dashboard={dashboard}>
      <NftStatusTab member={dashboard.member} />
    </DashboardFrame>
  )
}
