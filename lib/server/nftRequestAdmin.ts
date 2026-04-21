import { isLocalDevBypassEnabled } from "@/lib/devBypass"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

type AdminMemberRow = {
  ID: number
  Role: string | null
  is_Admin: boolean | null
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
  if (!request) {
    return false
  }

  try {
    return isLocalDevBypassEnabled(new URL(request.url).hostname)
  } catch {
    return false
  }
}

const findAdminMember = async (supabase: SupabaseServerClient, userId: string, email: string | null) => {
  const byUuid = await supabase
    .from("Members")
    .select('"ID", "Role", "is_Admin"')
    .eq("UUID", userId)
    .maybeSingle()

  if (byUuid.data) {
    return byUuid.data as AdminMemberRow
  }

  if (!email) {
    return null
  }

  const byEmail = await supabase
    .from("Members")
    .select('"ID", "Role", "is_Admin"')
    .ilike("TBC Email", email)
    .maybeSingle()

  return (byEmail.data as AdminMemberRow | null) ?? null
}

export const requireNftRequestAdmin = async (supabase: SupabaseServerClient, request?: Request) => {
  const allowLocalDevBypass = isLocalRequestDevBypassEnabled(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (allowLocalDevBypass) {
      return { user: null }
    }

    throw new NftRequestAdminError("Not authenticated.", 401)
  }

  const adminMember = await findAdminMember(supabase, user.id, user.email ?? null)
  const isAdmin = Boolean(adminMember?.is_Admin) || adminMember?.Role === "Board Member"

  if (!isAdmin && !allowLocalDevBypass) {
    throw new NftRequestAdminError("You are not allowed to manage NFT requests.", 403)
  }

  return { user }
}
