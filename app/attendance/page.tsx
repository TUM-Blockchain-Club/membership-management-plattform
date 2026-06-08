import { loadDashboardInitialData } from '@/app/dashboard/lib/loadDashboardInitialData'
import { AttendanceDashboardRoute } from '@/app/dashboard/routes/AttendanceDashboardRoute'

export default async function AttendancePage() {
  const initialData = await loadDashboardInitialData('attendance')
  return <AttendanceDashboardRoute initialData={initialData} />
}
