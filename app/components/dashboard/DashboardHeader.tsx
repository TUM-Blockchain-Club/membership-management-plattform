import type { ComponentType, SVGProps } from 'react'
import { BarChart3Icon, CalendarIcon, HexagonIcon, LogOutIcon, UserIcon, UsersIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DashboardMember, DashboardTab } from './types'

type DashboardHeaderProps = {
  member: DashboardMember | null
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  onSignOut: () => void
  onTitleClick: () => void
  canUseMemberViewToggle: boolean
  showNftApprovalsTab: boolean
  forceMemberView: boolean
  onToggleMemberView: (enabled: boolean) => void
}

const TABS: Array<{
  key: DashboardTab
  labelDesktop: string
  labelMobile: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}> = [
  {
    key: 'profile',
    labelDesktop: 'My Profile',
    labelMobile: 'Profile',
    icon: UserIcon,
  },
  {
    key: 'members',
    labelDesktop: 'All Members',
    labelMobile: 'Members',
    icon: UsersIcon,
  },
  {
    key: 'stats',
    labelDesktop: 'Statistics',
    labelMobile: 'Stats',
    icon: BarChart3Icon,
  },
  {
    key: 'events',
    labelDesktop: 'Events',
    labelMobile: 'Events',
    icon: CalendarIcon,
  },
  {
    key: 'nft-approvals',
    labelDesktop: 'NFT Approvals',
    labelMobile: 'NFTs',
    icon: HexagonIcon,
  },
  {
    key: 'nft-status',
    labelDesktop: 'NFT Status',
    labelMobile: 'NFT',
    icon: HexagonIcon,
  },
]

export function DashboardHeader({
  member,
  activeTab,
  onTabChange,
  onSignOut,
  onTitleClick,
  canUseMemberViewToggle,
  showNftApprovalsTab,
  forceMemberView,
  onToggleMemberView,
}: DashboardHeaderProps) {
  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex-1 min-w-0">
          <h1
            className="inline-block transform-gpu origin-left text-2xl sm:text-3xl font-bold text-white cursor-default select-none transition-transform duration-200 hover:scale-105 truncate"
            onClick={onTitleClick}
          >
            Dashboard
          </h1>
          <p className="text-white/60 text-xs sm:text-sm mt-0.5 sm:mt-1 truncate">
            Welcome back, {member?.Name?.split(' ')[0] ?? 'Member'}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          {canUseMemberViewToggle && (
            <Button
              variant={forceMemberView ? 'secondary' : 'outline'}
              size="lg"
              onClick={() => {
                const next = !forceMemberView
                onToggleMemberView(next)
              }}
              className="text-xs sm:text-sm"
            >
              {forceMemberView ? 'Normal Member View: ON' : 'Normal Member View: OFF'}
            </Button>
          )}

          <Button
            variant="outline"
            size="lg"
            onClick={onSignOut}
            className="text-xs sm:text-sm"
          >
            <LogOutIcon data-icon="inline-start" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 sm:pb-4">
        <nav className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0">
          {TABS.filter((tab) => showNftApprovalsTab || tab.key !== 'nft-approvals').map((tab) => {
            const Icon = tab.icon

            return (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'default' : 'ghost'}
              size="lg"
              onClick={() => onTabChange(tab.key)}
              className={`text-xs sm:text-sm flex-shrink-0 ${activeTab === tab.key ? '' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
            >
              <Icon data-icon="inline-start" />
              <span className="hidden sm:inline">{tab.labelDesktop}</span>
              <span className="sm:hidden">{tab.labelMobile}</span>
            </Button>
          )})}
        </nav>
      </div>
    </header>
  )
}
