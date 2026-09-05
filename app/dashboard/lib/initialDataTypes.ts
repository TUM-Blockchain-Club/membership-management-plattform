import type {
  DashboardEvent,
  DashboardMember,
  DashboardMessage,
} from '@/app/components/dashboard/types'

export type DashboardInitialData = {
  allMembers: DashboardMember[]
  canManageNftRequests: boolean
  canManageCoffeeChats?: boolean
  events: DashboardEvent[]
  hasSpecialAccess: boolean
  member: DashboardMember | null
  message: DashboardMessage | null
  viewedMemberHasSpecialAccess: boolean
}
