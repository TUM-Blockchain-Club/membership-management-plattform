import { Building2Icon, UserCheckIcon, UserRoundIcon, UsersIcon } from 'lucide-react'
import { DepartmentBreakdown, StatusBreakdown } from '@/app/components/dashboard/Breakdowns'
import { StatCard } from '@/app/components/dashboard/StatCard'
import type { DashboardMember, DashboardStats } from '@/app/components/dashboard/types'

export function StatsPage({ stats, membersVisibleByRole }: { stats: DashboardStats; membersVisibleByRole: DashboardMember[] }) {
  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-white sm:mb-6 sm:text-2xl">Organization Statistics</h2>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 md:gap-6 lg:grid-cols-4">
        <StatCard title="Total Members" value={stats.total} icon={<UsersIcon className="size-5 sm:size-6 md:size-8" />} color="blue" />
        <StatCard title="Active Members" value={stats.active} icon={<UserCheckIcon className="size-5 sm:size-6 md:size-8" />} color="green" />
        <StatCard title="Departments" value={stats.departments} icon={<Building2Icon className="size-5 sm:size-6 md:size-8" />} color="purple" />
        <StatCard title="Ex-Core Members" value={stats.exCore} icon={<UserRoundIcon className="size-5 sm:size-6 md:size-8" />} color="orange" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <DepartmentBreakdown members={membersVisibleByRole.filter((member) => member.Status === 'Active')} />
        <StatusBreakdown members={membersVisibleByRole} />
      </div>
    </div>
  )
}
