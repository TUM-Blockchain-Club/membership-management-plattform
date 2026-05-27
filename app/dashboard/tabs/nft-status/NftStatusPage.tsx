'use client'

import type { DashboardMember } from '@/app/components/dashboard/types'
import { NftRequestPanel, NftStatusHero } from './components'
import { useNftStatus } from './useNftStatus'

export function NftStatusPage({ member }: { member: DashboardMember | null }) {
  const state = useNftStatus(member)

  return (
    <div className="mx-auto max-w-5xl">
      <NftStatusHero state={state} />
      <NftRequestPanel state={state} />
    </div>
  )
}
