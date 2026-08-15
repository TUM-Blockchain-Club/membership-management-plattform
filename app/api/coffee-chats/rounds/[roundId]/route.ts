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

    if (selfiePaths.length > 0) {
      await admin.storage.from('coffee-chat-selfies').remove(selfiePaths).catch((err: unknown) => {
        console.warn('[coffee-chats/delete-round] storage cleanup warning:', err)
      })
    }

    // Delete the round (foreign keys cascade to signups and pairs)
    const { error: deleteError } = await admin
      .from('cc_rounds')
      .delete()
      .eq('id', roundId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, deletedRoundId: roundId, month: round.month })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete round'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
