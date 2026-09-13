import { NextResponse } from 'next/server'
import { isAdminAccessChange } from '@/lib/adminAccess'
import { AdminAccessError, requireBoardAdminAccess } from '@/lib/server/adminAccess'

function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof AdminAccessError ? error.message : 'Could not load admin access.' },
    { status: error instanceof AdminAccessError ? error.status : 500 })
}
export async function GET() {
  try {
    const client = await requireBoardAdminAccess()
    const [members, assignments, audit] = await Promise.all([
      client.from('members_main').select('id, Name, Department, Role, Status').order('Name'),
      client.from('admin_assignments').select('member_id, scope'),
      client.from('admin_access_audit').select('id, member_id, scope, action, actor_member_id, created_at').order('created_at', { ascending: false }).limit(50),
    ])
    if (members.error || assignments.error || audit.error) throw new Error('Read failed')
    return NextResponse.json({ members: members.data, assignments: assignments.data, audit: audit.data }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return failure(error) }
}
export async function PATCH(request: Request) {
  try {
    const client = await requireBoardAdminAccess()
    const payload: unknown = await request.json()
    if (!isAdminAccessChange(payload)) return NextResponse.json({ error: 'Choose a valid member, area and access setting.' }, { status: 400 })
    const { data, error } = await client.rpc('set_admin_access', {
      p_member_id: payload.memberId, p_scope: payload.scope, p_enabled: payload.enabled,
    })
    if (error) return NextResponse.json({ error: error.code === '42501' ? 'Only board members can manage admin access.' : 'Could not change access. Board rights are automatic; new access requires an active member.' }, { status: error.code === '42501' ? 403 : 400 })
    return NextResponse.json({ ok: true, changed: data?.changed === true })
  } catch (error) { return failure(error) }
}
