import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL

if (!baseURL) {
  throw new Error('E2E_BASE_URL is required for production E2E tests.')
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'member',
      testMatch: 'member.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/member.json',
      },
    },
    {
      name: 'admin',
      testMatch: 'admin.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/admin.json',
      },
    },
  ],
})
