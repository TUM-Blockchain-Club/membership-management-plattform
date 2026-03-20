import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
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

  const { pathname, search } = request.nextUrl
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isSigninRoute = pathname === '/signin'

  if (!user && isDashboardRoute) {
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
  matcher: ['/dashboard/:path*', '/signin'],
}
