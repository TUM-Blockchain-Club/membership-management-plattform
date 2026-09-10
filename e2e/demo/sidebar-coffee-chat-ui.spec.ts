import { expect, test, type Locator, type Page } from '@playwright/test'

function sidebar(page: Page) {
  return page.locator('[data-slot="sidebar"][data-state]').first()
}

function dashboardNavigation(page: Page) {
  return page.getByRole('navigation', { name: 'Dashboard navigation' })
}

function dashboardItem(page: Page, name: RegExp) {
  return dashboardNavigation(page).getByRole('button', { name }).first()
}

function coffeeNavigation(page: Page) {
  return page.getByRole('navigation', { name: 'Coffee Chats' })
}

function nextButton(page: Page) {
  return page.getByRole('button', { name: /^(?:Next|Continue)\b/i }).first()
}

function backButton(page: Page) {
  return page.getByRole('button', { name: /^Back\b/i }).first()
}

async function openDemoPage(page: Page, path: string) {
  await page.goto(path)
  await expect(page.locator('[data-coffee-chats-demo="true"]')).toBeVisible()
}

async function ensureInterestSelected(page: Page, name: RegExp): Promise<Locator> {
  const choice = page.locator('[data-slot="questionnaire-choice"]:visible').filter({ hasText: name }).first()
  await expect(choice).toBeVisible()
  const input = choice.locator('input[type="checkbox"], input[type="radio"]').first()
  await expect(input).toHaveCount(1)
  if (!(await input.isChecked())) await choice.click()
  return input
}

async function selected(control: Locator) {
  return control.isChecked()
}

async function fillField(page: Page, name: RegExp, value: string) {
  const field = page.getByLabel(name).first()
  await expect(field).toBeVisible()
  await field.fill(value)
  return field
}

function trackApiWrites(page: Page) {
  const writes: string[] = []
  page.on('request', (request) => {
    const method = request.method()
    if (method === 'GET' || method === 'HEAD') return

    const url = new URL(request.url())
    const isLoopback = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname)
    if (!isLoopback || url.pathname.startsWith('/api/')) {
      writes.push(`${method} ${url.origin}${url.pathname}`)
    }
  })
  return writes
}

async function clearInterests(page: Page) {
  const choices = page.locator('[data-slot="questionnaire-choice"]:visible')
  for (let index = 0; index < await choices.count(); index += 1) {
    const choice = choices.nth(index)
    const input = choice.locator('input[type="checkbox"], input[type="radio"]').first()
    if ((await input.count()) && (await input.isChecked())) await choice.click()
  }
}

