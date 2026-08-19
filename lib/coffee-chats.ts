import type { Database } from '@/lib/types/database.types'

/* ==========================================================================
   1. Access Control Helpers (Client & Server Safe)
   ========================================================================== */

export type CoffeeChatAdminViewInput = {
  forceMemberView: boolean
  hasSpecialAccess: boolean
  isBoardMember: boolean
  isCoffeeChatAdmin?: boolean
}

export function canShowCoffeeChatAdmin(input: CoffeeChatAdminViewInput): boolean {
  if (input.forceMemberView) return false
  return input.hasSpecialAccess || input.isBoardMember || Boolean(input.isCoffeeChatAdmin)
}

/* ==========================================================================
   2. Date & Time Helpers
   ========================================================================== */

export function localDateToUtcIso(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day).toISOString()
}

export function localDateTimeToUtcIso(dateTimeString: string): string {
  const [datePart, timePart = '00:00'] = dateTimeString.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  return new Date(year, month - 1, day, hour, minute).toISOString()
}

export function dateToCalendarDate(date: Date, timeZone = 'Europe/Berlin'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getSignupError(
  round: { status: string; signupDeadline: string | null },
  now = new Date(),
): string | null {
  if (round.status !== 'open') return 'This round is not currently open for signups.'
  if (round.signupDeadline && now > new Date(round.signupDeadline)) {
    return 'The signup deadline for this round has passed.'
  }
  return null
}

export function getCoffeeChatProfileError(interests: string[]): string | null {
  return interests.length > 0 ? null : 'Select at least one interest before saving.'
}

/* ==========================================================================
   3. Member Experience & Step State
   ========================================================================== */

export type CoffeeChatNextStep =
  | { kind: 'preferences'; label: 'Set matching preferences'; href: '/coffee-chats/setup' }
  | { kind: 'join'; label: 'Join this round'; href: null }
  | { kind: 'waiting'; label: 'Waiting for match'; href: null }
  | { kind: 'match'; label: 'View match'; href: null }
  | { kind: 'completed'; label: 'Meeting completed'; href: null }
  | { kind: 'idle'; label: 'Next round coming soon'; href: null }

export function getCoffeeChatNextStep(input: {
  hasMatch: boolean
  isProfileComplete: boolean
  isSignedUp: boolean
  matchIsComplete: boolean
  roundIsOpen: boolean
}): CoffeeChatNextStep {
  if (!input.isProfileComplete) {
    return {
      kind: 'preferences',
      label: 'Set matching preferences',
      href: '/coffee-chats/setup',
    }
  }

  if (input.roundIsOpen && !input.isSignedUp && (!input.hasMatch || input.matchIsComplete)) {
    return {
      kind: 'join',
      label: 'Join this round',
      href: null,
    }
  }

  if (input.hasMatch) {
    return input.matchIsComplete
      ? { kind: 'completed', label: 'Meeting completed', href: null }
      : { kind: 'match', label: 'View match', href: null }
  }

  if (input.isSignedUp) {
    return { kind: 'waiting', label: 'Waiting for match', href: null }
  }

  return { kind: 'idle', label: 'Next round coming soon', href: null }
}

export type KnownMemberOption = {
  id: number
  name: string
  department: string | null
}

export function filterKnownMembers(members: KnownMemberOption[], query: string): KnownMemberOption[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return members

  return members.filter((member) => {
    const nameMatch = member.name.toLowerCase().includes(normalized)
    const departmentMatch = member.department?.toLowerCase().includes(normalized) ?? false
    return nameMatch || departmentMatch
  })
}

/* ==========================================================================
   4. Meeting Updates & Image Upload Validation
   ========================================================================== */

export const MAX_SELFIE_BYTES = 5 * 1024 * 1024 // 5 MB

export function validateSelfieUpload(
  bytes: Uint8Array,
  _mimeType?: string,
): { contentType: string; extension: 'jpeg' | 'png' | 'webp' } {
  if (bytes.length > MAX_SELFIE_BYTES) {
    throw new Error('Selfies must be 5 MB or smaller.')
  }

  // Check JPEG magic bytes: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: 'image/jpeg', extension: 'jpeg' }
  }

  // Check PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { contentType: 'image/png', extension: 'png' }
  }

  // Check WebP magic bytes: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { contentType: 'image/webp', extension: 'webp' }
  }

  throw new Error('The selected file is not a valid JPEG, PNG, or WebP image.')
}

type PairUpdate = Database['public']['Tables']['cc_pairs']['Update']
type SignOffField = 'person1_signed_off' | 'person2_signed_off' | 'person3_signed_off'

export type MeetingUpdateInput = {
  intent: 'complete-meeting' | 'upload-selfie'
  signOffField: SignOffField
  selfiePath: string | null
  dateMet: string | null
  highlightNote: string | null
}

export function buildMeetingUpdate(input: MeetingUpdateInput): PairUpdate {
  const update: PairUpdate = {}

  if (input.intent === 'complete-meeting') {
    update[input.signOffField] = true
    update.status = 'met'
    if (input.dateMet) update.date_met = input.dateMet
    if (input.highlightNote) update.highlight_note = input.highlightNote
  }

  if (input.selfiePath) update.selfie_path = input.selfiePath

  return update
}

/* ==========================================================================
   5. Pairing Algorithm
   ========================================================================== */

export interface PairingMember {
  id: number
  interests: string[]
  alreadyKnow: number[]
  priorPartners: number[]
}

