import type { DashboardMember, DashboardStats } from "@/app/components/dashboard/types"
import { StatsPage } from "./stats/StatsPage"

export function StatsTab(props: { stats: DashboardStats; membersVisibleByRole: DashboardMember[] }) {
  return <StatsPage {...props} />
}
