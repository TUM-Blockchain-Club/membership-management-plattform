import { getLocalDevBypassMemberId, hasLocalDevBypassSpecialAccess, isLocalDevBypassEnabled } from '@/lib/devBypass'
import { canManageNftRequests } from '@/lib/member-permissions'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export class NftRequestAdminError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'NftRequestAdminError'
    this.status = status
  }
}

export const requireNftRequestAdmin = async (supabase: SupabaseServerClient, request?: Request) => {
  const { data: { user } } = await supabase.auth.getUser()
  const dataClient = getSupabaseAdminClient() ?? supabase

  if (!user) {
    const localBypass = request && isLocalDevBypassEnabled(new URL(request.url).hostname)
    if (!localBypass) throw new NftRequestAdminError('Not authenticated.', 401)

    const { data: member, error } = await dataClient.from('members_main')
      .select('id, Role').eq('id', getLocalDevBypassMemberId()).maybeSingle()
    if (error) throw new NftRequestAdminError('Could not verify member role.', 500)
    if (!canManageNftRequests(member, hasLocalDevBypassSpecialAccess())) {
      throw new NftRequestAdminError('You are not allowed to manage NFT requests.', 403)
    }
    return { user: null }
  }

  const [{ data: specialAccess, error: accessError }, { data: member, error: memberError }] = await Promise.all([
    supabase.rpc('has_special_access'),
    dataClient.from('members_main').select('id, Role').ilike('TBC Email', user.email ?? '').maybeSingle(),
  ])
  if (accessError || memberError) {
    throw new NftRequestAdminError('Could not verify NFT admin access.', 500)
  }
  if (!canManageNftRequests(member, specialAccess === true)) {
    throw new NftRequestAdminError('You are not allowed to manage NFT requests.', 403)
  }
  return { user }
}
