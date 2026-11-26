import {
  removeYearbookPhotos,
  requireWritableEdition,
  requireYearbookViewer,
  yearbookErrorResponse,
} from '@/lib/server/yearbook'

/** Opt in to or out of the open yearbook edition. Body: { intent: 'join' | 'leave' }. */
export async function POST(request: Request) {
  try {
    const viewer = await requireYearbookViewer()
    const payload = (await request.json().catch(() => null)) as { intent?: unknown } | null
    const intent = payload?.intent
    if (intent !== 'join' && intent !== 'leave') {
      return Response.json({ error: 'Choose whether to join or leave the yearbook.' }, { status: 400 })
    }

    const { admin, memberId } = viewer
    const edition = await requireWritableEdition(admin)

    if (intent === 'join') {
      const { error } = await admin
        .from('yb_participants')
        .upsert({ edition_id: edition.id, member_id: memberId }, { onConflict: 'edition_id,member_id', ignoreDuplicates: true })
      if (error) return Response.json({ error: 'Could not join the yearbook. Please try again.' }, { status: 500 })
      return Response.json({ ok: true, joined: true })
    }

    // Leaving removes your page (quote and portrait). Messages you wrote stay
    // saved but are excluded from the print until you join again.
    const { data: removed, error } = await admin
      .from('yb_participants')
      .delete()
      .eq('edition_id', edition.id)
      .eq('member_id', memberId)
      .select('portrait_path')
    if (error) return Response.json({ error: 'Could not leave the yearbook. Please try again.' }, { status: 500 })
    await removeYearbookPhotos(admin, (removed ?? []).map((row) => row.portrait_path as string | null))
    return Response.json({ ok: true, joined: false })
  } catch (error) {
    return yearbookErrorResponse(error, 'Could not update your yearbook participation.')
  }
}
