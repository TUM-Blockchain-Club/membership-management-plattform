import { loadDashboardInitialData } from '@/app/dashboard/lib/loadDashboardInitialData'
import { StatisticsDashboardRoute } from '@/app/dashboard/routes/StatisticsDashboardRoute'

export default async function StatisticsPage() {
  const initialData = await loadDashboardInitialData('stats')
  return <StatisticsDashboardRoute initialData={initialData} />
}
