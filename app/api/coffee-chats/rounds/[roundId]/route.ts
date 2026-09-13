import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCoffeeChatAdminClient } from '@/lib/server/coffeeChats'

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ roundId: string }> },
) {
  try {
    const { roundId } = await props.params
    if (!roundId) {
      return NextResponse.json({ error: 'roundId is required' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: isAdmin } = await supabase.rpc('check_email_can_manage_coffee_chats', {
      check_email: user.email ?? '',
    })

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = getCoffeeChatAdminClient()
    if (!admin) {
      return NextResponse.json({ error: 'Admin client unavailable' }, { status: 500 })
    }

    // Verify round exists
    const { data: round, error: roundError } = await admin
      .from('cc_rounds')
      .select('id, month')
      .eq('id', roundId)
      .maybeSingle()

    if (roundError || !round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    // Fetch any selfie paths associated with this round to clean up storage
    const { data: pairsWithSelfies } = await admin
      .from('cc_pairs')
      .select('selfie_path')
      .eq('round_id', roundId)
      .not('selfie_path', 'is', null)

    const selfiePaths = (pairsWithSelfies ?? [])
      .map((p) => p.selfie_path as string)
      .filter(Boolean)

    // Delete the round (foreign keys cascade to signups and pairs)
    const { error: deleteError } = await admin
      .from('cc_rounds')
      .delete()
      .eq('id', roundId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    if (selfiePaths.length > 0) {
      await admin.storage.from('coffee-chat-selfies').remove(selfiePaths).catch((err: unknown) => {
        console.warn('[coffee-chats/delete-round] storage cleanup warning:', err)
      })
    }

    return NextResponse.json({ ok: true, deletedRoundId: roundId, month: round.month })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete round'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function authorizeRoundAdmin() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: allowed, error: accessError } = await supabase.rpc('check_email_can_manage_coffee_chats', { check_email: user.email ?? '' })
  if (accessError || allowed !== true) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return getCoffeeChatAdminClient() ?? NextResponse.json({ error: 'Admin client unavailable' }, { status: 500 })
}

export async function GET(_request: Request, props: { params: Promise<{ roundId: string }> }) {
  try {
    const admin = await authorizeRoundAdmin()
    if (admin instanceof Response) return admin
    const { roundId } = await props.params
    const { data: round, error } = await admin.from('cc_rounds')
      .select('id, month, status, signup_deadline, meet_deadline, created_at').eq('id', roundId).maybeSingle()
    if (error) throw error
    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    const { data: signups, error: signupError } = await admin.from('cc_signups')
      .select('id, signed_up_at, member:members_main(id, Name, Department)').eq('round_id', roundId)
      .order('signed_up_at', { ascending: true })
    if (signupError) throw signupError
    return NextResponse.json({ round, signups }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: 'Could not load round details.' }, { status: 500 })
  }
}

export async function PATCH(request: Request, props: { params: Promise<{ roundId: string }> }) {
  try {
    const admin = await authorizeRoundAdmin()
    if (admin instanceof Response) return admin
    const body = await request.json().catch(() => null)
    const validDate = (value: unknown) => value === null || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value)
    if (!body || !validDate(body.signup_deadline) || !validDate(body.meet_deadline)) {
      return NextResponse.json({ error: 'Provide valid deadlines or null.' }, { status: 400 })
    }
    if (body.signup_deadline && body.meet_deadline && Date.parse(body.signup_deadline) > Date.parse(body.meet_deadline)) {
      return NextResponse.json({ error: 'The signup deadline must be on or before the meeting deadline.' }, { status: 400 })
    }
    const { roundId } = await props.params
    const { data: round, error } = await admin.from('cc_rounds')
      .update({ signup_deadline: body.signup_deadline, meet_deadline: body.meet_deadline })
      .eq('id', roundId).select('id, month, status, signup_deadline, meet_deadline, created_at').maybeSingle()
    if (error) throw error
    if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    return NextResponse.json({ round })
  } catch {
    return NextResponse.json({ error: 'Could not save deadlines.' }, { status: 500 })
  }
}
