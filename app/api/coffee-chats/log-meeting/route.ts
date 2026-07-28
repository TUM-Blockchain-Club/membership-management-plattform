import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { syncSelfie } from '@/lib/coffee-chats/drive'
import { MAX_SELFIE_BYTES, validateSelfieUpload } from '@/lib/coffee-chats/uploads'
import { getCoffeeChatAdminClient } from '@/lib/coffee-chats/supabase'
import { buildMeetingUpdate } from '@/lib/coffee-chats/meeting'

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Resolve member id
    const { data: member, error: memberError } = await supabase
      .from('members_main')
      .select('id, Name')
      .ilike('"TBC Email"', user.email ?? '')
      .maybeSingle()

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member profile not found' }, { status: 404 })
    }

    const memberId = member.id as number
    const formData = await request.formData()

    const pairId = formData.get('pairId')
    const intent = formData.get('intent')
    const dateMet = formData.get('dateMet')
    const rating = formData.get('rating')
    const highlightNote = formData.get('highlightNote')
    const selfieFile = formData.get('selfie') as File | null

    if (!pairId || typeof pairId !== 'string') {
      return NextResponse.json({ error: 'pairId is required' }, { status: 400 })
    }

    if (intent !== 'complete-meeting' && intent !== 'upload-selfie') {
      return NextResponse.json({ error: 'A valid meeting action is required.' }, { status: 400 })
    }

    const parsedRating = rating === null || rating === '' ? null : Number(rating)
    if (parsedRating !== null && (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5)) {
      return NextResponse.json({ error: 'rating must be an integer from 1 to 5' }, { status: 400 })
    }

    if (intent === 'complete-meeting' && typeof highlightNote === 'string' && highlightNote.length > 500) {
      return NextResponse.json({ error: 'highlightNote must be 500 characters or fewer' }, { status: 400 })
    }

    if (intent === 'complete-meeting' && (typeof dateMet !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateMet))) {
      return NextResponse.json({ error: 'dateMet must use YYYY-MM-DD format' }, { status: 400 })
    }

    // Fetch the pair to verify membership and get round info
    const admin = getCoffeeChatAdminClient()
    if (!admin) {
      return NextResponse.json({ error: 'Admin client unavailable' }, { status: 500 })
    }

    const { data: pair, error: pairError } = await admin
      .from('cc_pairs')
      .select('id, round_id, person1_id, person2_id, person3_id, status')
      .eq('id', pairId)
      .maybeSingle()

    if (pairError || !pair) {
      return NextResponse.json({ error: 'Pair not found' }, { status: 404 })
    }

    const p1 = pair.person1_id as number
    const p2 = pair.person2_id as number
    const p3 = pair.person3_id as number | null

    if (memberId !== p1 && memberId !== p2 && memberId !== p3) {
      return NextResponse.json({ error: 'You are not a member of this pair' }, { status: 403 })
    }

    if (intent === 'upload-selfie' && pair.status !== 'met') {
      return NextResponse.json(
        { error: 'Complete the meeting before uploading a standalone selfie.' },
        { status: 400 },
      )
    }

    if (intent === 'upload-selfie' && (!selfieFile || selfieFile.size === 0)) {
      return NextResponse.json({ error: 'Select a selfie to upload.' }, { status: 400 })
    }

    // Determine which sign-off column to set
    const signOffField =
      memberId === p1 ? 'person1_signed_off' :
      memberId === p2 ? 'person2_signed_off' :
      'person3_signed_off'

    // Handle selfie upload
    let selfiePath: string | null = null
    let driveUrl: string | null = null

    if (selfieFile && selfieFile.size > 0) {
      if (selfieFile.size > MAX_SELFIE_BYTES) {
        return NextResponse.json({ error: 'Selfies must be 5 MB or smaller.' }, { status: 400 })
      }

      const arrayBuffer = await selfieFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      let imageType

      try {
        imageType = validateSelfieUpload(buffer, selfieFile.type)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid selfie image'
        return NextResponse.json({ error: message }, { status: 400 })
      }

      const fileName = `${pair.round_id}/${pairId}-${crypto.randomUUID()}.${imageType.extension}`
      const { data: uploadData, error: uploadError } = await admin.storage
        .from('coffee-chat-selfies')
        .upload(fileName, buffer, { contentType: imageType.contentType, upsert: false })

      if (uploadError || !uploadData) {
        return NextResponse.json(
          { error: uploadError?.message ?? 'Selfie upload failed' },
          { status: 500 },
        )
      }

      selfiePath = uploadData.path

      const { data: roundData } = await admin
        .from('cc_rounds')
        .select('month')
        .eq('id', pair.round_id)
        .maybeSingle()

      const { data: partners } = await admin
        .from('members_main')
        .select('Name')
        .in('id', [p1, p2, ...(p3 ? [p3] : [])])

      const names = (partners ?? []).map((partner) => partner.Name ?? 'Member')
      const driveResult = await syncSelfie(
        buffer,
        pairId,
        roundData?.month ?? 'unknown',
        names,
        imageType,
      )
      if (driveResult) driveUrl = driveResult.webViewLink
    }

    const update = buildMeetingUpdate({
      intent,
      signOffField,
      selfiePath,
      driveUrl,
      dateMet: typeof dateMet === 'string' ? dateMet : null,
      rating: parsedRating,
      highlightNote: typeof highlightNote === 'string' ? highlightNote : null,
    })

    const { error: updateError } = await admin
      .from('cc_pairs')
      .update(update)
      .eq('id', pairId)

    if (updateError) {
      if (selfiePath) {
        await admin.storage.from('coffee-chat-selfies').remove([selfiePath])
      }
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const { data: signedSelfie } = selfiePath
      ? await admin.storage.from('coffee-chat-selfies').createSignedUrl(selfiePath, 60 * 60)
      : { data: null }

    return NextResponse.json({ ok: true, selfieUrl: signedSelfie?.signedUrl ?? null, driveUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Log meeting failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
