import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })

export async function GET(request: Request) {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return json({ error: 'Sign in to continue.' }, 401)
  const admin = new URL(request.url).searchParams.get('admin') === 'true'
  if (admin) {
    const { data, error } = await client.rpc('can_manage_event_grants')
    if (error) return json({ error: 'Could not verify access.' }, 503)
    if (data !== true) return json({ error: 'Grant administrator access required.' }, 403)
    const result = await client.from('event_grant_applications').select('event_id, member_id, created_at, events(title), members_main(Name, Department)').order('created_at', { ascending: false })
    return result.error ? json({ error: 'Could not load applications.' }, 503) : json(result.data)
  }
  const { data: id, error } = await client.rpc('current_member_id')
  if (error || id == null) return json({ error: 'Member profile required.' }, 403)
  const result = await client.from('event_grant_applications').select('event_id').eq('member_id', id)
  return result.error ? json({ error: 'Could not load your applications.' }, 503) : json(result.data)
}

export async function POST(request: Request) {
  const client = await createSupabaseServerClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return json({ error: 'Sign in to apply.' }, 401)
  let body
  try { body = await request.json() } catch { return json({ error: 'Invalid request.' }, 400) }
  if (!body || !Number.isSafeInteger(body.eventId) || body.eventId < 1 || typeof body.apply !== 'boolean') return json({ error: 'Invalid application.' }, 400)
  const { data: id, error } = await client.rpc('current_member_id')
  if (error || id == null) return json({ error: 'Member profile required.' }, 403)
  const result = body.apply
    ? await client.from('event_grant_applications').upsert({ event_id: body.eventId, member_id: id }, { onConflict: 'event_id,member_id', ignoreDuplicates: true })
    : await client.from('event_grant_applications').delete().eq('event_id', body.eventId).eq('member_id', id)
  return result.error ? json({ error: 'Could not update your application. Check that the event is still open.' }, 409) : json({ applied: body.apply })
}
