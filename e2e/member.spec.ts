import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test('member can load the Coffee Chats dashboard with production data', async ({ page }) => {
  await page.goto('/coffee-chats')

  await expect(page.getByRole('navigation', { name: 'Coffee Chats' })).toBeVisible()
  await expect(page.getByText(/Current round|\w+ \d{4} round/).first()).toBeVisible()
})

test('member can persist matching interests through the browser interface', async ({ page }) => {
  await page.goto('/coffee-chats/setup')
  await expect(page.getByRole('button', { name: 'Save preferences' })).toBeVisible()

  const toggles = page.getByRole('button', { name: /^Toggle / })
  const toggleCount = await toggles.count()
  let selectedCount = 0
  let targetIndex = -1

  for (let index = 0; index < toggleCount; index += 1) {
    const selected = (await toggles.nth(index).getAttribute('aria-pressed')) === 'true'
    if (selected) selectedCount += 1
    if (!selected && targetIndex === -1) targetIndex = index
  }

  if (selectedCount === 0) {
    throw new Error('The production E2E member must be seeded with at least one Coffee Chat interest.')
  }
  if (targetIndex === -1) targetIndex = 0

  const target = toggles.nth(targetIndex)
  const targetName = await target.getAttribute('aria-label')
  const wasSelected = (await target.getAttribute('aria-pressed')) === 'true'
  if (!targetName) throw new Error('Coffee Chat interest toggle is missing its accessible name.')

  try {
    await target.click()
    await page.getByRole('button', { name: 'Save preferences' }).click()
    await expect(page.getByText('Matching preferences saved.')).toBeVisible()

    await page.reload()
    await expect(page.getByRole('button', { name: targetName })).toHaveAttribute(
      'aria-pressed',
      String(!wasSelected),
    )
  } finally {
    await page.getByRole('button', { name: targetName }).click()
    await page.getByRole('button', { name: 'Save preferences' }).click()
    await expect(page.getByText('Matching preferences saved.')).toBeVisible()
  }
})

test('ordinary member cannot open Coffee Chat administration', async ({ page }) => {
  await page.goto('/coffee-chats/admin')

  await expect(page).toHaveURL(/\/coffee-chats$/)
  await expect(page.getByRole('heading', { name: 'Coffee Chats admin' })).toHaveCount(0)
})
