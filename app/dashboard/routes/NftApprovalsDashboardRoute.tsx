'use client'

import { DashboardFrame } from '@/app/dashboard/DashboardFrame'
import { NftApprovalsTab } from '@/app/dashboard/tabs/NftApprovalsTab'
import { useDashboardController } from '@/app/dashboard/useDashboardController'
import type { DashboardInitialData } from '@/app/dashboard/lib/initialDataTypes'

export function NftApprovalsDashboardRoute({ initialData }: { initialData: DashboardInitialData }) {
  const dashboard = useDashboardController('nft-approvals', { initialData })

  return (
    <DashboardFrame dashboard={dashboard}>
      {dashboard.showNftApprovalsTab ? <NftApprovalsTab /> : null}
    </DashboardFrame>
  )
}
