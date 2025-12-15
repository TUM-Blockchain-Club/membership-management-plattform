import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  console.log('🟡 [Middleware] Path:', request.nextUrl.pathname)
  console.log('🟡 [Middleware] Allowing all traffic through - auth handled client-side')
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/signin', '/auth/:path*'],
}
