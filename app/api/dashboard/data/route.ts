import { NextResponse } from 'next/server'
import { getRequestMember } from '@/lib/server/requestMember'
import { loadDashboardEvents, loadDashboardMembers } from '@/lib/server/dashboardData'

export async function GET(request: Request) {
  const resource = new URL(request.url).searchParams.get('resource')
  if (resource !== 'members' && resource !== 'events') {
    return NextResponse.json({ error: 'Unknown dashboard resource.' }, { status: 400 })
  }
  try {
    const { member, dataClient, user, isDevBypass, error } = await getRequestMember()
    if (!user && !isDevBypass) return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 })
    if (error) throw error
    if (!member) return NextResponse.json({ error: 'Member profile required.' }, { status: 403 })
    const data = resource === 'members'
      ? await loadDashboardMembers(dataClient)
      : await loadDashboardEvents(dataClient, member.id)
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Could not load dashboard data. Please try again.' }, { status: 503 })
  }
}
