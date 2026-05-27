import 'server-only'

import type { createSupabaseServerClient } from '@/lib/supabase/server'

type SupabaseDataClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

export type LinkDefinition = {
  year: string
  slug: string
  label: string
  target_url: string
  origin: string
  campaign: string
  variant: string
  active: boolean
  deployment_region: string | null
  deployment_location: string | null
  deployment_notes: string | null
  deployed_at: string | null
  updated_at: string | null
}

type ClickRow = {
  year: string
  slug: string
  status: string
  target_url: string | null
  origin: string | null
  campaign: string | null
  variant: string | null
  referrer_domain: string | null
  device_type: string | null
  browser_family: string | null
  country: string | null
  clicked_at_hour: string
}

type Bucket = {
  key: string
  label: string
  count: number
}

export type LinkAnalyticsSummary = {
  key: string
  url: string
  definition: LinkDefinition
  totalClicks: number
  clicksLast7Days: number
  averageClicksPerDay: number
  bestWeekday: Bucket | null
  bestHour: Bucket | null
  weekdayBuckets: Bucket[]
  hourlyBuckets: Bucket[]
  dailyBuckets: Bucket[]
  countryBuckets: Bucket[]
  deviceBuckets: Bucket[]
  browserBuckets: Bucket[]
  referrerBuckets: Bucket[]
}

export type LinkAnalyticsData = {
  generatedAt: string
  windowDays: number
  totals: {
    links: number
    clicks: number
    clicksLast7Days: number
    averageClicksPerDay: number
  }
  links: LinkAnalyticsSummary[]
}

const LINK_BASE_URL = 'https://link.tum-blockchain.com'
const ANALYTICS_TIME_ZONE = 'Europe/Berlin'
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAY_INDEX = new Map(WEEKDAYS.map((weekday, index) => [weekday, index]))

const munichDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ANALYTICS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const munichWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: ANALYTICS_TIME_ZONE,
  weekday: 'short',
})

const munichHourFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: ANALYTICS_TIME_ZONE,
  hour: '2-digit',
  hourCycle: 'h23',
})

const emptyWeekdays = () =>
  WEEKDAYS.map((label, index) => ({ key: String(index), label, count: 0 }))

const emptyHours = () =>
  Array.from({ length: 24 }, (_, hour) => ({
    key: String(hour),
    label: `${String(hour).padStart(2, '0')}:00`,
    count: 0,
  }))

const topBucket = (buckets: Bucket[]) =>
  buckets.reduce<Bucket | null>((best, bucket) => {
    if (!best || bucket.count > best.count) return bucket
    return best
  }, null)

const increment = (map: Map<string, number>, key: string | null | undefined) => {
  const normalized = key?.trim() || 'unknown'
  map.set(normalized, (map.get(normalized) ?? 0) + 1)
}

const toTopBuckets = (map: Map<string, number>, limit = 6): Bucket[] =>
  [...map.entries()]
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)

const getMunichDateKey = (date: Date) => {
  const parts = munichDateFormatter.formatToParts(date)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  return `${year}-${month}-${day}`
}

const getMunichWeekdayIndex = (date: Date) => {
  const weekday = munichWeekdayFormatter.format(date)
  return WEEKDAY_INDEX.get(weekday) ?? 0
}

const getMunichHour = (date: Date) => Number(munichHourFormatter.format(date))

const createDailyBuckets = (windowDays: number) => {
  const buckets: Bucket[] = []
  const now = new Date()

  for (let index = windowDays - 1; index >= 0; index -= 1) {
    const date = new Date(now)
    date.setUTCDate(now.getUTCDate() - index)
    const key = getMunichDateKey(date)
    buckets.push({
      key,
      label: key.slice(5),
      count: 0,
    })
  }

  return buckets
}

