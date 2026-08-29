import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  GMAIL_PROVIDER_TOKEN_COOKIE,
  GMAIL_PROVIDER_TOKEN_COOKIE_PATH,
} from '@/lib/email-signature/constants'

async function createAuthCallbackClient(response: NextResponse) {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next')
  const nextPath = nextParam?.startsWith('/') && !nextParam.startsWith('//')
    ? nextParam
    : '/dashboard'
  const redirectUrl = new URL(nextPath, requestUrl.origin)
  const isGmailAuthorization = redirectUrl.pathname === '/email-signature'

  if (code) {
    const response = NextResponse.redirect(redirectUrl)
    const supabase = await createAuthCallbackClient(response)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("🚨 SUPABASE AUTH ERROR:", error.message, error.name)
    }

    if (!error) {
      if (isGmailAuthorization && data.session.provider_token) {
        response.cookies.set(GMAIL_PROVIDER_TOKEN_COOKIE, data.session.provider_token, {
          httpOnly: true,
          maxAge: 5 * 60,
          path: GMAIL_PROVIDER_TOKEN_COOKIE_PATH,
          sameSite: 'lax',
          secure: requestUrl.protocol === 'https:',
        })
      }
      return response
    }
  }

  if (isGmailAuthorization) {
    const deniedUrl = new URL('/email-signature', requestUrl.origin)
    deniedUrl.searchParams.set('gmail', 'denied')
    return NextResponse.redirect(deniedUrl)
  }

  const signInUrl = new URL('/signin', requestUrl.origin)
  signInUrl.searchParams.set('error', 'oauth_callback')
  return NextResponse.redirect(signInUrl)
}
