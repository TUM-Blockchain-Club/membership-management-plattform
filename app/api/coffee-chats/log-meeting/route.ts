import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { syncSelfie } from '@/lib/coffee-chats/drive'

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
    const dateMet = formData.get('dateMet')
    const rating = formData.get('rating')
    const highlightNote = formData.get('highlightNote')
    const selfieFile = formData.get('selfie') as File | null

    if (!pairId || typeof pairId !== 'string') {
      return NextResponse.json({ error: 'pairId is required' }, { status: 400 })
    }

    // Fetch the pair to verify membership and get round info
    const admin = getSupabaseAdminClient()
    const dataClient = admin ?? supabase

    const { data: pair, error: pairError } = await dataClient
      .from('cc_pairs')
      .select('id, round_id, person1_id, person2_id, person3_id')
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

    // Determine which sign-off column to set
    const signOffField =
      memberId === p1 ? 'person1_signed_off' :
      memberId === p2 ? 'person2_signed_off' :
      'person3_signed_off'

    // Handle selfie upload
    let selfieUrl: string | null = null
    let driveUrl: string | null = null

    if (selfieFile && selfieFile.size > 0) {
      const arrayBuffer = await selfieFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Upload to Supabase Storage
      const fileName = `${pair.round_id as string}/${pairId}-${Date.now()}.jpg`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('coffee-chat-selfies')
        .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: true })

      if (!uploadError && uploadData) {
        const { data: { publicUrl } } = supabase.storage
          .from('coffee-chat-selfies')
          .getPublicUrl(uploadData.path)
        selfieUrl = publicUrl

        // Optionally sync to Google Drive
        const { data: roundData } = await dataClient
          .from('cc_rounds')
          .select('month')
          .eq('id', pair.round_id)
          .maybeSingle()

        const { data: partners } = await dataClient
          .from('members_main')
          .select('Name')
          .in('id', [p1, p2, ...(p3 ? [p3] : [])])

        const names = (partners ?? []).map((p) => (p.Name as string | null) ?? 'Member')
        const driveResult = await syncSelfie(
          buffer,
          pairId,
          (roundData?.month as string | null) ?? 'unknown',
          names,
        )
        if (driveResult) driveUrl = driveResult.webViewLink
      }
    }

    // Build update payload
    const update: Record<string, unknown> = {
      [signOffField]: true,
      status: 'met',
    }

    if (dateMet && typeof dateMet === 'string') update.date_met = dateMet
    if (rating && !isNaN(Number(rating))) update.rating = Number(rating)
    if (highlightNote && typeof highlightNote === 'string') update.highlight_note = highlightNote
    if (selfieUrl) update.selfie_url = selfieUrl
    if (driveUrl) update.drive_url = driveUrl

    const { error: updateError } = await dataClient
      .from('cc_pairs')
      .update(update)
      .eq('id', pairId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, selfieUrl, driveUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Log meeting failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
