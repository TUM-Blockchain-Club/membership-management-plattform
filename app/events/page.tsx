import { loadDashboardInitialData } from '@/app/dashboard/lib/loadDashboardInitialData'
import { EventsDashboardRoute } from '@/app/dashboard/routes/EventsDashboardRoute'

export default async function EventsPage() {
  const initialData = await loadDashboardInitialData('events')
  return <EventsDashboardRoute initialData={initialData} />
}
