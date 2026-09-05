import { expect, test } from '@playwright/test'

test('Coffee Chat admin can load rounds and administrator controls', async ({ page }) => {
  await page.goto('/coffee-chats/admin')

  await expect(page.getByRole('heading', { name: 'Coffee Chats admin' })).toBeVisible()
  await expect(page.getByText('All rounds')).toBeVisible()
  await expect(page.getByText('Coffee Chat Administrators')).toBeVisible()
})
