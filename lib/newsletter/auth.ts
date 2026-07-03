import 'server-only'

import { createClient } from '@supabase/supabase-js'
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

const getBearerToken = (request?: Request) => {
  const authHeader = request?.headers.get('authorization')
  const [scheme, token] = authHeader?.split(' ') ?? []

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null
  }

  return token
}

const createBearerSupabaseClient = (accessToken: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  }) as unknown as SupabaseClient
}

export async function requireNewsletterAccess(
  supabase: SupabaseClient,
  request?: Request
): Promise<AuthResult> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  let dataClient = supabase
  let authUser = user

  if (!authUser?.email) {
    const accessToken = getBearerToken(request)

    if (accessToken) {
      const bearerClient = createBearerSupabaseClient(accessToken)
      const {
        data: { user: bearerUser },
      } = await bearerClient.auth.getUser(accessToken)

      if (bearerUser?.email) {
        authUser = bearerUser
        dataClient = bearerClient
      }
    }
  }

  if (!authUser?.email) {
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

  const { data: hasAccess, error: accessError } = await dataClient.rpc('check_email_can_manage_newsletter', {
    check_email: authUser.email,
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
    user: { id: authUser.id, email: authUser.email },
    dataClient,
    ownerId: authUser.id,
    isLocalDevBypass: false,
  }
}
