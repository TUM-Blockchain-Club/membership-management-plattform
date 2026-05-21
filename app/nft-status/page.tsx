import { loadDashboardInitialData } from '@/app/dashboard/lib/loadDashboardInitialData'
import { NftStatusDashboardRoute } from '@/app/dashboard/routes/NftStatusDashboardRoute'

export default async function NftStatusPage() {
  const initialData = await loadDashboardInitialData('nft-status')
  return <NftStatusDashboardRoute initialData={initialData} />
}
