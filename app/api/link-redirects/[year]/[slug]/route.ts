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

type MetadataPayload = {
  display_label?: string | null
  deployment_region?: string | null
  deployment_location?: string | null
  deployment_notes?: string | null
  deployed_at?: string | null
}

const LINK_DEFINITION_SELECT =
  'year, slug, label, display_label, target_url, origin, campaign, variant, active, image_path, image_url, deployment_region, deployment_location, deployment_notes, deployed_at, updated_at'

const nullableString = (value: unknown, maxLength = 500) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

const nullableDate = (value: unknown) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { year, slug } = await context.params
    const payload = (await request.json()) as MetadataPayload
    const supabase = await createSupabaseServerClient()
    const { dataClient } = await requireLinkAnalyticsAdmin(supabase, request)

    const updates = {
      display_label: nullableString(payload.display_label, 120),
      deployment_region: nullableString(payload.deployment_region, 120),
      deployment_location: nullableString(payload.deployment_location, 180),
      deployment_notes: nullableString(payload.deployment_notes, 1200),
      deployed_at: nullableDate(payload.deployed_at),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await dataClient
      .from('link_redirect_definitions')
      .update(updates)
      .eq('year', year)
      .eq('slug', slug)
      .select(LINK_DEFINITION_SELECT)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Could not update link metadata.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ definition: data })
  } catch (error) {
    if (error instanceof LinkAnalyticsAdminError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    const message = error instanceof Error ? error.message : 'Could not update link metadata.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
