import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export class AdminAccessError extends Error {
  constructor(message: string, public status: number) { super(message) }
}
export async function requireBoardAdminAccess() {
  const client = await createSupabaseServerClient()
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) throw new AdminAccessError('Sign in to manage admin access.', 401)
  const { data: canManage, error: accessError } = await client.rpc('can_manage_admin_access')
  if (accessError) throw new AdminAccessError('Could not verify board access.', 503)
  if (canManage !== true) throw new AdminAccessError('Only board members can manage admin access.', 403)
  return client
}