test.describe('synthetic Coffee Chats sidebar and questionnaire', () => {
  test('desktop sidebar navigates Coffee Chat routes and collapses without losing active state', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Desktop sidebar contract')

    const apiWrites = trackApiWrites(page)
    await openDemoPage(page, '/coffee-chats')

    const nav = sidebar(page)
    await expect(nav).toHaveAttribute('data-state', 'expanded')
    await expect(dashboardItem(page, /Coffee Chats/i)).toBeVisible()

    await page.screenshot({
      path: testInfo.outputPath('desktop-sidebar-expanded.png'),
      fullPage: false,
    })

    const trigger = page.getByRole('button', { name: /toggle sidebar/i }).first()
    await expect(trigger).toBeVisible()
    await trigger.click()
    await expect(nav).toHaveAttribute('data-state', 'collapsed')
    await expect(dashboardItem(page, /Coffee Chats/i)).toBeVisible()

    await trigger.click()
    await expect(nav).toHaveAttribute('data-state', 'expanded')

    await expect(coffeeNavigation(page).getByRole('link', { name: /Preferences/i })).toBeVisible()
    await coffeeNavigation(page).getByRole('link', { name: /Preferences/i }).click()
    await expect(page).toHaveURL(/\/coffee-chats\/setup$/)
    await expect(dashboardItem(page, /Coffee Chats/i)).toHaveAttribute('aria-current', 'page')

    await coffeeNavigation(page).getByRole('link', { name: /Gallery/i }).click()
    await expect(page).toHaveURL(/\/coffee-chats\/gallery$/)
    await expect(dashboardItem(page, /Coffee Chats/i)).toHaveAttribute('aria-current', 'page')
    expect(apiWrites).toEqual([])
  })

  test('desktop sidebar hides privileged Coffee Chat administration in normal member view', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Desktop permission contract')

    await openDemoPage(page, '/coffee-chats')
    await expect(dashboardItem(page, /Link Analytics/i)).toBeVisible()
    await expect(dashboardItem(page, /Newsletter/i)).toBeVisible()
    await expect(dashboardItem(page, /NFT Approvals/i)).toHaveCount(0)
    await expect(coffeeNavigation(page).getByRole('link', { name: /^Admin$/i })).toBeVisible()

    await page.getByRole('button', { name: /Account menu for/i }).click()
    await page.getByRole('menuitemcheckbox', { name: /Normal Member View/i }).click()
    await expect(dashboardItem(page, /Link Analytics/i)).toHaveCount(0)
    await expect(dashboardItem(page, /Newsletter/i)).toHaveCount(0)
    await expect(dashboardItem(page, /NFT Approvals/i)).toHaveCount(0)
    await expect(coffeeNavigation(page).getByRole('link', { name: /^Admin$/i })).toHaveCount(0)
  })

  test('mobile sidebar opens, exposes Coffee Chat routes, and closes after navigation', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Mobile sidebar contract')

    await openDemoPage(page, '/coffee-chats/setup')
    const trigger = page.getByRole('button', { name: /toggle sidebar/i }).first()
    await expect(trigger).toBeVisible()
    await trigger.click()

    const mobileNav = page.locator('[data-slot="sidebar"][data-mobile="true"]')
    await expect(mobileNav).toBeVisible()
    await expect(mobileNav.getByRole('navigation', { name: 'Dashboard navigation' })).toBeVisible()
    await expect(mobileNav.getByRole('button', { name: /Coffee Chats/i })).toBeVisible()

    await page.screenshot({
      path: testInfo.outputPath('mobile-sidebar-open.png'),
      fullPage: false,
    })

    await mobileNav.getByRole('button', { name: /Coffee Chats/i }).click()
    await expect(page).toHaveURL(/\/coffee-chats$/)
    await expect(page.locator('[data-slot="sidebar"][data-mobile="true"]')).toBeHidden()
  })

  test('questionnaire blocks an empty interest step and saves with optional fields omitted', async ({ page }) => {
    await openDemoPage(page, '/coffee-chats/setup')

    const next = nextButton(page)
    await expect(next).toBeVisible()

    await clearInterests(page)

    await next.click()
    await expect(page.getByText(/select at least one interest/i)).toBeVisible()

    await ensureInterestSelected(page, /Blockchain/i)
    await next.click()
    await expect(page.getByLabel(/Study programme/i)).toBeVisible()

    await fillField(page, /Study programme/i, '')
    await fillField(page, /Favourite coffee drink/i, '')
    await fillField(page, /Recommended coffee spots/i, '')
    await fillField(page, /Fun fact/i, '')

    await page.getByRole('button', { name: /^Skip$/i }).click()
    await expect(page.getByLabel(/Search members/i)).toBeVisible()

    const exclusionChoices = page.locator('[data-slot="questionnaire-choice"]:visible')
    for (let index = 0; index < await exclusionChoices.count(); index += 1) {
      const choice = exclusionChoices.nth(index)
      const checkbox = choice.locator('input[type="checkbox"]').first()
      if ((await checkbox.count()) && (await checkbox.isChecked())) await choice.click()
    }

    const save = page.getByRole('button', { name: /save preferences/i })
    await expect(save).toBeVisible()
    await save.click()
    await expect(page.getByText(/matching preferences saved/i)).toBeVisible()
  })

  test('questionnaire preserves values across Back and filtered exclusions before one final save', async ({ page }, testInfo) => {
    const apiWrites = trackApiWrites(page)
    await openDemoPage(page, '/coffee-chats/setup')
    await expect(page.locator('[data-slot="questionnaire-choice"]:visible').first()).toBeVisible()

    await page.screenshot({
      path: testInfo.outputPath(`questionnaire-${testInfo.project.name}-interests.png`),
      fullPage: false,
    })

    const interest = await ensureInterestSelected(page, /Blockchain/i)
    await nextButton(page).click()

    await fillField(page, /Study programme/i, 'MSc Synthetic Systems')
    await fillField(page, /Favourite coffee drink/i, 'Oat flat white')
    await fillField(page, /Recommended coffee spots/i, 'Lost Weekend, Standl 20')
    await fillField(page, /Fun fact/i, 'I test demos without production data.')
    await nextButton(page).click()

    const search = await fillField(page, /Search members/i, 'Alex')
    const alex = page.locator('[data-slot="questionnaire-choice"]:visible').filter({ hasText: /Alex Morgan/i }).first()
    await expect(alex).toBeVisible()
    await alex.click()
    await search.fill('Mina')
    await expect(page.locator('[data-slot="questionnaire-choice"]:visible').filter({ hasText: /Alex Morgan/i })).toHaveCount(0)
    await search.fill('')
    await expect(alex.locator('input[type="checkbox"]')).toBeChecked()

    await backButton(page).click()
    await expect(page.getByLabel(/Study programme/i)).toHaveValue('MSc Synthetic Systems')
    await expect(page.getByLabel(/Favourite coffee drink/i)).toHaveValue('Oat flat white')
    await expect(page.getByLabel(/Recommended coffee spots/i)).toHaveValue('Lost Weekend, Standl 20')
    await expect(page.getByLabel(/Fun fact/i)).toHaveValue('I test demos without production data.')

    await nextButton(page).click()
    await expect(page.getByLabel(/Search members/i)).toBeVisible()
    await expect(page.locator('[data-slot="questionnaire-choice"]:visible').filter({ hasText: /Alex Morgan/i }).locator('input[type="checkbox"]')).toBeChecked()

    await backButton(page).click()
    await backButton(page).click()
    expect(await selected(interest)).toBe(true)
    await nextButton(page).click()
    await nextButton(page).click()

    const save = page.getByRole('button', { name: /save preferences/i })
    await expect(save).toHaveCount(1)
    await save.click()
    await expect(page.getByText(/matching preferences saved/i)).toBeVisible()
    await expect(save).toHaveCount(1)
    expect(apiWrites).toEqual([])

  })
})
