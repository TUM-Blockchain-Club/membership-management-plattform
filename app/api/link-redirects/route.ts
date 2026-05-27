import { NextResponse } from 'next/server'
import {
  LinkAnalyticsAdminError,
  requireLinkAnalyticsAdmin,
} from '@/lib/server/linkAnalyticsAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type CreateLinkPayload = {
  year?: string
  slug?: string
  label?: string
  target_url?: string
  origin?: string
  campaign?: string
  variant?: string
}

const LINK_DEFINITION_SELECT =
  'year, slug, label, display_label, target_url, origin, campaign, variant, active, redirect_source, hardcoded_target_url, hardcoded_synced_at, image_path, image_url, deployment_region, deployment_location, deployment_notes, deployed_at, updated_at'

const cleanText = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

const parseUrl = (value: unknown) => {
  const raw = cleanText(value, 1200)
  if (!raw) return ''

  try {
    return new URL(raw).toString()
  } catch {
    return ''
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CreateLinkPayload
    const year = cleanText(payload.year, 8)
    const slug = cleanText(payload.slug, 120).toLowerCase()
    const targetUrl = parseUrl(payload.target_url)
    const origin = cleanText(payload.origin, 80).toLowerCase()
    const campaign = cleanText(payload.campaign, 120)
    const variant = cleanText(payload.variant, 120) || slug
    const label = cleanText(payload.label, 120) || slug

    if (!/^\d{2,4}$/.test(year)) {
      return NextResponse.json({ error: 'Year must be 2 to 4 digits.' }, { status: 400 })
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must use lowercase letters, numbers, and hyphens.' },
        { status: 400 }
      )
    }

    if (!targetUrl) {
      return NextResponse.json({ error: 'Target URL must be a valid URL.' }, { status: 400 })
    }

    if (!origin || !campaign) {
      return NextResponse.json({ error: 'Origin and campaign are required.' }, { status: 400 })
    }

    const supabase = await createSupabaseServerClient()
    const { dataClient } = await requireLinkAnalyticsAdmin(supabase, request)
    const { data: existing, error: existingError } = await dataClient
      .from('link_redirect_definitions')
      .select('year, slug')
      .eq('year', year)
      .eq('slug', slug)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json(
        { error: 'A link with this exact path already exists.' },
        { status: 409 }
      )
    }

    const { data, error } = await dataClient
      .from('link_redirect_definitions')
      .insert({
        year,
        slug,
        label,
        target_url: targetUrl,
        origin,
        campaign,
        variant,
        active: true,
        redirect_source: 'soft',
        updated_at: new Date().toISOString(),
      })
      .select(LINK_DEFINITION_SELECT)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Could not create soft link.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ definition: data }, { status: 201 })
  } catch (error) {
    if (error instanceof LinkAnalyticsAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : 'Could not create soft link.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
