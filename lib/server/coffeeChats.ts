import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getLocalDevBypassMemberId, isLocalDevBypassEnabled } from '@/lib/devBypass'
import {
  coffeeChatsDemoEnabled,
  demoMatch,
  demoMember,
  demoRound,
  escapeEmailHtml,
  isCoffeeChatProfileComplete,
  type CoffeeChatHomeData,
  type CoffeeChatMatch,
  type CoffeeChatRoundSummary,
} from '@/lib/coffee-chats'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCoffeeChatAdminClient(): SupabaseClient<any, 'public', any> | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return getSupabaseAdminClient() as SupabaseClient<any, 'public', any> | null
}

export type CoffeeChatViewer = {
  email: string | null
  isDevBypass: boolean
  memberId: number | null
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
}

export async function getCoffeeChatViewer(): Promise<CoffeeChatViewer | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    return {
      email: user.email ?? null,
      isDevBypass: false,
      memberId: null,
      supabase,
    }
  }

  const headerStore = await headers()
  const hostname = (headerStore.get('host') ?? '').split(':')[0]
  if (!isLocalDevBypassEnabled(hostname)) return null

  return {
    email: null,
    isDevBypass: true,
    memberId: getLocalDevBypassMemberId(),
    supabase,
  }
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
  icebreaker_q1: string | null
  icebreaker_q2: string | null
  icebreaker_q3: string | null
  person1_id: number
  person2_id: number
  person3_id: number | null
  selfie_path: string | null
  date_met: string | null
  highlight_note: string | null
}

