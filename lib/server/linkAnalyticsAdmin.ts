import 'server-only'

import { isLocalDevBypassEnabled, hasLocalDevBypassSpecialAccess } from '@/lib/devBypass'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>
type SupabaseQueryClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string | number) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message?: string } | null }>
      }
      ilike: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message?: string } | null }>
      }
    }
  }
  rpc: (fn: string) => Promise<{ data: unknown; error: { message?: string } | null }>
}

export class LinkAnalyticsAdminError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'LinkAnalyticsAdminError'
    this.status = status
  }
}

const isLocalRequestDevBypassEnabled = (request?: Request) => {
  if (!request) return false

  try {
    return isLocalDevBypassEnabled(new URL(request.url).hostname)
  } catch {
    return false
  }
}

const isBoardMemberRow = (row: Record<string, unknown> | null) =>
  typeof row?.Role === 'string' && row.Role.trim() === 'Board Member'

export const requireLinkAnalyticsAdmin = async (
  supabase: SupabaseServerClient,
  request?: Request
) => {
  const adminClient = getSupabaseAdminClient()
  const dataClient = adminClient ?? supabase
  const allowLocalDevBypass = isLocalRequestDevBypassEnabled(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (!allowLocalDevBypass) {
      throw new LinkAnalyticsAdminError('Not authenticated.', 401)
    }

    const { data: localMember, error } = await (dataClient as unknown as SupabaseQueryClient)
      .from('members_main')
      .select('id, Role')
      .eq('id', 0)
      .maybeSingle()

    if (error || (!isBoardMemberRow(localMember) && !hasLocalDevBypassSpecialAccess())) {
      throw new LinkAnalyticsAdminError('You are not allowed to view link analytics.', 403)
    }

    return { user: null, dataClient }
  }

  const [{ data: hasSpecialAccess, error: accessError }, { data: member, error: memberError }] =
    await Promise.all([
      (supabase as unknown as SupabaseQueryClient).rpc('has_special_access'),
      (dataClient as unknown as SupabaseQueryClient)
        .from('members_main')
        .select('id, Role, Name, "TBC Email"')
        .ilike('TBC Email', user.email ?? '')
        .maybeSingle(),
    ])

  if (accessError) {
    throw new LinkAnalyticsAdminError('Could not verify special access.', 500)
  }

  if (memberError) {
    throw new LinkAnalyticsAdminError('Could not verify member role.', 500)
  }

  if (!isBoardMemberRow(member) && hasSpecialAccess !== true) {
    throw new LinkAnalyticsAdminError('You are not allowed to view link analytics.', 403)
  }

  return { user, dataClient }
}
