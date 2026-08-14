import 'server-only'

import { getCoffeeChatAdminClient } from '@/lib/coffee-chats/supabase'
import { getCoffeeChatViewer } from '@/lib/coffee-chats/viewer'
import { coffeeChatsDemoEnabled, demoMatch, demoMember, demoRound } from '@/lib/coffee-chats/demo'

export type CoffeeChatRoundSummary = {
  id: string
  month: string
  status: string
  signupDeadline: string | null
  meetDeadline: string | null
}

export type CoffeeChatPartner = {
  id: number
  name: string
  department: string | null
  interests: string[]
  favouriteCoffee: string | null
  favouriteSpots: string[]
  funFact: string | null
}

export type CoffeeChatMatch = {
  pair: {
    id: string
    status: string
    icebreakers: string[]
    selfieUrl: string | null
    dateMet: string | null
    rating: number | null
    highlightNote: string | null
  }
  partners: CoffeeChatPartner[]
  round: CoffeeChatRoundSummary
}

export type CoffeeChatHomeData = {
  firstName: string | null
  isProfileComplete: boolean
  isSignedUp: boolean
  openRound: CoffeeChatRoundSummary | null
  match: CoffeeChatMatch | null
}

type MemberRow = {
  id: number
  Name: string | null
  cc_active: boolean | null
  cc_interests: string[] | null
}

type RoundRow = {
  id: string
  month: string
  status: string
  signup_deadline: string | null
  meet_deadline: string | null
}

type PairRow = {
  id: string
  status: string
  person1_id: number
  person2_id: number
  person3_id: number | null
  icebreaker_q1: string | null
  icebreaker_q2: string | null
  icebreaker_q3: string | null
  selfie_path: string | null
  date_met: string | null
  rating: number | null
  highlight_note: string | null
}

type PartnerRow = {
  id: number
  Name: string | null
  Department: string | null
  cc_interests: string[] | null
  cc_favourite_coffee: string | null
  cc_favourite_spots: string[] | null
  cc_fun_fact: string | null
}

function toRoundSummary(round: RoundRow): CoffeeChatRoundSummary {
  return {
    id: round.id,
    month: round.month,
    status: round.status,
    signupDeadline: round.signup_deadline,
    meetDeadline: round.meet_deadline,
  }
}

export async function loadCoffeeChatHome(): Promise<CoffeeChatHomeData | null> {
  if (coffeeChatsDemoEnabled) {
    return {
      firstName: demoMember.Name.split(' ')[0],
      isProfileComplete: true,
      isSignedUp: true,
      openRound: {
        id: demoRound.id,
        month: demoRound.month,
        status: demoRound.status,
        signupDeadline: demoRound.signup_deadline,
        meetDeadline: demoRound.meet_deadline,
      },
      match: demoMatch,
    }
  }

  const viewer = await getCoffeeChatViewer()
  if (!viewer) return null

  const { supabase } = viewer
  const admin = getCoffeeChatAdminClient()
  const dataClient = admin ?? supabase
  const memberQuery = viewer.isDevBypass
    ? dataClient
        .from('members_main')
        .select('id, Name, cc_active, cc_interests')
        .eq('id', viewer.memberId ?? -1)
        .maybeSingle()
    : supabase
        .from('members_main')
        .select('id, Name, cc_active, cc_interests')
        .ilike('"TBC Email"', viewer.email ?? '')
        .maybeSingle()
  const [memberResult, openRoundResult, latestRoundResult] = await Promise.all([
    memberQuery,
    dataClient
      .from('cc_rounds')
      .select('id, month, status, signup_deadline, meet_deadline')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    dataClient
      .from('cc_rounds')
      .select('id, month, status, signup_deadline, meet_deadline')
      .in('status', ['paired', 'closed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const member = memberResult.data as MemberRow | null
  if (!member) return null

  const openRound = openRoundResult.data as RoundRow | null
  const latestRound = latestRoundResult.data as RoundRow | null
  const [signupResult, pairResult] = await Promise.all([
    openRound
      ? (viewer.isDevBypass ? dataClient : supabase)
          .from('cc_signups')
          .select('id')
          .eq('round_id', openRound.id)
          .eq('member_id', member.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    latestRound
      ? dataClient
          .from('cc_pairs')
          .select('id, status, person1_id, person2_id, person3_id, icebreaker_q1, icebreaker_q2, icebreaker_q3, selfie_path, date_met, rating, highlight_note')
          .eq('round_id', latestRound.id)
          .or(`person1_id.eq.${member.id},person2_id.eq.${member.id},person3_id.eq.${member.id}`)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const pair = pairResult.data as PairRow | null
  let match: CoffeeChatMatch | null = null

  if (pair && latestRound) {
    const partnerIds = [pair.person1_id, pair.person2_id, pair.person3_id]
      .filter((id): id is number => id !== null && id !== member.id)
    const [partnersResult, selfieResult] = await Promise.all([
      dataClient
        .from('members_main')
        .select('id, Name, Department, cc_interests, cc_favourite_coffee, cc_favourite_spots, cc_fun_fact')
        .in('id', partnerIds),
      pair.selfie_path && admin
        ? admin.storage
            .from('coffee-chat-selfies')
            .createSignedUrl(pair.selfie_path, 60 * 60)
        : Promise.resolve({ data: null }),
    ])

    match = {
      pair: {
        id: pair.id,
        status: pair.status,
        icebreakers: [pair.icebreaker_q1, pair.icebreaker_q2, pair.icebreaker_q3]
          .filter((question): question is string => Boolean(question)),
        selfieUrl: selfieResult.data?.signedUrl ?? null,
        dateMet: pair.date_met,
        rating: pair.rating,
        highlightNote: pair.highlight_note,
      },
      partners: ((partnersResult.data ?? []) as PartnerRow[]).map((partner) => ({
        id: partner.id,
        name: partner.Name ?? 'Your match',
        department: partner.Department,
        interests: partner.cc_interests ?? [],
        favouriteCoffee: partner.cc_favourite_coffee,
        favouriteSpots: partner.cc_favourite_spots ?? [],
        funFact: partner.cc_fun_fact,
      })),
      round: toRoundSummary(latestRound),
    }
  }

  return {
    firstName: member.Name?.split(' ')[0] ?? null,
    isProfileComplete: Boolean(member.cc_active && member.cc_interests?.length),
    isSignedUp: Boolean(signupResult.data),
    openRound: openRound ? toRoundSummary(openRound) : null,
    match,
  }
}