export interface PairingResult {
  person1Id: number
  person2Id: number
  person3Id?: number
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function shouldExclude(a: PairingMember, b: PairingMember): boolean {
  return (
    a.alreadyKnow.includes(b.id) ||
    b.alreadyKnow.includes(a.id) ||
    a.priorPartners.includes(b.id) ||
    b.priorPartners.includes(a.id)
  )
}

export function runPairing(members: PairingMember[]): PairingResult[] {
  if (members.length < 2) return []

  const pool = shuffle([...members])
  const results: PairingResult[] = []

  while (pool.length > 0) {
    if (pool.length === 1) {
      if (results.length > 0) {
        results[results.length - 1].person3Id = pool[0].id
      }
      break
    }

    const compatibleCount = (member: PairingMember) =>
      pool.filter((candidate) => candidate.id !== member.id && !shouldExclude(member, candidate)).length

    pool.sort((a, b) => compatibleCount(a) - compatibleCount(b))
    const a = pool.shift()!
    const compatiblePartners = pool.filter((candidate) => !shouldExclude(a, candidate))
    const b =
      compatiblePartners.sort((left, right) => compatibleCount(left) - compatibleCount(right))[0] ?? pool[0]

    pool.splice(
      pool.findIndex((candidate) => candidate.id === b.id),
      1,
    )
    results.push({ person1Id: a.id, person2Id: b.id })
  }

  return results
}

/* ==========================================================================
   6. Shared Types
   ========================================================================== */

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

/* ==========================================================================
   7. Email HTML Escaping
   ========================================================================== */

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/* ==========================================================================
   8. Demo Mock Data
   ========================================================================== */

export const coffeeChatsDemoEnabled = process.env.NEXT_PUBLIC_COFFEE_CHATS_DEMO === 'true'

export const isCoffeeChatsDemoClient = () =>
  coffeeChatsDemoEnabled ||
  (typeof document !== 'undefined' &&
    document.querySelector('[data-coffee-chats-demo="true"]') !== null)

export const demoRound = {
  id: 'demo-round-august-2026',
  month: '2026-08',
  status: 'open',
  signup_deadline: '2026-08-21T21:59:00.000Z',
  meet_deadline: '2026-08-31T21:59:00.000Z',
  created_at: '2026-08-01T09:00:00.000Z',
}

export const demoMember = {
  id: 1,
  Name: 'Yesi Demo',
  Department: 'Web3 Talents',
  cc_active: true,
  cc_interests: ['Blockchain', 'DeFi', 'Travel', 'Music'],
  cc_study_programme: 'MSc Management & Technology, TUM',
  cc_favourite_coffee: 'Oat flat white',
  cc_favourite_spots: ['Lost Weekend', 'Standl 20'],
  cc_fun_fact: 'I once planned a club event while travelling across three countries.',
}

export const demoDashboardMember = {
  id: 1,
  created_at: '2026-08-01T09:00:00.000Z',
  Name: demoMember.Name,
  Role: 'Board Member',
  Status: 'Active',
  Department: demoMember.Department,
  'Project/Task': 'Coffee Chats',
  'Area of Expertise': 'Community building',
  Picture: null,
  Uni: 'TUM',
  'Semester Joined': 'WS 2025',
  Degree: demoMember.cc_study_programme,
  Phone: null,
  'Private Email': 'yesi.demo@example.com',
  'TBC Email': 'yesi.demo@tum-blockchain.com',
  Linkedin: null,
  Telegram: null,
  Discord: null,
  Instagram: null,
  Twitter: null,
  'Size Merch': null,
}

export const demoMatch: CoffeeChatMatch = {
  pair: {
    id: 'demo-pair-1',
    status: 'pending',
    icebreakers: [
      'What first pulled you into blockchain — was there a specific project or moment?',
      'What place have you visited that completely defied your expectations?',
      'How did you first hear about TBC and what made you join?',
    ],
    selfieUrl: null,
    dateMet: null,
    highlightNote: null,
  },
  partners: [
    {
      id: 2,
      name: 'Alex Morgan',
      department: 'IT & Development',
      interests: ['Blockchain', 'Software Dev', 'Travel'],
      favouriteCoffee: 'Cappuccino',
      favouriteSpots: ['Lost Weekend', 'Standl 20'],
      funFact: 'Built a first smart contract during a train ride to Berlin.',
    },
  ],
  round: {
    month: demoRound.month,
    id: demoRound.id,
    status: 'paired',
    signupDeadline: demoRound.signup_deadline,
    meetDeadline: demoRound.meet_deadline,
  },
}

export const demoGallery = [
  {
    id: 'demo-gallery-1',
    selfie_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80',
    date_met: '2026-07-18',
    highlight_note: 'Great conversation about building communities in Web3.',
    round: { month: 'July 2026' },
  },
  {
    id: 'demo-gallery-2',
    selfie_url: 'https://images.unsplash.com/photo-1528605105345-5344ea20e269?auto=format&fit=crop&w=900&q=80',
    date_met: '2026-06-22',
    highlight_note: 'From DeFi research to favourite Munich coffee spots.',
    round: { month: 'June 2026' },
  },
  {
    id: 'demo-gallery-3',
    selfie_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=900&q=80',
    date_met: '2026-05-15',
    highlight_note: 'New project ideas and a plan to meet again.',
    round: { month: 'May 2026' },
  },
]

export const demoRounds = [
  demoRound,
  {
    ...demoRound,
    id: 'demo-round-july-2026',
    month: '2026-07',
    status: 'paired',
    signup_deadline: '2026-07-10T21:59:00.000Z',
    meet_deadline: '2026-07-31T21:59:00.000Z',
    created_at: '2026-07-01T09:00:00.000Z',
  },
]
