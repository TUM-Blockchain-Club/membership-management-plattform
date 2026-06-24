import { createSupabaseServerClient } from '@/lib/supabase/server'
import { hasLocalDevBypassSpecialAccess } from '@/lib/devBypass'

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

type AuthSuccess = { error: null; status: 200; user: { id: string; email: string } }
type AuthFailure = { error: string; status: 401 | 403; user: null }
type AuthResult = AuthSuccess | AuthFailure

export async function requireNewsletterAccess(supabase: SupabaseClient): Promise<AuthResult> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user?.email) {
    return { error: 'Unauthorized', status: 401, user: null }
  }

  const { data: hasAccess } = await supabase.rpc('check_email_has_special_access', {
    check_email: user.email,
  })

  if (!hasAccess && !hasLocalDevBypassSpecialAccess()) {
    return { error: 'Forbidden', status: 403, user: null }
  }

  return { error: null, status: 200, user: { id: user.id, email: user.email } }
}
