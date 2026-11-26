import { isEditionWritable, isUuid } from '@/lib/yearbook'
import {
  EDITION_COLUMNS,
  removeYearbookPhotos,
  requireYearbookViewer,
  toEdition,
  yearbookErrorResponse,
} from '@/lib/server/yearbook'

/** Authors can delete their own message while the edition is open; yearbook admins can always remove one. */
export async function DELETE(_request: Request, props: { params: Promise<{ entryId: string }> }) {
  try {
    const { entryId } = await props.params
    if (!isUuid(entryId)) return Response.json({ error: 'That message no longer exists.' }, { status: 404 })
    const { admin, memberId, canManage } = await requireYearbookViewer()

    const { data: entry, error } = await admin
      .from('yb_entries')
      .select(`id, author_id, photo_path, yb_editions!inner(${EDITION_COLUMNS})`)
      .eq('id', entryId)
      .maybeSingle()
    if (error) return Response.json({ error: 'Could not load that message.' }, { status: 500 })
    if (!entry) return Response.json({ error: 'That message no longer exists.' }, { status: 404 })

    const editionRow = Array.isArray(entry.yb_editions) ? entry.yb_editions[0] : entry.yb_editions
    const isAuthor = entry.author_id === memberId
    if (!canManage) {
      if (!isAuthor) return Response.json({ error: 'You can only delete your own messages.' }, { status: 403 })
      if (!isEditionWritable(toEdition(editionRow))) {
        return Response.json({ error: 'The yearbook is closed, so messages can no longer be changed.' }, { status: 400 })
      }
    }

    const { error: deleteError } = await admin.from('yb_entries').delete().eq('id', entry.id)
    if (deleteError) return Response.json({ error: 'Could not delete that message.' }, { status: 500 })
    await removeYearbookPhotos(admin, [entry.photo_path as string | null])
    return Response.json({ ok: true })
  } catch (error) {
    return yearbookErrorResponse(error, 'Could not delete that message.')
  }
}
