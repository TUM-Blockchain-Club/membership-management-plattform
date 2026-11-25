import { getLocalDevBypassMemberId, hasLocalDevBypassSpecialAccess, isLocalDevBypassEnabled } from '@/lib/devBypass'
import { canManageBoardTools, canManageNftRequests } from '@/lib/member-permissions'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>
type AdminMember = { id: number; Role: string | null }

export class NftRequestAdminError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'NftRequestAdminError'
    this.status = status
  }
}

const hasNftAssignment = async (client: SupabaseServerClient, memberId: number) => {
  const { data, error } = await client.from('nft_admins').select('member_id').eq('member_id', memberId).maybeSingle()
  if (error) throw new NftRequestAdminError('Could not verify NFT admin access.', 500)
  return Boolean(data)
}

export const requireNftRequestAdmin = async (supabase: SupabaseServerClient, request?: Request) => {
  const { data: { user } } = await supabase.auth.getUser()
  const dataClient = (getSupabaseAdminClient() ?? supabase) as SupabaseServerClient
  let member: AdminMember | null
  let hasSpecialAccess: boolean

  if (!user) {
    const localBypass = request && isLocalDevBypassEnabled(new URL(request.url).hostname)
    if (!localBypass) throw new NftRequestAdminError('Not authenticated.', 401)

    const { data, error } = await dataClient.from('members_main')
      .select('id, Role').eq('id', getLocalDevBypassMemberId()).maybeSingle()
    if (error) throw new NftRequestAdminError('Could not verify member role.', 500)
    member = data as AdminMember | null
    hasSpecialAccess = hasLocalDevBypassSpecialAccess()
  } else {
    const [{ data: specialAccess, error: accessError }, { data, error: memberError }] = await Promise.all([
      supabase.rpc('has_special_access'),
      dataClient.from('members_main').select('id, Role').ilike('TBC Email', user.email ?? '').maybeSingle(),
    ])
    if (accessError || memberError) {
      throw new NftRequestAdminError('Could not verify NFT admin access.', 500)
    }
    member = data as AdminMember | null
    hasSpecialAccess = specialAccess === true
  }

  const assigned = member && !canManageBoardTools(member, hasSpecialAccess)
    ? await hasNftAssignment(dataClient, member.id)
    : false
  if (!canManageNftRequests(member, hasSpecialAccess, assigned)) {
    throw new NftRequestAdminError('You are not allowed to manage NFT requests.', 403)
  }
  return { user, member }
}