type PairWithRoundRow = PairRow & {
  cc_rounds: RoundRow | RoundRow[]
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
  const [memberResult, openRoundResult] = await Promise.all([
    memberQuery,
    dataClient
      .from('cc_rounds')
      .select('id, month, status, signup_deadline, meet_deadline')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const member = memberResult.data as MemberRow | null
  if (!member) return null

  const openRound = openRoundResult.data as RoundRow | null
  const pairFilter = `person1_id.eq.${member.id},person2_id.eq.${member.id},person3_id.eq.${member.id}`
  const pairColumns =
    'id, status, person1_id, person2_id, person3_id, icebreaker_q1, icebreaker_q2, icebreaker_q3, selfie_path, date_met, highlight_note, created_at, cc_rounds!inner(id, month, status, signup_deadline, meet_deadline)'
  const [signupResult, pendingPairResult, latestPairResult] = await Promise.all([
    openRound
      ? (viewer.isDevBypass ? dataClient : supabase)
          .from('cc_signups')
          .select('id')
          .eq('round_id', openRound.id)
          .eq('member_id', member.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    dataClient
      .from('cc_pairs')
      .select(pairColumns)
      .or(pairFilter)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    dataClient
      .from('cc_pairs')
      .select(pairColumns)
      .or(pairFilter)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const pair = (pendingPairResult.data ?? latestPairResult.data) as PairWithRoundRow | null
  const pairRound = Array.isArray(pair?.cc_rounds) ? pair.cc_rounds[0] : pair?.cc_rounds
  let match: CoffeeChatMatch | null = null

  if (pair && pairRound) {
    const partnerIds = [pair.person1_id, pair.person2_id, pair.person3_id].filter(
      (id): id is number => id !== null && id !== member.id,
    )
    const [partnersResult, selfieResult] = await Promise.all([
      dataClient
        .from('members_main')
        .select('id, Name, Department, cc_interests, cc_favourite_coffee, cc_favourite_spots, cc_fun_fact')
        .in('id', partnerIds),
      pair.selfie_path && admin
        ? admin.storage.from('coffee-chat-selfies').createSignedUrl(pair.selfie_path, 60 * 60)
        : Promise.resolve({ data: null }),
    ])

    match = {
      pair: {
        id: pair.id,
        status: pair.status,
        icebreakers: [pair.icebreaker_q1, pair.icebreaker_q2, pair.icebreaker_q3].filter(
          (question): question is string => Boolean(question),
        ),
        selfieUrl: selfieResult.data?.signedUrl ?? null,
        dateMet: pair.date_met,
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
      round: toRoundSummary(pairRound),
    }
  }

  return {
    firstName: member.Name?.split(' ')[0] ?? null,
    isProfileComplete: isCoffeeChatProfileComplete(member.cc_active, member.cc_interests),
    isSignedUp: Boolean(signupResult.data),
    openRound: openRound ? toRoundSummary(openRound) : null,
    match,
  }
}

interface MatchEmailOptions {
  toEmail: string
  toName: string
  partnerName: string
  partnerEmail: string
  thirdPersonName?: string
  thirdPersonEmail?: string
  month: string
  meetDeadline?: string | null
}

interface SignupConfirmOptions {
  toEmail: string
  toName: string
  month: string
  signupDeadline?: string | null
}

function buildMailgunAuth(): string {
  const apiKey = process.env.MAILGUN_API_KEY ?? ''
  return 'Basic ' + Buffer.from(`api:${apiKey}`).toString('base64')
}

function mailgunBase(): string {
  const region = process.env.MAILGUN_REGION || 'eu'
  return region === 'eu' ? 'https://api.eu.mailgun.net' : 'https://api.mailgun.net'
}

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN || 'mg.tum-blockchain.com'

  if (!apiKey) {
    throw new Error('MAILGUN_API_KEY is not configured')
  }

  const form = new URLSearchParams()
  form.append('from', 'TBC Coffee Chats <coffechats@mg.tum-blockchain.com>')
  form.append('to', to)
  form.append('subject', subject)
  form.append('html', html)

  const response = await fetch(`${mailgunBase()}/v3/${domain}/messages`, {
    method: 'POST',
    headers: {
      Authorization: buildMailgunAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  })

  if (!response.ok) {
    throw new Error(`Mailgun rejected the message with status ${response.status}`)
  }
}

export async function sendMatchEmail(opts: MatchEmailOptions): Promise<void> {
  const {
    toEmail,
    toName,
    partnerName,
    partnerEmail,
    thirdPersonName,
    thirdPersonEmail,
    month,
    meetDeadline,
  } = opts

  const partners = thirdPersonName
    ? `${escapeEmailHtml(partnerName)} (${escapeEmailHtml(partnerEmail)}) and ${escapeEmailHtml(thirdPersonName)} (${escapeEmailHtml(thirdPersonEmail ?? '')})`
    : `${escapeEmailHtml(partnerName)} (${escapeEmailHtml(partnerEmail)})`

  const deadlineText = meetDeadline
    ? `<p>Try to meet before <strong>${escapeEmailHtml(meetDeadline)}</strong>.</p>`
    : ''

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0a0a0a; color:#e5e5e5; margin:0; padding:0; }
  .wrap { max-width:600px; margin:40px auto; background:#141414; border:1px solid #262626; border-radius:12px; padding:32px; }
  h1 { color:#fff; font-size:22px; margin-top:0; }
  a { color:#60a5fa; }
  .footer { margin-top:32px; color:#525252; font-size:12px; }
</style></head>
<body>
<div class="wrap">
  <h1>Your Coffee Chat for ${escapeEmailHtml(month)}</h1>
  <p>Hi ${escapeEmailHtml(toName)},</p>
  <p>You have been matched with <strong>${partners}</strong> for this month&apos;s TBC Coffee Chat.</p>
  ${deadlineText}
  <p>Once you have met, log your session on the <a href="https://plattform.tum-blockchain.com/coffee-chats/my-match">Coffee Chats platform</a> and upload your selfie for the gallery!</p>
  <div class="footer">TUM Blockchain Club &mdash; plattform.tum-blockchain.com</div>
</div>
</body>
</html>`

  await sendMail(toEmail, `Your TBC Coffee Chat match for ${month}`, html)
}

export async function sendSignupConfirmEmail(opts: SignupConfirmOptions): Promise<void> {
  const { toEmail, toName, month, signupDeadline } = opts

  const deadlineText = signupDeadline
    ? `<p>The signup window closes on <strong>${escapeEmailHtml(signupDeadline)}</strong>. Matches will be sent out shortly after.</p>`
    : ''

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0a0a0a; color:#e5e5e5; margin:0; padding:0; }
  .wrap { max-width:600px; margin:40px auto; background:#141414; border:1px solid #262626; border-radius:12px; padding:32px; }
  h1 { color:#fff; font-size:22px; margin-top:0; }
  a { color:#60a5fa; }
  .footer { margin-top:32px; color:#525252; font-size:12px; }
</style></head>
<body>
<div class="wrap">
  <h1>You&apos;re signed up for Coffee Chats!</h1>
  <p>Hi ${escapeEmailHtml(toName)},</p>
  <p>You have successfully signed up for the <strong>${escapeEmailHtml(month)}</strong> TBC Coffee Chat round.</p>
  ${deadlineText}
  <p>We will email you your match once pairings are done. In the meantime, make sure your <a href="https://plattform.tum-blockchain.com/coffee-chats/setup">Coffee Chat profile</a> is up to date so we can find you the best match.</p>
  <div class="footer">TUM Blockchain Club &mdash; plattform.tum-blockchain.com</div>
</div>
</body>
</html>`

  await sendMail(toEmail, `TBC Coffee Chats ${month} — You&apos;re in!`, html)
}
