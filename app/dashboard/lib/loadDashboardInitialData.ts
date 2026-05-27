import 'server-only'

import { cache } from 'react'
import { headers } from 'next/headers'
import type { DashboardEvent, DashboardMember, DashboardTab } from '@/app/components/dashboard/types'
import type { DashboardInitialData } from '@/app/dashboard/lib/initialDataTypes'
import {
  getLocalDevBypassMemberId,
  hasLocalDevBypassSpecialAccess,
  isLocalDevBypassEnabled,
} from '@/lib/devBypass'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type AccessResponse = boolean | null

type EventRow = {
  id: string | number
  title: string
  description: string
  start_at: string
  end_at: string
  location: string
  organizer_department: string
  capacity_total: number
  event_kind: 'internal' | 'external'
  event_type: string | null
  priority: string | null
  external_status: string | null
  city: string | null
  format: string | null
  image_url: string | null
  event_link_url: string | null
  tally_url: string | null
  whatsapp_url: string | null
  is_hackathon: boolean
  attending_names: string[]
  all_day: boolean
}

type EventRegistrationRow = {
  event_id: string | number
  member_id: number
}

type EventInterestRow = {
  event_id: string | number
  member_id: number
}

const NFT_ADMIN_MEMBER_IDS = new Set([0, 99, 107, 26, 126])
const EVENTS_FETCH_LIMIT = 500
const MEMBER_COLUMNS =
  'id, created_at, Name, Role, Status, Department, "Project/Task", "Area of Expertise", Picture, Uni, "Semester Joined", Degree, Phone, "Private Email", "TBC Email", Linkedin, Telegram, Discord, Instagram, Twitter, "Size Merch"'
const EVENT_COLUMNS = 'id, title, description, start_at, end_at, location, organizer_department, capacity_total, event_kind, event_type, priority, external_status, city, format, image_url, event_link_url, tally_url, whatsapp_url, is_hackathon, attending_names, all_day'

const emptyInitialData = (): DashboardInitialData => ({
  allMembers: [],
  canManageNftRequests: false,
  events: [],
  hasSpecialAccess: false,
  member: null,
  message: null,
  viewedMemberHasSpecialAccess: false,
})

// 'all' is used by the shared layout to eagerly load every tab's data once.
const routeNeedsEvents  = (tab: DashboardTab | 'all') => tab === 'events'  || tab === 'all'
const routeNeedsMembers = (tab: DashboardTab | 'all') => tab === 'members' || tab === 'stats' || tab === 'all'
const isNftAdminMember = (memberId: number) => NFT_ADMIN_MEMBER_IDS.has(memberId)
const shouldLogServerPerf = () => process.env.PERF_LOG_SERVER === 'true'
const now = () => performance.now()
const roundMs = (start: number) => Math.round(now() - start)

const estimatePicturePayloadBytes = (members: DashboardMember[]) =>
  members.reduce((sum, member) => {
    const picture = member.Picture
    if (!picture) return sum
    if (typeof picture === 'string') return sum + picture.length
    if (typeof picture === 'object' && picture !== null && 'data' in picture) {
      const dataValue = (picture as { data?: unknown }).data
      if (Array.isArray(dataValue)) return sum + dataValue.length
    }

    return sum
  }, 0)

const estimateJsonBytes = (value: unknown) => {
  try {
    return JSON.stringify(value).length
  } catch {
    return 0
  }
}

const logDashboardPerf = (label: string, data: Record<string, unknown>) => {
  if (!shouldLogServerPerf()) return
  console.info('[dashboard-perf]', label, data)
}

const getRequestForCurrentHost = async () => {
  const headerStore = await headers()
  const host = headerStore.get('host') || 'localhost'
  const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https'

  return new Request(`${protocol}://${host}/dashboard`)
}

