import 'server-only'

import { cache } from 'react'
import { headers } from 'next/headers'
import type { DashboardEvent, DashboardMember, DashboardTab } from '@/app/components/dashboard/types'
import type { DashboardInitialData } from '@/app/dashboard/lib/initialDataTypes'
import { isLocalDevBypassEnabled } from '@/lib/devBypass'
import { NftRequestAdminError, requireNftRequestAdmin } from '@/lib/server/nftRequestAdmin'
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
}

type EventRegistrationRow = {
  event_id: string | number
  member_id: number
}

const NFT_ADMIN_MEMBER_IDS = new Set([0, 99, 107, 26, 126])
const MEMBER_COLUMNS =
  'id, created_at, Name, Role, Status, Department, "Project/Task", "Area of Expertise", Picture, "Active Semesters", Uni, "Semester Joined", Degree, Phone, "Private Email", "TBC Email", Linkedin, Telegram, Discord, Instagram, Twitter, "Size Merch"'
const EVENT_COLUMNS = 'id, title, description, start_at, end_at, location, organizer_department, capacity_total'

const emptyInitialData = (): DashboardInitialData => ({
  allMembers: [],
  canManageNftRequests: false,
  events: [],
  hasSpecialAccess: false,
  member: null,
  message: null,
  viewedMemberHasSpecialAccess: false,
})

const routeNeedsEvents = (tab: DashboardTab) => tab === 'events'
const routeNeedsMembers = (tab: DashboardTab) => tab === 'members' || tab === 'stats'

const getRequestForCurrentHost = async () => {
  const headerStore = await headers()
  const host = headerStore.get('host') || 'localhost'
  const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https'

  return new Request(`${protocol}://${host}/dashboard`)
}

const getCanManageNftRequests = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  request: Request
) => {
  try {
    await requireNftRequestAdmin(supabase, request)
    return true
  } catch (error) {
    if (error instanceof NftRequestAdminError && (error.status === 401 || error.status === 403)) {
      return false
    }

    throw error
  }
}

const loadUpcomingEvents = async (
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  memberId: number,
  limit = 6
): Promise<DashboardEvent[]> => {
  const { data: eventsData, error: eventsError } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .limit(limit)

  if (eventsError) {
    throw eventsError
  }

  const typedEventsData = (eventsData ?? []) as EventRow[]
  if (typedEventsData.length === 0) {
    return []
  }

  const eventIds = typedEventsData.map((event) => event.id)
  const { data: registrationsData, error: registrationsError } = await supabase
    .from('event_registrations')
    .select('event_id, member_id')
    .in('event_id', eventIds)

  if (registrationsError) {
    throw registrationsError
  }

  const typedRegistrationsData = (registrationsData ?? []) as EventRegistrationRow[]
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

  return typedEventsData.map((event) => {
    const eventRegistrations = registrationsByEventId.get(String(event.id)) ?? []

    return {
      ...event,
      current_registrations: eventRegistrations.length,
      is_registered: eventRegistrations.some((registration) => registration.member_id === memberId),
    }
  })
}

export const loadDashboardInitialData = cache(async (routeTab: DashboardTab): Promise<DashboardInitialData> => {
  const supabase = await createSupabaseServerClient()
  const request = await getRequestForCurrentHost()
  const devBypass = isLocalDevBypassEnabled(new URL(request.url).hostname)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (!devBypass) {
      return {
        ...emptyInitialData(),
        message: { type: 'error', text: 'You need to sign in to view the dashboard.' },
      }
    }

    return {
      ...emptyInitialData(),
      canManageNftRequests: await getCanManageNftRequests(supabase, request),
    }
  }

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
  const nftAdminAccessPromise = Promise.resolve(NFT_ADMIN_MEMBER_IDS.has(member.id))
  const allMembersPromise = routeNeedsMembers(routeTab)
    ? supabase.from('members_main').select(MEMBER_COLUMNS).order('Name', { ascending: true })
    : Promise.resolve({ data: [] as DashboardMember[], error: null })
  const eventsPromise = routeNeedsEvents(routeTab)
    ? loadUpcomingEvents(supabase, member.id)
    : Promise.resolve([] as DashboardEvent[])

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
    allMembers: (allMembersData ?? []) as DashboardMember[],
    canManageNftRequests,
    events,
    hasSpecialAccess: (specialAccessResult as AccessResponse) === true,
    member,
    message: null,
    viewedMemberHasSpecialAccess: (viewedMemberAccessResult as AccessResponse) === true,
  }
})
