import 'server-only'
import { NextResponse } from 'next/server'
import { AttendanceAuthError, requireAttendanceMember } from './attendanceAuth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function attendanceRpc(
  name: 'attendance_check_in' | 'attendance_lecture_code',
  args: Record<string, string | boolean>,
) {
  try {
    const supabase = await createSupabaseServerClient()
    await requireAttendanceMember(supabase)
    const { data, error } = await supabase.rpc(name, args)
    if (error) return NextResponse.json({ error: 'Attendance is temporarily unavailable.' }, { status: 500 })
    return NextResponse.json(data, { status: data?.status ?? 200 })
  } catch (error) {
    if (error instanceof AttendanceAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: 'Attendance is temporarily unavailable.' }, { status: 500 })
  }
}