export async function loadLinkAnalytics(
  dataClient: SupabaseDataClient,
  windowDays = 60
): Promise<LinkAnalyticsData> {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - windowDays)
  since.setUTCMinutes(0, 0, 0)

  const last7Days = new Date()
  last7Days.setUTCDate(last7Days.getUTCDate() - 7)
  last7Days.setUTCMinutes(0, 0, 0)

  const [{ data: definitionRows, error: definitionError }, { data: clickRows, error: clickError }] =
    await Promise.all([
      dataClient
        .from('link_redirect_definitions')
        .select(
          'year, slug, label, target_url, origin, campaign, variant, active, deployment_region, deployment_location, deployment_notes, deployed_at, updated_at'
        )
        .order('origin', { ascending: true })
        .order('slug', { ascending: true }),
      dataClient
        .from('link_redirect_clicks')
        .select(
          'year, slug, status, target_url, origin, campaign, variant, referrer_domain, device_type, browser_family, country, clicked_at_hour'
        )
        .eq('status', 'redirected')
        .gte('clicked_at_hour', since.toISOString()),
    ])

  if (definitionError) {
    throw definitionError
  }

  if (clickError) {
    throw clickError
  }

  const definitions = (definitionRows ?? []) as LinkDefinition[]
  const clicks = (clickRows ?? []) as ClickRow[]
  const clicksByLink = new Map<string, ClickRow[]>()

  for (const click of clicks) {
    const key = `${click.year}/${click.slug}`
    const rows = clicksByLink.get(key)
    if (rows) {
      rows.push(click)
    } else {
      clicksByLink.set(key, [click])
    }
  }

  const links = definitions.map<LinkAnalyticsSummary>((definition) => {
    const key = `${definition.year}/${definition.slug}`
    const rows = clicksByLink.get(key) ?? []
    const weekdayBuckets = emptyWeekdays()
    const hourlyBuckets = emptyHours()
    const dailyBuckets = createDailyBuckets(windowDays)
    const dailyIndex = new Map(dailyBuckets.map((bucket, index) => [bucket.key, index]))
    const countryMap = new Map<string, number>()
    const deviceMap = new Map<string, number>()
    const browserMap = new Map<string, number>()
    const referrerMap = new Map<string, number>()
    let clicksLast7Days = 0

    for (const row of rows) {
      const clickedAt = new Date(row.clicked_at_hour)
      const weekday = getMunichWeekdayIndex(clickedAt)
      const hour = getMunichHour(clickedAt)
      const dayKey = getMunichDateKey(clickedAt)
      const dayIndex = dailyIndex.get(dayKey)

      weekdayBuckets[weekday].count += 1
      hourlyBuckets[hour].count += 1

      if (dayIndex !== undefined) {
        dailyBuckets[dayIndex].count += 1
      }

      if (clickedAt >= last7Days) {
        clicksLast7Days += 1
      }

      increment(countryMap, row.country)
      increment(deviceMap, row.device_type)
      increment(browserMap, row.browser_family)
      increment(referrerMap, row.referrer_domain)
    }

    return {
      key,
      url: `${LINK_BASE_URL}/q/${definition.year}/${definition.slug}`,
      definition,
      totalClicks: rows.length,
      clicksLast7Days,
      averageClicksPerDay: Number((rows.length / windowDays).toFixed(2)),
      bestWeekday: topBucket(weekdayBuckets),
      bestHour: topBucket(hourlyBuckets),
      weekdayBuckets,
      hourlyBuckets,
      dailyBuckets,
      countryBuckets: toTopBuckets(countryMap),
      deviceBuckets: toTopBuckets(deviceMap),
      browserBuckets: toTopBuckets(browserMap),
      referrerBuckets: toTopBuckets(referrerMap),
    }
  })

  links.sort((a, b) => b.totalClicks - a.totalClicks || a.definition.slug.localeCompare(b.definition.slug))

  const totalClicks = links.reduce((sum, link) => sum + link.totalClicks, 0)
  const clicksLast7Days = links.reduce((sum, link) => sum + link.clicksLast7Days, 0)

  return {
    generatedAt: new Date().toISOString(),
    windowDays,
    totals: {
      links: links.length,
      clicks: totalClicks,
      clicksLast7Days,
      averageClicksPerDay: Number((totalClicks / windowDays).toFixed(2)),
    },
    links,
  }
}
