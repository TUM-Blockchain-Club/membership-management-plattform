import { getLocalDevBypassMemberId, isLocalDevBypassEnabled } from "@/lib/devBypass"
import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export type CurrentNftRequestMember = {
  ID: number
  Name: string | null
  Department: string | null
  "TBC Email": string | null
  UUID: string | null
  Role: string | null
  is_Admin: boolean | null
}

export class NftRequestCurrentMemberError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "NftRequestCurrentMemberError"
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

const normalizeCurrentMember = (row: Record<string, unknown> | null): CurrentNftRequestMember | null => {
  if (!row) {
    return null
  }

  const rawId = row.ID ?? row.id
  const normalizedId =
    typeof rawId === "number" ? rawId : typeof rawId === "string" ? Number(rawId) : Number.NaN

  if (!Number.isFinite(normalizedId)) {
    return null
  }

  const rawName = row.Name ?? row.name
  const rawDepartment = row.Department ?? row.department
  const rawEmail = row["TBC Email"] ?? row.tbc_email ?? row.email
  const rawUuid = row.UUID ?? row.uuid
  const rawRole = row.Role ?? row.role
  const rawIsAdmin = row.is_Admin ?? row.is_admin

  return {
    ID: normalizedId,
    Name: typeof rawName === "string" ? rawName : null,
    Department: typeof rawDepartment === "string" ? rawDepartment : null,
    "TBC Email": typeof rawEmail === "string" ? rawEmail : null,
    UUID: typeof rawUuid === "string" ? rawUuid : null,
    Role: typeof rawRole === "string" ? rawRole : null,
    is_Admin: typeof rawIsAdmin === "boolean" ? rawIsAdmin : rawIsAdmin === null ? null : Boolean(rawIsAdmin),
  }
}

const findMemberInMembersMainTable = async (
  client: SupabaseServerClient,
  email: string | null | undefined
) => {
  if (!email?.trim()) {
    return null
  }

  const byEmail = await client
    .from("members_main")
    .select("*")
    .ilike("TBC Email", email)
    .maybeSingle()

  return normalizeCurrentMember(byEmail.data)
}

const findMemberByUser = async (
  client: SupabaseServerClient,
  _userId: string,
  email: string | null | undefined
) => {
  return findMemberInMembersMainTable(client, email)
}

export const resolveCurrentNftRequestMember = async (
  supabase: SupabaseServerClient,
  request?: Request
) => {
  const adminClient = getSupabaseAdminClient()
  const dataClient = (adminClient ?? supabase) as unknown as SupabaseServerClient
  const allowLocalDevBypass = isLocalRequestDevBypassEnabled(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const member = await findMemberByUser(dataClient, user.id, user.email ?? null)
    if (!member) {
      throw new NftRequestCurrentMemberError(
        "Could not resolve the current user to a members_main row.",
        403
      )
    }

    return {
      user,
      member,
      dataClient,
    }
  }

  if (allowLocalDevBypass) {
    const localBypassMember = await dataClient
      .from("members_main")
      .select("*")
      .eq("id", getLocalDevBypassMemberId())
      .maybeSingle()

    const normalizedBypassMember = normalizeCurrentMember(localBypassMember.data)

    if (!normalizedBypassMember) {
      throw new NftRequestCurrentMemberError(
        "Local dev bypass requires the configured members_main row.",
        500
      )
    }

    return {
      user: null,
      member: normalizedBypassMember,
      dataClient,
    }
  }

  throw new NftRequestCurrentMemberError("Not authenticated.", 401)
}
