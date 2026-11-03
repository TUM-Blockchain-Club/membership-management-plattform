import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { canManageBoardTools } from "@/lib/member-permissions"

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

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

  const { data: hasSpecialAccess, error: accessError } = await supabase.rpc("has_special_access")

  if (accessError) {
    throw new EventAdminError("Could not verify event admin access.", 500)
  }

  const dataClient = getSupabaseAdminClient() ?? supabase
  const { data: member, error: memberError } = await dataClient
    .from('members_main')
    .select('id, Role')
    .ilike('TBC Email', user.email ?? '')
    .maybeSingle()

  if (memberError) {
    throw new EventAdminError("Could not verify member role.", 500)
  }

  if (!canManageBoardTools(member, hasSpecialAccess === true)) {
    throw new EventAdminError("You are not allowed to manage events.", 403)
  }

  return { user, dataClient }
}
