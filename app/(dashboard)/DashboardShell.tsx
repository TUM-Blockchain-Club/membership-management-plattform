'use client'

import { usePathname } from 'next/navigation'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { DashboardFrame } from '@/app/dashboard/DashboardFrame'
import { useDashboardController } from '@/app/dashboard/useDashboardController'
import type { DashboardInitialData } from '@/app/dashboard/lib/initialDataTypes'
import type { DashboardTab } from '@/app/components/dashboard/types'

// Maps URL pathnames to the controller's tab key
const PATHNAME_TO_TAB: Record<string, DashboardTab> = {
  '/members':       'members',
  '/profile':       'profile',
  '/email-signature': 'email-signature',
  '/statistics':    'stats',
  '/events':        'events',
  '/link-analytics': 'link-analytics',
  '/nft-approvals': 'nft-approvals',
  '/nft-status':    'nft-status',
  '/newsletter':    'newsletter',
}

export function DashboardShell({
  initialData,
  children,
}: {
  initialData: DashboardInitialData
  children: React.ReactNode
}) {
  const pathname  = usePathname()
  const activeTab = pathname.startsWith('/link-analytics/')
    ? 'link-analytics'
    : PATHNAME_TO_TAB[pathname] ?? 'profile'
  const dashboard = useDashboardController(activeTab, { initialData })

  return (
    <DashboardContext.Provider value={dashboard}>
      {/* DashboardFrame renders the sticky header + nav — it persists because
          this shell component lives in the layout and never unmounts. */}
      <DashboardFrame dashboard={dashboard}>
        {children}
      </DashboardFrame>
    </DashboardContext.Provider>
  )
}
