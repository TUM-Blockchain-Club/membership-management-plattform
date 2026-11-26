import { parseQuote } from '@/lib/yearbook'
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
 * Updates the member's own yearbook page.
 * multipart/form-data: quote (string), portrait (File, optional), removePortrait ('true', optional)
 */
export async function POST(request: Request) {
  try {
    const { admin, memberId } = await requireYearbookViewer()
    const edition = await requireWritableEdition(admin)
    if (!(await isParticipant(admin, edition.id, memberId))) {
      return Response.json({ error: 'Join the yearbook before editing your page.' }, { status: 403 })
    }

    const form = await request.formData()
    const quote = parseQuote(form.get('quote'))
    const portrait = form.get('portrait')
    const removePortrait = form.get('removePortrait') === 'true'

    const { data: current, error: currentError } = await admin
      .from('yb_participants')
      .select('portrait_path')
      .eq('edition_id', edition.id)
      .eq('member_id', memberId)
      .single()
    if (currentError) return Response.json({ error: 'Could not load your page.' }, { status: 500 })

    let portraitPath = current.portrait_path as string | null
    let uploadedPath: string | null = null
    if (portrait instanceof File && portrait.size > 0) {
      const bytes = await processYearbookPhoto(portrait)
      uploadedPath = await uploadYearbookPhoto(admin, edition.id, memberId, 'portrait', bytes)
      portraitPath = uploadedPath
    } else if (removePortrait) {
      portraitPath = null
    }

    const { error } = await admin
      .from('yb_participants')
      .update({ quote, portrait_path: portraitPath, updated_at: new Date().toISOString() })
      .eq('edition_id', edition.id)
      .eq('member_id', memberId)
    if (error) {
      await removeYearbookPhotos(admin, [uploadedPath])
      return Response.json({ error: 'Could not save your page. Please try again.' }, { status: 500 })
    }

    if (current.portrait_path && current.portrait_path !== portraitPath) {
      await removeYearbookPhotos(admin, [current.portrait_path as string])
    }
    return Response.json({ ok: true })
  } catch (error) {
    return yearbookErrorResponse(error, 'Could not save your yearbook page.')
  }
}
