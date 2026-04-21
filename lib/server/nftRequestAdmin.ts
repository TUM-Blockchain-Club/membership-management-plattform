import { isLocalDevBypassEnabled } from "@/lib/devBypass"
import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>
type SupabaseQueryClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>
      }
      ilike: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>
      }
    }
  }
}

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

const normalizeAdminMember = (row: Record<string, unknown> | null): AdminMemberRow | null => {
  if (!row) {
    return null
  }

  const rawId = row.ID ?? row.id
  const normalizedId =
    typeof rawId === "number" ? rawId : typeof rawId === "string" ? Number(rawId) : Number.NaN

  if (!Number.isFinite(normalizedId)) {
    return null
  }

  const rawRole = row.Role ?? row.role
  const rawIsAdmin = row.is_Admin ?? row.is_admin

  return {
    ID: normalizedId,
    Role: typeof rawRole === "string" ? rawRole : null,
    is_Admin: typeof rawIsAdmin === "boolean" ? rawIsAdmin : rawIsAdmin === null ? null : Boolean(rawIsAdmin),
  }
}

const findAdminMemberInTable = async (
  client: SupabaseQueryClient,
  table: "Members" | "members_main",
  userId: string,
  email: string | null
) => {
  if (table === "Members") {
    const byUuid = await client
      .from("Members")
      .select("*")
      .eq("UUID", userId)
      .maybeSingle()

    const normalizedByUuid = normalizeAdminMember(byUuid.data)
    if (normalizedByUuid) {
      return normalizedByUuid
    }
  }

  if (!email) {
    return null
  }

  const byEmail = await client
    .from(table)
    .select("*")
    .ilike("TBC Email", email)
    .maybeSingle()

  return normalizeAdminMember(byEmail.data)
}

const findAdminMember = async (supabase: SupabaseServerClient, userId: string, email: string | null) => {
  const clients: SupabaseQueryClient[] = []
  const adminClient = getSupabaseAdminClient()

  if (adminClient) {
    clients.push(adminClient as unknown as SupabaseQueryClient)
  }

  clients.push(supabase as unknown as SupabaseQueryClient)

  for (const client of clients) {
    const fromMembers = await findAdminMemberInTable(client, "Members", userId, email)
    if (fromMembers) {
      return fromMembers
    }

    const fromMembersMain = await findAdminMemberInTable(client, "members_main", userId, email)
    if (fromMembersMain) {
      return fromMembersMain
    }
  }

  return null
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
