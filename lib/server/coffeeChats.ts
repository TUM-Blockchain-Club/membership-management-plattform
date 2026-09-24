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
  formatCoffeeChatDate,
  formatCoffeeChatMonth,
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

async function sendMail(
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<void> {
  const apiKey = process.env.MAILGUN_API_KEY
  const domain = process.env.MAILGUN_DOMAIN || 'mg.tum-blockchain.com'

  if (!apiKey) {
    throw new Error('MAILGUN_API_KEY is not configured')
  }

  const form = new URLSearchParams()
  form.append('from', 'TBC Coffee Chats <coffeechats@mg.tum-blockchain.com>')
  form.append('to', to)
  form.append('subject', subject)
  form.append('html', html)
  if (text) {
    form.append('text', text)
  }

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

  const displayMonth = formatCoffeeChatMonth(month)
  const formattedDeadline = formatCoffeeChatDate(meetDeadline)

  const partnersHtml = thirdPersonName && thirdPersonEmail
    ? `<a href="mailto:${escapeEmailHtml(partnerEmail)}" style="color: #2563eb; text-decoration: underline; font-weight: 600;">${escapeEmailHtml(partnerName)}</a> (${escapeEmailHtml(partnerEmail)}) &amp; <a href="mailto:${escapeEmailHtml(thirdPersonEmail)}" style="color: #2563eb; text-decoration: underline; font-weight: 600;">${escapeEmailHtml(thirdPersonName)}</a> (${escapeEmailHtml(thirdPersonEmail)})`
    : `<a href="mailto:${escapeEmailHtml(partnerEmail)}" style="color: #2563eb; text-decoration: underline; font-weight: 600;">${escapeEmailHtml(partnerName)}</a> (${escapeEmailHtml(partnerEmail)})`

  const partnersPlainText = thirdPersonName && thirdPersonEmail
    ? `${partnerName} (${partnerEmail}) and ${thirdPersonName} (${thirdPersonEmail})`
    : `${partnerName} (${partnerEmail})`

  const deadlineHtml = formattedDeadline
    ? `<tr>
        <td style="padding: 12px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #475569;" class="email-muted">
          🗓️ Target meeting date: <strong style="color: #0f172a;" class="email-title">${escapeEmailHtml(formattedDeadline)}</strong>
        </td>
      </tr>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Your Coffee Chat for ${escapeEmailHtml(displayMonth)}</title>
  <style>
    @media (prefers-color-scheme: dark) {
      body, .email-bg { background-color: #0b0f17 !important; }
      .email-card { background-color: #161e2e !important; border-color: #26334d !important; }
      .email-title { color: #f8fafc !important; }
      .email-text { color: #cbd5e1 !important; }
      .email-box { background-color: #1e293b !important; border-color: #334155 !important; }
      .email-muted { color: #94a3b8 !important; }
      .email-footer { color: #64748b !important; border-color: #26334d !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-bg" style="background-color: #f4f5f7; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-card" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; padding: 32px; text-align: left; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <tr>
            <td>
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #2563eb; margin-bottom: 8px;">TUM Blockchain Club &bull; Coffee Chats</div>
              <h1 class="email-title" style="margin: 0 0 20px 0; color: #0f172a; font-size: 22px; font-weight: 700; line-height: 1.3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Your Coffee Chat for ${escapeEmailHtml(displayMonth)}</h1>
              
              <p class="email-text" style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Hi ${escapeEmailHtml(toName)},</p>
              
              <p class="email-text" style="margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">You have been paired for this month&apos;s TBC Coffee Chat round!</p>
              
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-box" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 0 0 24px 0; padding: 18px 20px;">
                <tr>
                  <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;" class="email-muted">
                    Matched With
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #0f172a; line-height: 1.5;" class="email-title">
                    ${partnersHtml}
                  </td>
                </tr>
                ${deadlineHtml}
              </table>

              <div style="margin: 28px 0 20px 0; text-align: left;">
                <a href="https://plattform.tum-blockchain.com/coffee-chats/my-match" style="display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">View Match on Platform &rarr;</a>
              </div>

              <p class="email-muted" style="margin: 20px 0 0 0; color: #64748b; font-size: 13px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                Once you meet up, grab a coffee, snap a selfie together, and log your session on the platform to share it in the community gallery!
              </p>

              <div class="email-footer" style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                TUM Blockchain Club &mdash; <a href="https://plattform.tum-blockchain.com" style="color: #64748b; text-decoration: underline;">plattform.tum-blockchain.com</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const plainText = `Hi ${toName},

You have been paired for this month's TBC Coffee Chat round (${displayMonth})!

Matched with: ${partnersPlainText}
${formattedDeadline ? `Try to meet before: ${formattedDeadline}\n` : ''}
View your match details and profile on the platform:
https://plattform.tum-blockchain.com/coffee-chats/my-match

Once you meet up, grab a coffee, snap a selfie together, and upload it to the platform gallery!

TUM Blockchain Club — plattform.tum-blockchain.com`

  await sendMail(toEmail, `Your TBC Coffee Chat match for ${displayMonth}`, html, plainText)
}

export async function sendSignupConfirmEmail(opts: SignupConfirmOptions): Promise<void> {
  const { toEmail, toName, month, signupDeadline } = opts

  const displayMonth = formatCoffeeChatMonth(month)
  const formattedDeadline = formatCoffeeChatDate(signupDeadline)

  const deadlineHtml = formattedDeadline
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-box" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 0 0 24px 0; padding: 14px 18px;">
        <tr>
          <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #475569;" class="email-muted">
            ⏳ Signup window closes: <strong style="color: #0f172a;" class="email-title">${escapeEmailHtml(formattedDeadline)}</strong>
          </td>
        </tr>
      </table>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>You're signed up for Coffee Chats!</title>
  <style>
    @media (prefers-color-scheme: dark) {
      body, .email-bg { background-color: #0b0f17 !important; }
      .email-card { background-color: #161e2e !important; border-color: #26334d !important; }
      .email-title { color: #f8fafc !important; }
      .email-text { color: #cbd5e1 !important; }
      .email-box { background-color: #1e293b !important; border-color: #334155 !important; }
      .email-muted { color: #94a3b8 !important; }
      .email-footer { color: #64748b !important; border-color: #26334d !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-bg" style="background-color: #f4f5f7; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-card" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; padding: 32px; text-align: left; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <tr>
            <td>
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #2563eb; margin-bottom: 8px;">TUM Blockchain Club &bull; Coffee Chats</div>
              <h1 class="email-title" style="margin: 0 0 20px 0; color: #0f172a; font-size: 22px; font-weight: 700; line-height: 1.3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">You&apos;re signed up for Coffee Chats!</h1>
              
              <p class="email-text" style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Hi ${escapeEmailHtml(toName)},</p>
              
              <p class="email-text" style="margin: 0 0 20px 0; color: #334155; font-size: 15px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">You have successfully signed up for the <strong>${escapeEmailHtml(displayMonth)}</strong> TBC Coffee Chat round.</p>
              
              ${deadlineHtml}

              <div style="margin: 28px 0 20px 0; text-align: left;">
                <a href="https://plattform.tum-blockchain.com/coffee-chats/setup" style="display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">Review Matching Profile &rarr;</a>
              </div>

              <p class="email-muted" style="margin: 20px 0 0 0; color: #64748b; font-size: 13px; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                We will email you your match once pairings are generated. In the meantime, make sure your Coffee Chat profile preferences are up to date!
              </p>

              <div class="email-footer" style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                TUM Blockchain Club &mdash; <a href="https://plattform.tum-blockchain.com" style="color: #64748b; text-decoration: underline;">plattform.tum-blockchain.com</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const plainText = `Hi ${toName},

You have successfully signed up for the ${displayMonth} TBC Coffee Chat round.
${formattedDeadline ? `The signup window closes on ${formattedDeadline}.\n` : ''}
We will email you your match once pairings are generated. In the meantime, make sure your Coffee Chat profile preferences are up to date:
https://plattform.tum-blockchain.com/coffee-chats/setup

TUM Blockchain Club — plattform.tum-blockchain.com`

  await sendMail(toEmail, `TBC Coffee Chats ${displayMonth} — You're in!`, html, plainText)
}
