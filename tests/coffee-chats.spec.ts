import { expect, test } from '@playwright/test'

import { MAX_SELFIE_BYTES, validateSelfieUpload } from '../lib/coffee-chats/uploads'
import { getSignupError } from '../lib/coffee-chats/rounds'
import { runPairing } from '../lib/coffee-chats/pairing'
import { escapeEmailHtml } from '../lib/coffee-chats/emails'

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
