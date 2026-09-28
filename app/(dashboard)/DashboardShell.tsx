'use client'

import { usePathname } from 'next/navigation'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { DashboardFrame } from '@/app/dashboard/DashboardFrame'
import { useDashboardController } from '@/app/dashboard/useDashboardController'
import { getDashboardTabForPathname } from '@/app/dashboard/lib/routes'
import type { DashboardInitialData } from '@/app/dashboard/lib/initialDataTypes'

export function DashboardShell({
  initialData,
  children,
}: {
  initialData: DashboardInitialData
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const activeTab = getDashboardTabForPathname(pathname)
  const dashboard = useDashboardController(activeTab, { initialData })

  return (
    <DashboardContext.Provider value={dashboard}>
      {/* DashboardFrame renders the sidebar and content — it persists because
          this shell component lives in the layout and never unmounts. */}
      <DashboardFrame dashboard={dashboard}>
        {children}
      </DashboardFrame>
    </DashboardContext.Provider>
  )
}
