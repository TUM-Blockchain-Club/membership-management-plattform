'use client'

import { DashboardFrame } from '@/app/dashboard/DashboardFrame'
import { NftApprovalsTab } from '@/app/dashboard/tabs/NftApprovalsTab'
import { useDashboardController } from '@/app/dashboard/useDashboardController'

export function NftApprovalsDashboardRoute() {
  const dashboard = useDashboardController('nft-approvals')

  return (
    <DashboardFrame dashboard={dashboard}>
      {dashboard.showNftApprovalsTab ? <NftApprovalsTab /> : null}
    </DashboardFrame>
  )
}
