import { getLocalDevBypassMemberId, isLocalDevBypassEnabled } from "@/lib/devBypass"
import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

type AdminMemberRow = {
  ID: number
  Role: string | null
}

export class NftRequestAdminError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "NftRequestAdminError"
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

const normalizeAdminMember = (row: Record<string, unknown> | null): AdminMemberRow | null => {
  if (!row) return null

  const rawId = row.ID ?? row.id
  const id = typeof rawId === "number" ? rawId : typeof rawId === "string" ? Number(rawId) : Number.NaN
  if (!Number.isFinite(id)) return null

  const rawRole = row.Role ?? row.role
  return {
    ID: id,
    Role: typeof rawRole === "string" ? rawRole : null,
  }
}

const hasNftAdminAccess = async (client: SupabaseServerClient, member: AdminMemberRow) => {
  if (member.Role?.trim() === "Board Member") return true

  const { data } = await client
    .from("nft_admins")
    .select("member_id")
    .eq("member_id", member.ID)
    .maybeSingle()

  return Boolean(data)
}

export const requireNftRequestAdmin = async (supabase: SupabaseServerClient, request?: Request) => {
  const dataClient = (getSupabaseAdminClient() ?? supabase) as unknown as SupabaseServerClient
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let member: AdminMemberRow | null = null

  if (user?.email) {
    const { data } = await dataClient
      .from("members_main")
      .select("id, Role")
      .ilike("TBC Email", user.email)
      .maybeSingle()
    member = normalizeAdminMember(data)
  } else if (isLocalRequestDevBypassEnabled(request)) {
    const { data } = await dataClient
      .from("members_main")
      .select("id, Role")
      .eq("id", getLocalDevBypassMemberId())
      .maybeSingle()
    member = normalizeAdminMember(data)
  } else {
    throw new NftRequestAdminError("Not authenticated.", 401)
  }

  if (!member || !(await hasNftAdminAccess(dataClient, member))) {
    throw new NftRequestAdminError("You are not allowed to manage NFT requests.", 403)
  }

  return { user, member }
}
