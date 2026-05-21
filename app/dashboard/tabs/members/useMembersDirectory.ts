import { useMemo } from 'react'
import type { DashboardMember } from '@/app/components/dashboard/types'

type MembersDirectoryFilters = {
  departmentFilter: string
  roleFilter: string
  searchQuery: string
  statusFilter: string
}

export function useMembersDirectory(
  allMembers: DashboardMember[],
  canViewRemovedMembers: boolean,
  { departmentFilter, roleFilter, searchQuery, statusFilter }: MembersDirectoryFilters
) {
  const membersVisibleByRole = useMemo(() => {
    if (canViewRemovedMembers) return allMembers
    return allMembers.filter((m) => m.Status !== 'Left' && m.Status !== 'Kicked out')
  }, [allMembers, canViewRemovedMembers])

  const filteredMembers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return membersVisibleByRole
      .filter((m) => {
        if (!query) return true
        return [m.Name, m.Department, m.Role, m['TBC Email']]
          .map((v) => v?.toLowerCase() || '')
          .some((v) => v.includes(query))
      })
      .filter((m) => statusFilter === 'all' || m.Status === statusFilter)
      .filter((m) => departmentFilter === 'all' || m.Department === departmentFilter)
      .filter((m) => roleFilter === 'all' || m.Role === roleFilter)
      .sort((a, b) => {
        const roleOrder: Record<string, number> = {
          'Board Member': 1,
          'Core Member': 2,
          'Ex-Core Member': 3,
        }

        const aOrder = roleOrder[a.Role || ''] || 99
        const bOrder = roleOrder[b.Role || ''] || 99
        if (aOrder !== bOrder) return aOrder - bOrder

        if (a.Role === 'Ex-Core Member' && b.Role === 'Ex-Core Member') {
          const statusOrder: Record<string, number> = {
            Honorary: 1,
            Alumni: 2,
            Advisor: 3,
          }
          const aStatusOrder = statusOrder[a.Status || ''] || 99
          const bStatusOrder = statusOrder[b.Status || ''] || 99
          if (aStatusOrder !== bStatusOrder) return aStatusOrder - bStatusOrder
        }

        return (a.Name || '').localeCompare(b.Name || '')
      })
  }, [departmentFilter, membersVisibleByRole, roleFilter, searchQuery, statusFilter])

  const boardMembers = useMemo(() => filteredMembers.filter((m) => m.Role === 'Board Member'), [filteredMembers])
  const coreMembers = useMemo(() => filteredMembers.filter((m) => m.Role === 'Core Member'), [filteredMembers])
  const exCoreHonorary = useMemo(
    () => filteredMembers.filter((m) => m.Role === 'Ex-Core Member' && m.Status === 'Honorary'),
    [filteredMembers]
  )
  const exCoreAlumni = useMemo(
    () => filteredMembers.filter((m) => m.Role === 'Ex-Core Member' && m.Status === 'Alumni'),
    [filteredMembers]
  )
  const exCoreAdvisors = useMemo(
    () => filteredMembers.filter((m) => m.Role === 'Ex-Core Member' && m.Status === 'Advisor'),
    [filteredMembers]
  )
  const exCoreOthers = useMemo(
    () => filteredMembers.filter((m) => m.Role === 'Ex-Core Member' && !['Honorary', 'Alumni', 'Advisor'].includes(m.Status || '')),
    [filteredMembers]
  )
  const otherMembers = useMemo(
    () => filteredMembers.filter((m) => !['Board Member', 'Core Member', 'Ex-Core Member'].includes(m.Role || '')),
    [filteredMembers]
  )

  const uniqueStatuses = useMemo(
    () => [...new Set(membersVisibleByRole.map((m) => m.Status).filter((v): v is string => Boolean(v?.trim())))],
    [membersVisibleByRole]
  )
  const uniqueDepartments = useMemo(
    () => [...new Set(membersVisibleByRole.map((m) => m.Department).filter((v): v is string => Boolean(v?.trim())))],
    [membersVisibleByRole]
  )
  const uniqueRoles = useMemo(
    () => [...new Set(membersVisibleByRole.map((m) => m.Role).filter((v): v is string => Boolean(v?.trim())))],
    [membersVisibleByRole]
  )

  return {
    boardMembers,
    coreMembers,
    exCoreAdvisors,
    exCoreAlumni,
    exCoreHonorary,
    exCoreOthers,
    filteredMembers,
    membersVisibleByRole,
    otherMembers,
    uniqueDepartments,
    uniqueRoles,
    uniqueStatuses,
  }
}
