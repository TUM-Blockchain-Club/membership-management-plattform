import 'server-only'
import { cache } from 'react'
import { headers } from 'next/headers'
import type { DashboardMember } from '@/app/components/dashboard/types'
import { createSupabaseServerClient, getSupabaseUser } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { getLocalDevBypassMemberId, isLocalDevBypassEnabled } from '@/lib/devBypass'

export const MEMBER_COLUMNS =
  'id, created_at, Name, Role, Status, Department, "Project/Task", "Area of Expertise", Picture, Uni, "Semester Joined", Degree, Phone, "Private Email", "TBC Email", Linkedin, Telegram, Discord, Instagram, Twitter, "Size Merch"'

type RequestMember = DashboardMember & { cc_active: boolean | null; cc_interests: string[] | null }

// React cache lasts for one server render/request, never across users.
export const getRequestMember = cache(async () => {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await getSupabaseUser()
  const host = (await headers()).get('host')?.split(':')[0] ?? ''
  const isDevBypass = !user && isLocalDevBypassEnabled(host)
  const dataClient = isDevBypass ? getSupabaseAdminClient() ?? supabase : supabase
  if ((!user || authError) && !isDevBypass) return { supabase, dataClient, user: null, member: null, isDevBypass, error: authError }
  if (!isDevBypass && !user?.email) return { supabase, dataClient, user, member: null, isDevBypass, error: null }
  const query = dataClient.from('members_main').select(MEMBER_COLUMNS + ', cc_active, cc_interests')
  const { data, error } = await (isDevBypass
    ? query.eq('id', getLocalDevBypassMemberId())
    : query.ilike('TBC Email', user!.email!)).maybeSingle()
  return { supabase, dataClient, user, member: error ? null : data as RequestMember | null, isDevBypass, error }
})
