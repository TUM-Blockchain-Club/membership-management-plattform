import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export class AttendanceAuthError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AttendanceAuthError'
    this.status = status
  }
}

export type AttendanceMember = {
  id: number
  name: string | null
  email: string | null
  role: string | null
}

const normalizeMember = (row: Record<string, unknown> | null): AttendanceMember | null => {
  if (!row) return null

  const rawId = row.id
  const id = typeof rawId === 'number' ? rawId : typeof rawId === 'string' ? Number(rawId) : NaN
  if (!Number.isFinite(id)) return null

  return {
    id,
    name: typeof row.Name === 'string' ? row.Name : null,
    email: typeof row['TBC Email'] === 'string' ? (row['TBC Email'] as string) : null,
    role: typeof row.Role === 'string' ? (row.Role as string) : null,
  }
}

export const requireAttendanceMember = async (
  supabase: SupabaseServerClient
): Promise<AttendanceMember> => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new AttendanceAuthError('Not authenticated.', 401)
  }

  const { data, error } = await supabase
    .from('members_main')
    .select('id, Name, "TBC Email", Role')
    .ilike('TBC Email', user.email ?? '')
    .maybeSingle()

  if (error) {
    throw new AttendanceAuthError(error.message || 'Could not load your member record.', 500)
  }

  const member = normalizeMember(data as Record<string, unknown> | null)
  if (!member) {
    throw new AttendanceAuthError('No member profile found for your account.', 404)
  }

  return member
}

export const isBoardMember = (member: AttendanceMember) => member.role === 'Board Member'

export const requireBoardMember = async (
  supabase: SupabaseServerClient
): Promise<AttendanceMember> => {
  const member = await requireAttendanceMember(supabase)
  if (!isBoardMember(member)) {
    throw new AttendanceAuthError('Only board members can perform this action.', 403)
  }
  return member
}
