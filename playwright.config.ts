import { defineConfig, devices } from '@playwright/test'

const baseURL = 'https://plattform.tum-blockchain.com'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'off',
    screenshot: 'off',
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
