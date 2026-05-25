import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

type MemberAccessRow = {
  Role?: string | null
  "TBC Email"?: string | null
}

export class EventAdminError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "EventAdminError"
    this.status = status
  }
}

export const requireEventAdmin = async (supabase: SupabaseServerClient) => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new EventAdminError("Not authenticated.", 401)
  }

  const dataClient = getSupabaseAdminClient() ?? supabase
  const [{ data: member, error: memberError }, { data: hasSpecialAccess }] = await Promise.all([
    dataClient
      .from("members_main")
      .select('Role, "TBC Email"')
      .ilike("TBC Email", user.email ?? "")
      .maybeSingle(),
    supabase.rpc("has_special_access"),
  ])

  if (memberError) {
    throw new EventAdminError("Could not verify event admin access.", 500)
  }

  const typedMember = member as MemberAccessRow | null
  const isBoardMember = typedMember?.Role === "Board Member"

  if (!isBoardMember && hasSpecialAccess !== true) {
    throw new EventAdminError("You are not allowed to manage events.", 403)
  }

  return { user, dataClient }
}
