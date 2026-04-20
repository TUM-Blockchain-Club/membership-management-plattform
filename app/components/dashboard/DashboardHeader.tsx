import type { ReactNode } from 'react'
import type { DashboardMember, DashboardTab } from './types'

type DashboardHeaderProps = {
  member: DashboardMember | null
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  onSignOut: () => void
  onTitleClick: () => void
  canUseMemberViewToggle: boolean
  forceMemberView: boolean
  onToggleMemberView: (enabled: boolean) => void
  onProfileTabSelected: () => void
}

const TABS: Array<{
  key: DashboardTab
  labelDesktop: string
  labelMobile: string
  icon: ReactNode
}> = [
  {
    key: 'profile',
    labelDesktop: 'My Profile',
    labelMobile: 'Profile',
    icon: (
      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    key: 'members',
    labelDesktop: 'All Members',
    labelMobile: 'Members',
    icon: (
      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    key: 'stats',
    labelDesktop: 'Statistics',
    labelMobile: 'Stats',
    icon: (
      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key: 'events',
    labelDesktop: 'Events',
    labelMobile: 'Events',
    icon: (
      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: 'nft-approvals',
    labelDesktop: 'NFT Approvals',
    labelMobile: 'NFTs',
    icon: (
      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
]

export function DashboardHeader({
  member,
  activeTab,
  onTabChange,
  onSignOut,
  onTitleClick,
  canUseMemberViewToggle,
  forceMemberView,
  onToggleMemberView,
  onProfileTabSelected,
}: DashboardHeaderProps) {
  return (
    <header className="border-b border-white/10 backdrop-blur-md sticky top-0 z-50">
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
            <button
              onClick={() => {
                const next = !forceMemberView
                onToggleMemberView(next)
                onProfileTabSelected()
              }}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm border rounded-lg transition-all duration-200 whitespace-nowrap ${
                forceMemberView
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300 hover:bg-blue-600/30'
                  : 'bg-white/5 border-white/20 text-white/80 hover:text-white hover:border-white/40'
              }`}
            >
              {forceMemberView ? 'Normal Member View: ON' : 'Normal Member View: OFF'}
            </button>
          )}

          <button
            onClick={onSignOut}
            className="px-4 sm:px-6 py-2 text-xs sm:text-sm text-white/80 hover:text-white border border-white/20 hover:border-white/40 rounded-lg transition-all duration-200 whitespace-nowrap"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 sm:pb-4">
        <nav className="flex gap-1 sm:gap-2 overflow-x-auto scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                {tab.icon}
                <span className="hidden sm:inline">{tab.labelDesktop}</span>
                <span className="sm:hidden">{tab.labelMobile}</span>
              </div>
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
