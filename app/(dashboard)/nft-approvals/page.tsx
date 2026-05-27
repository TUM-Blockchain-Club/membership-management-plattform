'use client'

import { use } from 'react'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { NftApprovalsPage } from '@/app/dashboard/tabs/nft-approvals/NftApprovalsPage'

export default function NftApprovalsPageRoute() {
  const d = use(DashboardContext)!
  return d.showNftApprovalsTab ? <NftApprovalsPage /> : null
}
