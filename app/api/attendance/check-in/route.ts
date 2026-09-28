import { NextResponse } from 'next/server'
import { attendanceRpc } from '@/lib/server/attendanceRpc'
import { parseCheckInToken } from '@/lib/attendanceToken'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const token = typeof body?.token === 'string' ? parseCheckInToken(body.token) : null
  if (!token) return NextResponse.json({ error: 'Invalid check-in token.' }, { status: 400 })
  const [lectureId, code] = token.split(':')
  return attendanceRpc('attendance_check_in', { p_lecture_id: lectureId, p_code: code })
}
