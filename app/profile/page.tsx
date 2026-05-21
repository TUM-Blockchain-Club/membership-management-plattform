import { loadDashboardInitialData } from '@/app/dashboard/lib/loadDashboardInitialData'
import { ProfileDashboardRoute } from '@/app/dashboard/routes/ProfileDashboardRoute'

export default async function ProfilePage() {
  const initialData = await loadDashboardInitialData('profile')
  return <ProfileDashboardRoute initialData={initialData} />
}
