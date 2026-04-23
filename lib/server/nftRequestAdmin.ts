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

  return {
    ID: normalizedId,
  }
}

const findAdminMemberInTable = async (
  client: SupabaseQueryClient,
  table: "members_main",
  _userId: string,
  email: string | null
) => {
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
      const adminClient = getSupabaseAdminClient()
      const dataClient = (adminClient ?? supabase) as unknown as SupabaseQueryClient
      const localBypassMember = await dataClient
        .from("members_main")
        .select("*")
        .eq("id", "0")
        .maybeSingle()

      const normalizedBypassMember = normalizeAdminMember(localBypassMember.data)
      if (!normalizedBypassMember || ![0, 99, 107, 26].includes(normalizedBypassMember.ID)) {
        throw new NftRequestAdminError("You are not allowed to manage NFT requests.", 403)
      }

      return { user: null }
    }

    throw new NftRequestAdminError("Not authenticated.", 401)
  }

  const adminMember = await findAdminMember(supabase, user.id, user.email ?? null)
  const isAdmin = Boolean(adminMember && [0, 99, 107].includes(adminMember.ID))

  if (!isAdmin) {
    throw new NftRequestAdminError("You are not allowed to manage NFT requests.", 403)
  }

  return { user }
}
