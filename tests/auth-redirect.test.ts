import { expect, test } from '@playwright/test'
import { safeAuthRedirect } from '../lib/authRedirect'

test('login preserves the check-in token and rejects external destinations', () => {
  expect(safeAuthRedirect('/attendance/check-in?token=abc%3ADEF')).toBe('/attendance/check-in?token=abc%3ADEF')
  for (const value of [null, '', '//evil.example', '/\\evil.example', 'https://evil.example', '/\nevil']) {
    expect(safeAuthRedirect(value)).toBe('/home')
  }
})
