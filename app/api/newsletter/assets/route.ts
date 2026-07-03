import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireNewsletterAccess } from '@/lib/newsletter/auth'

const BUCKET = 'newsletter-assets'
const ASSET_PREFIX = 'images'
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/gif', 'gif'],
  ['image/webp', 'webp'],
])

const sanitizeName = (name: string) =>
  name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || 'newsletter-image'

const getObjectPath = (path: string | null) => {
  if (!path) return null
  const normalized = path.replace(/^\/+/, '')
  if (!normalized.startsWith(`${ASSET_PREFIX}/`)) return null
  return normalized
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireNewsletterAccess(supabase, request)
    if (auth.status !== 200) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data, error } = await auth.dataClient.storage.from(BUCKET).list(ASSET_PREFIX, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const assets = (data ?? [])
      .filter((asset) => asset.name && !asset.name.startsWith('.'))
      .map((asset) => {
        const path = `${ASSET_PREFIX}/${asset.name}`
        const { data: publicUrl } = auth.dataClient.storage.from(BUCKET).getPublicUrl(path)

        return {
          name: asset.name,
          path,
          src: publicUrl.publicUrl,
          size: asset.metadata?.size as number | undefined,
          updatedAt: asset.updated_at,
        }
      })

    return NextResponse.json({ assets })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list newsletter assets.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireNewsletterAccess(supabase, request)
    if (auth.status !== 200) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const formData = await request.formData()
    const file = formData.get('image')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required.' }, { status: 400 })
    }

    const extension = ALLOWED_IMAGE_TYPES.get(file.type)
    if (!extension) {
      return NextResponse.json({ error: 'Only JPG, PNG, GIF, and WebP images are supported.' }, { status: 400 })
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Image is too large. Maximum size is 5 MB.' }, { status: 400 })
    }

    const fileName = `${Date.now()}-${randomUUID()}-${sanitizeName(file.name)}.${extension}`
    const path = `${ASSET_PREFIX}/${fileName}`

    const { error } = await auth.dataClient.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '31536000',
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: publicUrl } = auth.dataClient.storage.from(BUCKET).getPublicUrl(path)

    return NextResponse.json({
      asset: {
        name: fileName,
        path,
        src: publicUrl.publicUrl,
        size: file.size,
        updatedAt: new Date().toISOString(),
      },
    }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to upload newsletter asset.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const auth = await requireNewsletterAccess(supabase, request)
    if (auth.status !== 200) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { searchParams } = new URL(request.url)
    const path = getObjectPath(searchParams.get('path'))
    if (!path) {
      return NextResponse.json({ error: 'Valid asset path is required.' }, { status: 400 })
    }

    const { error } = await auth.dataClient.storage.from(BUCKET).remove([path])
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete newsletter asset.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
