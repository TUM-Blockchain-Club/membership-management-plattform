import type { DashboardTab } from '@/app/components/dashboard/types'

export const TAB_ROUTES: Record<DashboardTab, string> = {
  home: '/home',
  profile: '/profile',
  'coffee-chats': '/coffee-chats',
  members: '/members',
  stats: '/statistics',
  events: '/events',
  'link-analytics': '/link-analytics',
  'nft-approvals': '/nft-approvals',
  'nft-status': '/nft-status',
  newsletter: '/newsletter',
  attendance: '/attendance',
}

const PATHNAME_TO_TAB: Record<string, DashboardTab> = {
  '/home': 'home',
  '/coffee-chats': 'coffee-chats',
  '/events': 'events',
  '/link-analytics': 'link-analytics',
  '/members': 'members',
  '/newsletter': 'newsletter',
  '/nft-approvals': 'nft-approvals',
  '/nft-status': 'nft-status',
  '/profile': 'profile',
  '/statistics': 'stats',
  '/attendance': 'attendance',
}

export function getDashboardTabForPathname(pathname: string): DashboardTab {
  if (pathname === '/coffee-chats' || pathname.startsWith('/coffee-chats/')) {
    return 'coffee-chats'
  }

  if (pathname === '/link-analytics' || pathname.startsWith('/link-analytics/')) {
    return 'link-analytics'
  }

  return PATHNAME_TO_TAB[pathname] ?? 'home'
}
