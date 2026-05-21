'use client'

import { DashboardFrame } from '@/app/dashboard/DashboardFrame'
import { MembersTab } from '@/app/dashboard/tabs/MembersTab'
import { useDashboardController } from '@/app/dashboard/useDashboardController'

export function MembersDashboardRoute() {
  const dashboard = useDashboardController('members')

  return (
    <DashboardFrame dashboard={dashboard}>
      <MembersTab
        boardMembers={dashboard.boardMembers}
        coreMembers={dashboard.coreMembers}
        exCoreHonorary={dashboard.exCoreHonorary}
        exCoreAlumni={dashboard.exCoreAlumni}
        exCoreAdvisors={dashboard.exCoreAdvisors}
        exCoreOthers={dashboard.exCoreOthers}
        otherMembers={dashboard.otherMembers}
        member={dashboard.member}
        hasSpecialAccess={dashboard.effectiveHasSpecialAccess}
        handleAddMember={dashboard.handleAddMember}
        searchQuery={dashboard.searchQuery}
        setSearchQuery={dashboard.setSearchQuery}
        statusFilter={dashboard.statusFilter}
        setStatusFilter={dashboard.setStatusFilter}
        departmentFilter={dashboard.departmentFilter}
        setDepartmentFilter={dashboard.setDepartmentFilter}
        roleFilter={dashboard.roleFilter}
        setRoleFilter={dashboard.setRoleFilter}
        uniqueStatuses={dashboard.uniqueStatuses}
        uniqueDepartments={dashboard.uniqueDepartments}
        uniqueRoles={dashboard.uniqueRoles}
        filteredMembers={dashboard.filteredMembers}
        membersVisibleByRole={dashboard.membersVisibleByRole}
        getPictureUrl={dashboard.getPictureUrl}
        canEditMember={dashboard.canEditMember}
        handleEditClick={dashboard.handleEditClick}
        handleEditOtherMember={dashboard.handleEditOtherMember}
      />
    </DashboardFrame>
  )
}
