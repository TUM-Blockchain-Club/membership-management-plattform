import { getSupabaseAdminClient } from "@/lib/server/supabaseAdmin"
import { createSupabaseServerClient } from "@/lib/supabase/server"

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

  if (hasSpecialAccess !== true) {
    throw new EventAdminError("You are not allowed to manage events.", 403)
  }

  const dataClient = getSupabaseAdminClient() ?? supabase

  return { user, dataClient }
}
