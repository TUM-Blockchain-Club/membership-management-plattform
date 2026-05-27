'use client'

import { use } from 'react'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { NftStatusPage } from '@/app/dashboard/tabs/nft-status/NftStatusPage'

export default function NftStatusPageRoute() {
  const d = use(DashboardContext)!
  return <NftStatusPage member={d.member} />
}
