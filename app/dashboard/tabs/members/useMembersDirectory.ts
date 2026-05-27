import { useMemo } from 'react'
import type { DashboardMember } from '@/app/components/dashboard/types'

type MembersDirectoryFilters = {
  departmentFilter: string
  roleFilter: string
  searchQuery: string
  statusFilter: string
}

const roleOrder: Record<string, number> = {
  'Board Member': 1,
  'Core Member': 2,
  'Ex-Core Member': 3,
}

const exCoreStatusOrder: Record<string, number> = {
  Honorary: 1,
  Alumni: 2,
  Advisor: 3,
}

const exCoreHighlightedStatuses = new Set(['Honorary', 'Alumni', 'Advisor'])
const namedRoleSet = new Set(['Board Member', 'Core Member', 'Ex-Core Member'])
const memberNameCollator = new Intl.Collator(undefined, { sensitivity: 'base' })

export function useMembersDirectory(
  allMembers: DashboardMember[],
  canViewRemovedMembers: boolean,
  { departmentFilter, roleFilter, searchQuery, statusFilter }: MembersDirectoryFilters
) {
  const membersVisibleByRole = useMemo(() => {
    if (canViewRemovedMembers) return allMembers
    return allMembers.filter((m) => m.Status !== 'Left' && m.Status !== 'Kicked out')
  }, [allMembers, canViewRemovedMembers])

  const directory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const boardMembers: DashboardMember[] = []
    const coreMembers: DashboardMember[] = []
    const exCoreHonorary: DashboardMember[] = []
    const exCoreAlumni: DashboardMember[] = []
    const exCoreAdvisors: DashboardMember[] = []
    const exCoreOthers: DashboardMember[] = []
    const otherMembers: DashboardMember[] = []

    const filteredMembers = membersVisibleByRole
      .filter((member) => {
        if (statusFilter !== 'all' && member.Status !== statusFilter) return false
        if (departmentFilter !== 'all' && member.Department !== departmentFilter) return false
        if (roleFilter !== 'all' && member.Role !== roleFilter) return false

        if (!query) return true

        return [member.Name, member.Department, member.Role, member['TBC Email']]
          .some((value) => value?.toLowerCase().includes(query))
      })
      .sort((a, b) => {
        const aOrder = roleOrder[a.Role || ''] || 99
        const bOrder = roleOrder[b.Role || ''] || 99
        if (aOrder !== bOrder) return aOrder - bOrder

        if (a.Role === 'Ex-Core Member' && b.Role === 'Ex-Core Member') {
          const aStatusOrder = exCoreStatusOrder[a.Status || ''] || 99
          const bStatusOrder = exCoreStatusOrder[b.Status || ''] || 99
          if (aStatusOrder !== bStatusOrder) return aStatusOrder - bStatusOrder
        }

        return memberNameCollator.compare(a.Name || '', b.Name || '')
      })

    filteredMembers.forEach((member) => {
      if (member.Role === 'Board Member') {
        boardMembers.push(member)
        return
      }

      if (member.Role === 'Core Member') {
        coreMembers.push(member)
        return
      }

      if (member.Role === 'Ex-Core Member') {
        if (member.Status === 'Honorary') {
          exCoreHonorary.push(member)
          return
        }

        if (member.Status === 'Alumni') {
          exCoreAlumni.push(member)
          return
        }

        if (member.Status === 'Advisor') {
          exCoreAdvisors.push(member)
          return
        }

        if (!exCoreHighlightedStatuses.has(member.Status || '')) {
          exCoreOthers.push(member)
          return
        }
      }

      if (!namedRoleSet.has(member.Role || '')) {
        otherMembers.push(member)
      }
    })

    return {
      boardMembers,
      coreMembers,
      exCoreAdvisors,
      exCoreAlumni,
      exCoreHonorary,
      exCoreOthers,
      filteredMembers,
      otherMembers,
    }
  }, [departmentFilter, membersVisibleByRole, roleFilter, searchQuery, statusFilter])

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
    ...directory,
    membersVisibleByRole,
    uniqueDepartments,
    uniqueRoles,
    uniqueStatuses,
  }
}
