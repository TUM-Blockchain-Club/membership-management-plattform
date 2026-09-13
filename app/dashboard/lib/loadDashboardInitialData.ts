import 'server-only'
import { cache } from 'react'
import type { DashboardInitialData } from './initialDataTypes'
import { getRequestMember } from '@/lib/server/requestMember'
import { hasLocalDevBypassSpecialAccess } from '@/lib/devBypass'
import { coffeeChatsDemoEnabled, demoDashboardMember } from '@/lib/coffee-chats'

export const loadDashboardInitialData = cache(async (): Promise<DashboardInitialData> => {
  if (coffeeChatsDemoEnabled) return {
    allMembers: [], events: [], member: demoDashboardMember, message: null,
    canManageCoffeeChats: true, canManageNewsletter: true, canManageNftRequests: false,
    hasSpecialAccess: true, viewedMemberHasSpecialAccess: true,
  }
  const { member, user, supabase, dataClient, isDevBypass, error } = await getRequestMember()
  if (!member) return {
    allMembers: [], events: [], member: null, canManageNftRequests: false,
    hasSpecialAccess: false, viewedMemberHasSpecialAccess: false,
    message: { type: 'error', text: error ? 'Could not load your member profile. Please try again.' : 'Sign in with your member account to view the dashboard.' },
  }
  const email = user?.email ?? member['TBC Email'] ?? ''
  const [special, coffee, newsletter, nft] = await Promise.all([
    supabase.rpc('has_special_access'),
    supabase.rpc('check_email_can_manage_coffee_chats', { check_email: email }),
    supabase.rpc('check_email_can_manage_newsletter', { check_email: email }),
    isDevBypass
      ? dataClient.from('nft_admins').select('member_id').eq('member_id', member.id).maybeSingle().then(({ data }) => ({ data: member.Role?.trim() === 'Board Member' || Boolean(data) }))
      : supabase.rpc('can_manage_nft_requests'),
  ])
  const hasSpecialAccess = special.data === true || (isDevBypass && hasLocalDevBypassSpecialAccess())
  return {
    allMembers: [], events: [], member, message: null, hasSpecialAccess,
    viewedMemberHasSpecialAccess: hasSpecialAccess,
    canManageCoffeeChats: coffee.data === true || (isDevBypass && hasLocalDevBypassSpecialAccess()),
    canManageNewsletter: newsletter.data === true, canManageNftRequests: nft.data === true,
  }
})
