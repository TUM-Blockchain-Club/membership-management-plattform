import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { hasLocalDevBypassSpecialAccess, isLocalDevBypassEnabled } from '@/lib/devBypass'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>
type NewsletterAuthUser = { id: string; email?: string | null }

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

const redactEmail = (email: string | null | undefined) => {
  if (!email) return null
  const [local, domain] = email.split('@')
  if (!local || !domain) return 'invalid-email'
  return `${local.slice(0, 2)}***@${domain}`
}

const logNewsletterAuth = (level: 'info' | 'warn', event: string, data: Record<string, unknown>) => {
  const shouldLogInfo = process.env.NODE_ENV !== 'production' || process.env.NEWSLETTER_DEBUG_LOGS === 'true'
  const payload = { event, ...data }
  if (level === 'warn') {
    console.warn('[newsletter-auth]', payload)
    return
  }

  if (!shouldLogInfo) return

  console.info('[newsletter-auth]', payload)
}

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
  const [scheme, ...tokenParts] = authHeader?.split(' ') ?? []
  const token = tokenParts.join(' ').trim()

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
    accessToken: async () => accessToken,
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as unknown as SupabaseClient
}

const getSupabaseEnv = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return { supabaseUrl, supabaseKey }
}

const validateBearerToken = async (accessToken: string) => {
  const { supabaseUrl, supabaseKey } = getSupabaseEnv()
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    return { user: null, error: `Auth user lookup failed with ${response.status}` }
  }

  const user = (await response.json()) as NewsletterAuthUser
  return { user, error: null }
}

const getDebugId = (request?: Request) =>
  request?.headers.get('x-newsletter-request-id') ?? crypto.randomUUID()

const getRequestHost = (request?: Request) => {
  if (!request) return null

  try {
    return new URL(request.url).host
  } catch {
    return null
  }
}

export async function requireNewsletterAccess(
  supabase: SupabaseClient,
  request?: Request
): Promise<AuthResult> {
  const debugId = getDebugId(request)
  const bearerToken = getBearerToken(request)
  const cookieHeader = request?.headers.get('cookie') ?? ''

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  let dataClient = supabase
  let authUser: NewsletterAuthUser | null = user ? { id: user.id, email: user.email } : null

  logNewsletterAuth('info', 'start', {
    debugId,
    host: getRequestHost(request),
    hasCookieHeader: Boolean(cookieHeader),
    cookieHeaderLength: cookieHeader.length,
    hasAuthorizationHeader: Boolean(request?.headers.get('authorization')),
    bearerPresent: Boolean(bearerToken),
    cookieUser: Boolean(user?.email),
    cookieUserEmail: redactEmail(user?.email),
    cookieAuthError: error?.message ?? null,
  })

  if (!authUser?.email) {
    if (bearerToken) {
      const { user: bearerUser, error: bearerError } = await validateBearerToken(bearerToken)

      if (bearerUser?.email) {
        authUser = bearerUser
        dataClient = createBearerSupabaseClient(bearerToken)
      }

      logNewsletterAuth(bearerUser?.email ? 'info' : 'warn', 'bearer-validated', {
        debugId,
        bearerUser: Boolean(bearerUser?.email),
        bearerUserEmail: redactEmail(bearerUser?.email),
        bearerError,
      })
    }
  }

  if (!authUser?.email) {
    if (!isLocalRequestDevBypassEnabled(request) || !hasLocalDevBypassSpecialAccess()) {
      logNewsletterAuth('warn', 'unauthorized', {
        debugId,
        reason: 'no-cookie-user-or-valid-bearer-user',
        bearerPresent: Boolean(bearerToken),
      })
      return { error: `Unauthorized. Debug ID: ${debugId}`, status: 401, user: null }
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

  logNewsletterAuth('info', 'checking-access', {
    debugId,
    userEmail: redactEmail(authUser.email),
    source: user?.email ? 'cookie' : 'bearer',
  })

  const { data: hasAccess, error: accessError } = await dataClient.rpc('check_email_can_manage_newsletter', {
    check_email: authUser.email,
  })

  if (accessError) {
    logNewsletterAuth('warn', 'access-error', {
      debugId,
      message: accessError.message,
    })
    return { error: 'Could not verify newsletter access.', status: 500, user: null }
  }

  if (!hasAccess) {
    logNewsletterAuth('warn', 'forbidden', {
      debugId,
      userEmail: redactEmail(authUser.email),
    })
    return { error: 'Forbidden', status: 403, user: null }
  }

  logNewsletterAuth('info', 'authorized', {
    debugId,
    userEmail: redactEmail(authUser.email),
  })

  return {
    error: null,
    status: 200,
    user: { id: authUser.id, email: authUser.email },
    dataClient,
    ownerId: authUser.id,
    isLocalDevBypass: false,
  }
}
