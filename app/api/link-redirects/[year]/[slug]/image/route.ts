import { NextResponse } from 'next/server'
import {
  LinkAnalyticsAdminError,
  requireLinkAnalyticsAdmin,
} from '@/lib/server/linkAnalyticsAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    year: string
    slug: string
  }>
}

const LINK_IMAGE_BUCKET = 'link-redirect-images'
const MAX_IMAGE_SIZE = 8 * 1024 * 1024
const LINK_DEFINITION_SELECT =
  'year, slug, label, display_label, target_url, origin, campaign, variant, active, image_path, image_url, deployment_region, deployment_location, deployment_notes, deployed_at, updated_at'

const fileExtension = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '')
  return extension || 'png'
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { year, slug } = await context.params
    const formData = await request.formData()
    const image = formData.get('image')

    if (!(image instanceof File)) {
      return NextResponse.json({ error: 'Missing image file.' }, { status: 400 })
    }

    if (!image.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are supported.' }, { status: 400 })
    }

    if (image.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'Images must be 8 MB or smaller.' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    const { dataClient } = await requireLinkAnalyticsAdmin(supabase, request)
    const objectPath = `${year}/${slug}/${Date.now()}.${fileExtension(image.name)}`
    const { data: existingDefinition, error: existingError } = await dataClient
      .from('link_redirect_definitions')
      .select('image_path')
      .eq('year', year)
      .eq('slug', slug)
      .single()

    if (existingError || !existingDefinition) {
      return NextResponse.json(
        { error: existingError?.message || 'Could not load the link definition.' },
        { status: 500 }
      )
    }

    const { error: uploadError } = await dataClient.storage
      .from(LINK_IMAGE_BUCKET)
      .upload(objectPath, image, {
        cacheControl: '3600',
        upsert: false,
        contentType: image.type,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const {
      data: { publicUrl },
    } = dataClient.storage.from(LINK_IMAGE_BUCKET).getPublicUrl(objectPath)

    const imageUrl = `${publicUrl}?t=${Date.now()}`
    const { data, error } = await dataClient
      .from('link_redirect_definitions')
      .update({
        image_path: objectPath,
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('year', year)
      .eq('slug', slug)
      .select(LINK_DEFINITION_SELECT)
      .single()

    if (error || !data) {
      await dataClient.storage.from(LINK_IMAGE_BUCKET).remove([objectPath])
      return NextResponse.json(
        { error: error?.message || 'Could not save the uploaded link image.' },
        { status: 500 }
      )
    }

    if (existingDefinition.image_path && existingDefinition.image_path !== objectPath) {
      await dataClient.storage.from(LINK_IMAGE_BUCKET).remove([existingDefinition.image_path])
    }

    return NextResponse.json({ definition: data })
  } catch (error) {
    if (error instanceof LinkAnalyticsAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : 'Could not upload the link image.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
