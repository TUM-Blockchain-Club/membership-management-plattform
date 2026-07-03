import 'server-only'

import { hasLocalDevBypassSpecialAccess, isLocalDevBypassEnabled } from '@/lib/devBypass'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

type AuthSuccess = {
  error: null
  status: 200
  user: { id: string; email: string } | null
  dataClient: SupabaseClient
  ownerId: string | null
  isLocalDevBypass: boolean
}
type AuthFailure = { error: string; status: 401 | 403 | 500; user: null }
type AuthResult = AuthSuccess | AuthFailure

const isLocalRequestDevBypassEnabled = (request?: Request) => {
  if (!request) return false

  try {
    return isLocalDevBypassEnabled(new URL(request.url).hostname)
  } catch {
    return false
  }
}

export async function requireNewsletterAccess(
  supabase: SupabaseClient,
  request?: Request
): Promise<AuthResult> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!user?.email) {
    if (!isLocalRequestDevBypassEnabled(request) || !hasLocalDevBypassSpecialAccess()) {
      return { error: error ? 'Unauthorized' : 'Unauthorized', status: 401, user: null }
    }

    const adminClient = getSupabaseAdminClient()
    if (!adminClient) {
      return { error: 'Local newsletter bypass requires SUPABASE_SERVICE_ROLE_KEY.', status: 500, user: null }
    }

    return {
      error: null,
      status: 200,
      user: null,
      dataClient: adminClient as unknown as SupabaseClient,
      ownerId: null,
      isLocalDevBypass: true,
    }
  }

  const { data: hasAccess, error: accessError } = await supabase.rpc('check_email_can_manage_newsletter', {
    check_email: user.email,
  })

  if (accessError) {
    return { error: 'Could not verify newsletter access.', status: 500, user: null }
  }

  if (!hasAccess) {
    return { error: 'Forbidden', status: 403, user: null }
  }

  return {
    error: null,
    status: 200,
    user: { id: user.id, email: user.email },
    dataClient: supabase,
    ownerId: user.id,
    isLocalDevBypass: false,
  }
}
