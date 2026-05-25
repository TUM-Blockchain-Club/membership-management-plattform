import { loadDashboardInitialData } from '@/app/dashboard/lib/loadDashboardInitialData'
import { DashboardShell } from './DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Load ALL tab data once. The layout persists across tab navigations so we
  // need members (for members + stats tabs) AND events (for events tab) up front.
  const initialData = await loadDashboardInitialData('all')

  return <DashboardShell initialData={initialData}>{children}</DashboardShell>
}
