import type { DashboardTab } from '@/app/components/dashboard/types'

export const TAB_ROUTES: Record<DashboardTab, string> = {
  profile: '/profile',
  'email-signature': '/email-signature',
  members: '/members',
  stats: '/statistics',
  events: '/events',
  'link-analytics': '/link-analytics',
  'nft-approvals': '/nft-approvals',
  'nft-status': '/nft-status',
  newsletter: '/newsletter',
}
