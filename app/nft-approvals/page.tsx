import { loadDashboardInitialData } from '@/app/dashboard/lib/loadDashboardInitialData'
import { NftApprovalsDashboardRoute } from '@/app/dashboard/routes/NftApprovalsDashboardRoute'

export default async function NftApprovalsPage() {
  const initialData = await loadDashboardInitialData('nft-approvals')
  return <NftApprovalsDashboardRoute initialData={initialData} />
}
