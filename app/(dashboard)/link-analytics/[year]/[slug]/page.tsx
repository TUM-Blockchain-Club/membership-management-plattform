import { redirect } from 'next/navigation'
import { LinkAnalyticsDetail } from '@/app/dashboard/tabs/link-analytics/LinkAnalyticsDashboard'
import { loadLinkAnalytics } from '@/lib/server/linkAnalytics'
import {
  LinkAnalyticsAdminError,
  requireLinkAnalyticsAdmin,
} from '@/lib/server/linkAnalyticsAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type PageProps = {
  params: Promise<{
    year: string
    slug: string
  }>
}

export default async function LinkAnalyticsDetailPage({ params }: PageProps) {
  const { year, slug } = await params
  const supabase = await createSupabaseServerClient()
  let analytics

  try {
    const { dataClient } = await requireLinkAnalyticsAdmin(supabase)
    analytics = await loadLinkAnalytics(dataClient, 60)
  } catch (error) {
    if (error instanceof LinkAnalyticsAdminError && error.status === 401) {
      redirect('/signin')
    }

    redirect('/profile')
  }

  const link = analytics.links.find(
    (candidate) => candidate.definition.year === year && candidate.definition.slug === slug
  )

  if (!link) {
    redirect('/link-analytics')
  }

  return <LinkAnalyticsDetail initialData={analytics} initialLink={link} />
}
