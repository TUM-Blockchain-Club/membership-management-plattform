import { loadDashboardInitialData } from '@/app/dashboard/lib/loadDashboardInitialData'
import { MembersDashboardRoute } from '@/app/dashboard/routes/MembersDashboardRoute'

export default async function MembersPage() {
  const initialData = await loadDashboardInitialData('members')
  return <MembersDashboardRoute initialData={initialData} />
}
