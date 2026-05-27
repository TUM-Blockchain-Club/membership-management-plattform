import type { DashboardMember } from "@/app/components/dashboard/types"
import { MembersPageV2 } from "./members/MembersPageV2"

export function MembersTab(props: {
  boardMembers: DashboardMember[]
  coreMembers: DashboardMember[]
  exCoreHonorary: DashboardMember[]
  exCoreAlumni: DashboardMember[]
  exCoreAdvisors: DashboardMember[]
  exCoreOthers: DashboardMember[]
  otherMembers: DashboardMember[]
  member: DashboardMember | null
  hasSpecialAccess: boolean
  handleAddMember: () => void
  searchQuery: string
  setSearchQuery: (value: string) => void
  statusFilter: string
  setStatusFilter: (value: string) => void
  departmentFilter: string
  setDepartmentFilter: (value: string) => void
  roleFilter: string
  setRoleFilter: (value: string) => void
  uniqueStatuses: string[]
  uniqueDepartments: string[]
  uniqueRoles: string[]
  filteredMembers: DashboardMember[]
  membersVisibleByRole: DashboardMember[]
  getPictureUrl: (picture: unknown) => string | null
  canEditMember: (targetMember: DashboardMember) => boolean
  handleEditClick: () => void
  handleEditOtherMember: (targetMember: DashboardMember) => void
}) {
  return <MembersPageV2 {...props} />
}
