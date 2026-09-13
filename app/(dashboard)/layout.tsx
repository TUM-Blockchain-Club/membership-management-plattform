import { loadDashboardInitialData } from '@/app/dashboard/lib/loadDashboardInitialData'
import { DashboardShell } from './DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // The persistent shell needs identity and permissions, not every tab's data.
  const initialData = await loadDashboardInitialData()

  return <DashboardShell initialData={initialData}>{children}</DashboardShell>
}
