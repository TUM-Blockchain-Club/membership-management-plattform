import { attendanceRpc } from '@/lib/server/attendanceRpc'
import { NextResponse } from 'next/server'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid lecture id.' }, { status: 400 })
  }
  return attendanceRpc('attendance_lecture_code', { p_lecture_id: id, p_start: false })
}