const loadUpcomingEvents = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  memberId: number,
  limit = EVENTS_FETCH_LIMIT
): Promise<DashboardEvent[]> => {
  const { data: eventsData, error: eventsError } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .order('start_at', { ascending: true })
    .limit(limit)

  if (eventsError) {
    throw eventsError
  }

  const typedEventsData = (eventsData ?? []) as EventRow[]
  if (typedEventsData.length === 0) {
    return []
  }

  const eventIds = typedEventsData.map((event) => event.id)

  const [registrationsResult, interestResult] = await Promise.all([
    supabase
      .from('event_registrations')
      .select('event_id, member_id, status')
      .in('event_id', eventIds),
    supabase
      .from('event_interest')
      .select('event_id, member_id')
      .in('event_id', eventIds),
  ])

  if (registrationsResult.error) {
    throw registrationsResult.error
  }

  if (interestResult.error) {
    throw interestResult.error
  }

  const typedRegistrationsData = (registrationsResult.data ?? []) as EventRegistrationRow[]
  const typedInterestData = (interestResult.data ?? []) as EventInterestRow[]

  const registrationsByEventId = new Map<string, EventRegistrationRow[]>()
  typedRegistrationsData.forEach((registration) => {
    const key = String(registration.event_id)
    const registrations = registrationsByEventId.get(key)
    if (registrations) {
      registrations.push(registration)
      return
    }
    registrationsByEventId.set(key, [registration])
  })

  const interestByEventId = new Map<string, EventInterestRow[]>()
  typedInterestData.forEach((row) => {
    const key = String(row.event_id)
    const rows = interestByEventId.get(key)
    if (rows) {
      rows.push(row)
      return
    }
    interestByEventId.set(key, [row])
  })

  return typedEventsData.map((event) => {
    const eventRegistrations = registrationsByEventId.get(String(event.id)) ?? []
    const eventInterests = interestByEventId.get(String(event.id)) ?? []

    const approved = eventRegistrations.filter((r) => (r as any).status === undefined || (r as any).status === 'approved')
    const isPending = eventRegistrations.some((r) => (r as any).status === 'pending' && r.member_id === memberId)

    return {
      ...event,
      current_registrations: approved.length,
      is_registered: approved.some((registration) => registration.member_id === memberId),
      is_pending: isPending,
      interest_count: eventInterests.length,
      is_interested: eventInterests.some((row) => row.member_id === memberId),
    }
  })
}

