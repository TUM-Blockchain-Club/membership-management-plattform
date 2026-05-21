import type { DashboardMember } from "@/app/components/dashboard/types"
import { NftStatusPage } from "./nft-status/NftStatusPage"

export function NftStatusTab({ member }: { member: DashboardMember | null }) {
  return <NftStatusPage member={member} />
}
