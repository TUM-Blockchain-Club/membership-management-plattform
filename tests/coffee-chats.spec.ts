import { expect, test } from '@playwright/test'

import { MAX_SELFIE_BYTES, validateSelfieUpload } from '../lib/coffee-chats/uploads'
import { dateToCalendarDate, getSignupError, localDateTimeToUtcIso } from '../lib/coffee-chats/rounds'
import { runPairing } from '../lib/coffee-chats/pairing'
import { escapeEmailHtml } from '../lib/coffee-chats/emails'
import { filterKnownMembers } from '../lib/coffee-chats/profiles'
import { getCoffeeChatNextStep } from '../lib/coffee-chats/experience'
import { buildMeetingUpdate } from '../lib/coffee-chats/meeting'
import { canShowCoffeeChatAdmin } from '../lib/coffee-chats/access'
import { getDashboardTabForPathname } from '../app/dashboard/lib/routes'

test('selfie upload rejects non-image bytes disguised as JPEG', () => {
  expect(() =>
    validateSelfieUpload(new Uint8Array([0x74, 0x65, 0x78, 0x74]), 'image/jpeg'),
  ).toThrow('The selected file is not a valid JPEG, PNG, or WebP image.')
})

test('selfie upload rejects files larger than five megabytes', () => {
  const bytes = new Uint8Array(MAX_SELFIE_BYTES + 1)
  bytes.set([0xff, 0xd8, 0xff])

  expect(() => validateSelfieUpload(bytes, 'image/jpeg')).toThrow(
    'Selfies must be 5 MB or smaller.',
  )
})

test('signup rejects an open round after its deadline', () => {
  expect(
    getSignupError(
      { status: 'open', signupDeadline: '2026-07-28T11:59:59.000Z' },
      new Date('2026-07-28T12:00:00.000Z'),
    ),
  ).toBe('The signup deadline for this round has passed.')
})

test('admin deadlines are converted from local Munich time to UTC', () => {
  const previousTimezone = process.env.TZ
  process.env.TZ = 'Europe/Berlin'

  try {
    expect(localDateTimeToUtcIso('2026-07-28T18:00')).toBe('2026-07-28T16:00:00.000Z')
  } finally {
    if (previousTimezone) process.env.TZ = previousTimezone
    else delete process.env.TZ
  }
})

test('meeting dates use the Munich calendar day instead of UTC', () => {
  expect(dateToCalendarDate(new Date('2026-07-28T22:30:00.000Z'), 'Europe/Berlin')).toBe(
    '2026-07-29',
  )
})

test('pairing avoids an excluded pair when a valid complete matching exists', () => {
  const originalRandom = Math.random
  Math.random = () => 0.999

  try {
    const pairs = runPairing([
      { id: 1, interests: [], alreadyKnow: [4], priorPartners: [] },
      { id: 2, interests: [], alreadyKnow: [3], priorPartners: [] },
      { id: 3, interests: [], alreadyKnow: [2, 4], priorPartners: [] },
      { id: 4, interests: [], alreadyKnow: [1, 3], priorPartners: [] },
    ])

    expect(
      pairs.map(({ person1Id, person2Id }) => [person1Id, person2Id].sort()).sort(),
    ).not.toContainEqual([3, 4])
    expect(pairs.flatMap(({ person1Id, person2Id }) => [person1Id, person2Id]).sort()).toEqual([
      1, 2, 3, 4,
    ])
  } finally {
    Math.random = originalRandom
  }
})

test('email HTML escapes member-controlled text', () => {
  expect(escapeEmailHtml('<img src=x onerror=alert(1)> & "quoted"')).toBe(
    '&lt;img src=x onerror=alert(1)&gt; &amp; &quot;quoted&quot;',
  )
})

test('known-member search matches names and departments case-insensitively', () => {
  const members = [
    { id: 1, name: 'Ada Lovelace', department: 'Research' },
    { id: 2, name: 'Grace Hopper', department: 'IT & Development' },
  ]

  expect(filterKnownMembers(members, 'research')).toEqual([members[0]])
  expect(filterKnownMembers(members, 'GRACE')).toEqual([members[1]])
})

test('dashboard routing keeps every Coffee Chats page in the Coffee Chats tab', () => {
  expect(getDashboardTabForPathname('/coffee-chats')).toBe('coffee-chats')
  expect(getDashboardTabForPathname('/coffee-chats/setup')).toBe('coffee-chats')
  expect(getDashboardTabForPathname('/coffee-chats/gallery')).toBe('coffee-chats')
})

test('normal member view hides Coffee Chat administration for board members', () => {
  expect(
    canShowCoffeeChatAdmin({
      forceMemberView: true,
      hasSpecialAccess: false,
      isBoardMember: true,
    }),
  ).toBe(false)
})

test('Coffee Chat administration is visible with effective admin access', () => {
  expect(
    canShowCoffeeChatAdmin({
      forceMemberView: false,
      hasSpecialAccess: true,
      isBoardMember: false,
    }),
  ).toBe(true)
})

test('current round asks for matching preferences before signup', () => {
  expect(
    getCoffeeChatNextStep({
      hasMatch: false,
      isProfileComplete: false,
      isSignedUp: false,
      matchIsComplete: false,
      roundIsOpen: true,
    }),
  ).toEqual({
    kind: 'preferences',
    label: 'Set matching preferences',
    href: '/coffee-chats/setup',
  })
})

test('current round exposes exactly the next signup action for a ready member', () => {
  expect(
    getCoffeeChatNextStep({
      hasMatch: false,
      isProfileComplete: true,
      isSignedUp: false,
      matchIsComplete: false,
      roundIsOpen: true,
    }),
  ).toEqual({
    kind: 'join',
    label: 'Join this round',
    href: null,
  })
})

test('a completed previous match does not hide a newly open round', () => {
  expect(
    getCoffeeChatNextStep({
      hasMatch: true,
      isProfileComplete: true,
      isSignedUp: false,
      matchIsComplete: true,
      roundIsOpen: true,
    }),
  ).toEqual({
    kind: 'join',
    label: 'Join this round',
    href: null,
  })
})

test('uploading a selfie alone does not complete the meeting', () => {
  expect(
    buildMeetingUpdate({
      intent: 'upload-selfie',
      signOffField: 'person1_signed_off',
      selfiePath: 'round/pair-selfie.webp',
      driveUrl: null,
      dateMet: null,
      rating: null,
      highlightNote: null,
    }),
  ).toEqual({ selfie_path: 'round/pair-selfie.webp' })
})

test('completing a meeting explicitly records status and sign-off', () => {
  expect(
    buildMeetingUpdate({
      intent: 'complete-meeting',
      signOffField: 'person2_signed_off',
      selfiePath: null,
      driveUrl: null,
      dateMet: '2026-07-28',
      rating: 5,
      highlightNote: 'Talked about account abstraction.',
    }),
  ).toEqual({
    person2_signed_off: true,
    status: 'met',
    date_met: '2026-07-28',
    rating: 5,
    highlight_note: 'Talked about account abstraction.',
  })
})
