import { expect, test } from '@playwright/test'
import { parseCheckInToken } from '../lib/attendanceToken'

test('scanner accepts a check-in URL or token, never trailing data or invalid input', () => {
  const token = '00000000-0000-4000-8000-000000000001:ABCDEF123456'
  expect(parseCheckInToken(token)).toBe(token)
  expect(parseCheckInToken(`https://example.org/attendance/check-in?token=${encodeURIComponent(token)}`)).toBe(token)
  for (const value of [null, '', 'not a QR', `${token}:extra`, 'bad:ABCDEF']) {
    expect(parseCheckInToken(value)).toBeNull()
  }
})
