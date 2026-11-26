import { isWritableSubjectStatus, parseEntryBody, parseMemberId } from '@/lib/yearbook'
import {
  isParticipant,
  processYearbookPhoto,
  removeYearbookPhotos,
  requireWritableEdition,
  requireYearbookViewer,
  uploadYearbookPhoto,
  yearbookErrorResponse,
} from '@/lib/server/yearbook'

/**
 * Creates or replaces the viewer's message about one member.
 * multipart/form-data: subjectId, body, photo (File, optional), removePhoto ('true', optional)
 */
export async function POST(request: Request) {
  try {
    const { admin, memberId } = await requireYearbookViewer()
    const edition = await requireWritableEdition(admin)
    if (!(await isParticipant(admin, edition.id, memberId))) {
      return Response.json({ error: 'Join the yearbook before writing messages.' }, { status: 403 })
    }

    const form = await request.formData()
    const subjectId = parseMemberId(form.get('subjectId'))
    const body = parseEntryBody(form.get('body'))
    const photo = form.get('photo')
    const removePhoto = form.get('removePhoto') === 'true'

    if (subjectId === memberId) {
      return Response.json({ error: 'Your own page shows what others write about you.' }, { status: 400 })
    }

    const [{ data: subject, error: subjectError }, { data: existing, error: existingError }] = await Promise.all([
      admin.from('members_main').select('id, Status').eq('id', subjectId).maybeSingle(),
      admin
        .from('yb_entries')
        .select('id, photo_path')
        .eq('edition_id', edition.id)
        .eq('author_id', memberId)
        .eq('subject_id', subjectId)
        .maybeSingle(),
    ])
    if (subjectError || existingError) return Response.json({ error: 'Could not save your message.' }, { status: 500 })
    if (!subject || !isWritableSubjectStatus(subject.Status as string | null)) {
      return Response.json({ error: 'That member cannot receive yearbook messages.' }, { status: 404 })
    }

    let photoPath = (existing?.photo_path as string | null | undefined) ?? null
    let uploadedPath: string | null = null
    if (photo instanceof File && photo.size > 0) {
      const bytes = await processYearbookPhoto(photo)
      uploadedPath = await uploadYearbookPhoto(admin, edition.id, memberId, 'entry', bytes)
      photoPath = uploadedPath
    } else if (removePhoto) {
      photoPath = null
    }

    const now = new Date().toISOString()
    const result = existing
      ? await admin
          .from('yb_entries')
          .update({ body, photo_path: photoPath, updated_at: now })
          .eq('id', existing.id)
          .select('id')
          .single()
      : await admin
          .from('yb_entries')
          .insert({ edition_id: edition.id, author_id: memberId, subject_id: subjectId, body, photo_path: photoPath })
          .select('id')
          .single()

    if (result.error) {
      await removeYearbookPhotos(admin, [uploadedPath])
      const duplicate = result.error.code === '23505'
      return Response.json(
        { error: duplicate ? 'You already wrote a message for this member. Reload and edit it instead.' : 'Could not save your message.' },
        { status: duplicate ? 409 : 500 },
      )
    }

    if (existing?.photo_path && existing.photo_path !== photoPath) {
      await removeYearbookPhotos(admin, [existing.photo_path as string])
    }
    return Response.json({ ok: true, id: result.data.id })
  } catch (error) {
    return yearbookErrorResponse(error, 'Could not save your message.')
  }
}
