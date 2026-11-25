import { expect, test } from '@playwright/test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import type { DashboardController } from '../app/dashboard/DashboardContext'

// Styles have no behavior in this server-rendered route regression test.
require.extensions['.css'] = () => {}
// Load synchronously after the CSS handler, using Playwright's TS path resolution.
/* eslint-disable @typescript-eslint/no-require-imports */
const { DashboardContext } = require('../app/dashboard/DashboardContext')
const { default: NewsletterRoute } = require('../app/(dashboard)/newsletter/page')
/* eslint-enable @typescript-eslint/no-require-imports */

for (const scenario of [
  { name: 'board member without special access', showNewsletterTab: true, specialAccess: false, allowed: true },
  { name: 'special-access user', showNewsletterTab: true, specialAccess: true, allowed: true },
  { name: 'ordinary member', showNewsletterTab: false, specialAccess: false, allowed: false },
  { name: 'board member in member-view mode', showNewsletterTab: false, specialAccess: false, allowed: false },
]) {
  test(`newsletter route: ${scenario.name}`, () => {
    const dashboard = {
      showNewsletterTab: scenario.showNewsletterTab,
      effectiveHasSpecialAccess: scenario.specialAccess,
    } as DashboardController
    const html = renderToString(createElement(DashboardContext.Provider, {
      value: dashboard,
    }, createElement(NewsletterRoute)))

    expect(html.includes('Newsletter access required')).toBe(!scenario.allowed)
    expect(html.includes('Campaign details')).toBe(scenario.allowed)
  })
}
