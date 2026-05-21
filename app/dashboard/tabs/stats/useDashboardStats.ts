import { useMemo } from 'react'
import type { DashboardMember, DashboardStats } from '@/app/components/dashboard/types'

export function useDashboardStats(membersVisibleByRole: DashboardMember[]): DashboardStats {
  return useMemo(() => {
    const deptSet = new Set<string>()
    membersVisibleByRole.forEach((m) => {
      if (m.Department) {
        m.Department
          .split(',')
          .map((d) => d.trim())
          .filter(Boolean)
          .forEach((d) => deptSet.add(d))
      }
    })

    return {
      total: membersVisibleByRole.length,
      active: membersVisibleByRole.filter((m) => m.Status === 'Active').length,
      departments: deptSet.size,
      exCore: membersVisibleByRole.filter((m) => m.Role === 'Ex-Core Member').length,
    }
  }, [membersVisibleByRole])
}