export const loadDashboardInitialData = cache(async (routeTab: DashboardTab | 'all'): Promise<DashboardInitialData> => {
  const totalStartedAt = now()
  const supabase = await createSupabaseServerClient()
  const request = await getRequestForCurrentHost()
  const devBypass = isLocalDevBypassEnabled(new URL(request.url).hostname)

  const authStartedAt = now()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  logDashboardPerf('auth.getUser', { routeTab, ms: roundMs(authStartedAt), devBypass, hasUser: Boolean(user) })

  if (!user) {
    if (!devBypass) {
      return {
        ...emptyInitialData(),
        message: { type: 'error', text: 'You need to sign in to view the dashboard.' },
      }
    }

    const dataClient = getSupabaseAdminClient() ?? supabase
    const devMemberId = getLocalDevBypassMemberId()
    const memberStartedAt = now()
    const { data: memberData, error: memberError } = await dataClient
      .from('members_main')
      .select(MEMBER_COLUMNS)
      .eq('id', devMemberId)
      .maybeSingle()
    logDashboardPerf('dev.member', { routeTab, memberId: devMemberId, ms: roundMs(memberStartedAt) })

    if (memberError || !memberData) {
      return {
        ...emptyInitialData(),
        canManageNftRequests: isNftAdminMember(devMemberId),
        message: {
          type: 'error',
          text: `Local dev auth bypass could not load members_main.id=${devMemberId}.`,
        },
      }
    }

    const member = memberData as DashboardMember
    const allMembersPromise = routeNeedsMembers(routeTab)
      ? dataClient.from('members_main').select(MEMBER_COLUMNS).order('Name', { ascending: true })
      : Promise.resolve({ data: [] as DashboardMember[], error: null })
    const eventsPromise = routeNeedsEvents(routeTab)
      ? loadUpcomingEvents(dataClient, member.id)
      : Promise.resolve([] as DashboardEvent[])
    const routeDataStartedAt = now()
    const [{ data: allMembersData, error: allMembersError }, events] = await Promise.all([
      allMembersPromise,
      eventsPromise,
    ])
    const allMembers = (allMembersData ?? []) as DashboardMember[]
    logDashboardPerf('dev.routeData', {
      routeTab,
      ms: roundMs(routeDataStartedAt),
      memberCount: allMembers.length,
      eventCount: events.length,
      jsonBytes: estimateJsonBytes(allMembers),
      pictureBytes: estimatePicturePayloadBytes(allMembers),
    })

    if (allMembersError) {
      return {
        ...emptyInitialData(),
        member,
        message: {
          type: 'error',
          text: `Local dev auth bypass could not load members: ${allMembersError.message || 'Please contact support.'}`,
        },
      }
    }

    return {
      allMembers,
      canManageNftRequests: isNftAdminMember(member.id) || hasLocalDevBypassSpecialAccess(),
      events,
      hasSpecialAccess: hasLocalDevBypassSpecialAccess(),
      member,
      message: null,
      viewedMemberHasSpecialAccess: hasLocalDevBypassSpecialAccess(),
    }
  }

  const memberStartedAt = now()
  const specialAccessPromise = supabase.rpc('has_special_access')
  const memberPromise = supabase
    .from('members_main')
    .select(MEMBER_COLUMNS)
    .ilike('TBC Email', user.email ?? '')
    .maybeSingle()

  const [{ data: specialAccessResult }, { data: memberData, error: memberError }] = await Promise.all([
    specialAccessPromise,
    memberPromise,
  ])
  logDashboardPerf('memberAndAccess', { routeTab, ms: roundMs(memberStartedAt) })

  if (memberError) {
    return {
      ...emptyInitialData(),
      message: {
        type: 'error',
        text: `Could not load your member data: ${memberError.message || 'Please contact support.'}`,
      },
    }
  }

  if (!memberData) {
    return {
      ...emptyInitialData(),
      message: { type: 'error', text: 'No member profile found for your account.' },
    }
  }

  const member = memberData as DashboardMember
  const viewedMemberAccessPromise = supabase.rpc('check_email_has_special_access', {
    check_email: member['TBC Email'],
  })
  const nftAdminAccessPromise = Promise.resolve(isNftAdminMember(member.id))
  const allMembersPromise = routeNeedsMembers(routeTab)
    ? supabase.from('members_main').select(MEMBER_COLUMNS).order('Name', { ascending: true })
    : Promise.resolve({ data: [] as DashboardMember[], error: null })
  const eventsPromise = routeNeedsEvents(routeTab)
    ? loadUpcomingEvents(supabase, member.id)
    : Promise.resolve([] as DashboardEvent[])

  const routeDataStartedAt = now()
  const [
    { data: viewedMemberAccessResult },
    canManageNftRequests,
    { data: allMembersData, error: allMembersError },
    events,
  ] = await Promise.all([
    viewedMemberAccessPromise,
    nftAdminAccessPromise,
    allMembersPromise,
    eventsPromise,
  ])
  const allMembers = (allMembersData ?? []) as DashboardMember[]
  logDashboardPerf('routeData', {
    routeTab,
    ms: roundMs(routeDataStartedAt),
    memberCount: allMembers.length,
    eventCount: events.length,
    jsonBytes: estimateJsonBytes(allMembers),
    pictureBytes: estimatePicturePayloadBytes(allMembers),
    totalMs: roundMs(totalStartedAt),
  })

  if (allMembersError) {
    return {
      ...emptyInitialData(),
      member,
      message: {
        type: 'error',
        text: `Could not load members: ${allMembersError.message || 'Please contact support.'}`,
      },
    }
  }

  return {
    allMembers,
    canManageNftRequests,
    events,
    hasSpecialAccess: (specialAccessResult as AccessResponse) === true,
    member,
    message: null,
    viewedMemberHasSpecialAccess: (viewedMemberAccessResult as AccessResponse) === true,
  }
})
