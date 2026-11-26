import { isUuid, parseEditionInput, parseOptionalDate } from '@/lib/yearbook'
import { EDITION_COLUMNS, requireYearbookAdmin, toEdition, yearbookErrorResponse } from '@/lib/server/yearbook'

/**
 * Updates an edition. Body may contain:
 * - status: 'open' | 'closed' (close locks all writes; reopening needs no other open edition)
 * - title, closesAt
 */
export async function PATCH(request: Request, props: { params: Promise<{ editionId: string }> }) {
  try {
    const { editionId } = await props.params
    if (!isUuid(editionId)) return Response.json({ error: 'Yearbook not found.' }, { status: 404 })
    const { admin } = await requireYearbookAdmin()
    const payload = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (payload.status !== undefined) {
      if (payload.status !== 'open' && payload.status !== 'closed') {
        return Response.json({ error: 'Choose a valid yearbook status.' }, { status: 400 })
      }
      update.status = payload.status
    }
    if (payload.title !== undefined) update.title = parseEditionInput({ title: payload.title }).title
    if (payload.closesAt !== undefined) update.closes_at = parseOptionalDate(payload.closesAt)

    const { data, error } = await admin
      .from('yb_editions')
      .update(update)
      .eq('id', editionId)
      .select(EDITION_COLUMNS)
      .maybeSingle()
    if (error) {
      if (error.code === '23505') {
        return Response.json({ error: 'Another yearbook is already open. Close it first.' }, { status: 409 })
      }
      return Response.json({ error: 'Could not update the yearbook.' }, { status: 500 })
    }
    if (!data) return Response.json({ error: 'Yearbook not found.' }, { status: 404 })
    return Response.json({ ok: true, edition: toEdition(data) })
  } catch (error) {
    return yearbookErrorResponse(error, 'Could not update the yearbook.')
  }
}
