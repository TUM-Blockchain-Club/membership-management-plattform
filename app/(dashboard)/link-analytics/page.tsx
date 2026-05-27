import { redirect } from 'next/navigation'
import { LinkAnalyticsOverview } from '@/app/dashboard/tabs/link-analytics/LinkAnalyticsDashboard'
import { loadLinkAnalytics } from '@/lib/server/linkAnalytics'
import {
  LinkAnalyticsAdminError,
  requireLinkAnalyticsAdmin,
} from '@/lib/server/linkAnalyticsAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function LinkAnalyticsPage() {
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

  return <LinkAnalyticsOverview initialData={analytics} />
}
