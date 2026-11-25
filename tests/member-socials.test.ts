import { test, expect } from '@playwright/test'
import { memberSocialLink } from '../lib/memberSocials'
import { safeGrantUrl } from '../lib/eventGrants'
test('member social links accept expected hosts and safe handles only', () => {
  expect(memberSocialLink('Telegram', '@tbc_member')).toBe('https://t.me/tbc_member')
  expect(memberSocialLink('Linkedin', 'www.linkedin.com/in/example')).toBe('https://www.linkedin.com/in/example')
  expect(memberSocialLink('Instagram', 'example')).toBe('https://www.instagram.com/example')
  expect(memberSocialLink('Twitter', 'https://x.com/example')).toBe('https://x.com/example')
  expect(memberSocialLink('Discord', '123456789012345678')).toBe('https://discord.com/users/123456789012345678')
  expect(memberSocialLink('Discord', 'member.username')).toBeNull()
  for (const bad of ['javascript:alert(1)', 'https://x.com.evil.invalid/member', 'https://user:password@x.com/member', 'data:text/html,hi']) expect(memberSocialLink('Twitter', bad)).toBeNull()
})
test('grant links reject executable protocols and embedded credentials', () => {
  expect(safeGrantUrl('')).toBeNull()
  expect(safeGrantUrl(' https://example.invalid/grant ')).toBe('https://example.invalid/grant')
  for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'https://user:password@example.invalid', 1]) expect(() => safeGrantUrl(bad)).toThrow()
})
