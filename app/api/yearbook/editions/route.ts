import { parseEditionInput } from '@/lib/yearbook'
import { EDITION_COLUMNS, requireYearbookAdmin, toEdition, yearbookErrorResponse } from '@/lib/server/yearbook'

/** Opens a new yearbook edition. Body: { title, closesAt? } */
export async function POST(request: Request) {
  try {
    const { admin, memberId } = await requireYearbookAdmin()
    const input = parseEditionInput(await request.json().catch(() => null))
    const { data, error } = await admin
      .from('yb_editions')
      .insert({ title: input.title, closes_at: input.closesAt, status: 'open', created_by: memberId })
      .select(EDITION_COLUMNS)
      .single()
    if (error) {
      if (error.code === '23505') {
        return Response.json({ error: 'Close the current yearbook before opening a new one.' }, { status: 409 })
      }
      return Response.json({ error: 'Could not create the yearbook.' }, { status: 500 })
    }
    return Response.json({ ok: true, edition: toEdition(data) }, { status: 201 })
  } catch (error) {
    return yearbookErrorResponse(error, 'Could not create the yearbook.')
  }
}
