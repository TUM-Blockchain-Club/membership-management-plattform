import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isLocalDevBypassEnabled } from './lib/devBypass'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const devBypass = isLocalDevBypassEnabled(request.nextUrl.hostname)

  const { pathname, search } = request.nextUrl
  const isRootRoute = pathname === '/'
  const isSigninRoute = pathname === '/signin'
  const isAuthCallbackRoute = pathname.startsWith('/auth/callback')
  const isApiRoute = pathname.startsWith('/api')
  const isPublicRoute = isSigninRoute || isAuthCallbackRoute
  const isProtectedPageRoute = !isPublicRoute && !isApiRoute

  if (devBypass) {
    if (isSigninRoute || isRootRoute) {
      const dashboardUrl = request.nextUrl.clone()
      dashboardUrl.pathname = '/dashboard'
      dashboardUrl.search = ''
      return NextResponse.redirect(dashboardUrl)
    }

    return response
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    if (isRootRoute) {
      const signInUrl = request.nextUrl.clone()
      signInUrl.pathname = '/signin'
      signInUrl.search = ''
      return NextResponse.redirect(signInUrl)
    }

    if (isProtectedPageRoute) {
      const signInUrl = request.nextUrl.clone()
      signInUrl.pathname = '/signin'
      signInUrl.searchParams.set('next', `${pathname}${search}`)
      return NextResponse.redirect(signInUrl)
    }

    return response
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isRootRoute) {
    const targetUrl = request.nextUrl.clone()
    targetUrl.pathname = user ? '/dashboard' : '/signin'
    targetUrl.search = ''
    return NextResponse.redirect(targetUrl)
  }

  if (!user && isProtectedPageRoute) {
    const signInUrl = request.nextUrl.clone()
    signInUrl.pathname = '/signin'
    signInUrl.searchParams.set('next', `${pathname}${search}`)
    return NextResponse.redirect(signInUrl)
  }

  if (user && isSigninRoute) {
    const redirectTarget = request.nextUrl.searchParams.get('next')
    const safeTarget = redirectTarget?.startsWith('/') ? redirectTarget : '/dashboard'
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = safeTarget
    dashboardUrl.search = ''
    return NextResponse.redirect(dashboardUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|webmanifest)$).*)',
  ],
}
