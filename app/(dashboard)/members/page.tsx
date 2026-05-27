'use client'

import { use } from 'react'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { MembersPageV2 } from '@/app/dashboard/tabs/members/MembersPageV2'

export default function MembersPage() {
  const d = use(DashboardContext)!
  return (
    <MembersPageV2
      boardMembers={d.boardMembers}
      coreMembers={d.coreMembers}
      exCoreHonorary={d.exCoreHonorary}
      exCoreAlumni={d.exCoreAlumni}
      exCoreAdvisors={d.exCoreAdvisors}
      exCoreOthers={d.exCoreOthers}
      otherMembers={d.otherMembers}
      member={d.member}
      hasSpecialAccess={d.effectiveHasSpecialAccess}
      handleAddMember={d.handleAddMember}
      searchQuery={d.searchQuery}
      setSearchQuery={d.setSearchQuery}
      statusFilter={d.statusFilter}
      setStatusFilter={d.setStatusFilter}
      departmentFilter={d.departmentFilter}
      setDepartmentFilter={d.setDepartmentFilter}
      roleFilter={d.roleFilter}
      setRoleFilter={d.setRoleFilter}
      uniqueStatuses={d.uniqueStatuses}
      uniqueDepartments={d.uniqueDepartments}
      uniqueRoles={d.uniqueRoles}
      filteredMembers={d.filteredMembers}
      membersVisibleByRole={d.membersVisibleByRole}
      getPictureUrl={d.getPictureUrl}
      canEditMember={d.canEditMember}
      handleEditClick={d.handleEditClick}
      handleEditOtherMember={d.handleEditOtherMember}
    />
  )
}
