import { NextResponse } from 'next/server'

function retired() {
  return NextResponse.json({ error: 'Manage permissions on the board-only Admin Access page.', href: '/admin-access' }, { status: 410 })
}
export const GET = retired
export const POST = retired
export const DELETE = retired
