import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.DEMO_BASE_URL ?? 'http://127.0.0.1:3100'
const useLocalServer = !process.env.DEMO_BASE_URL

try {
  const url = new URL(baseURL)
  const isLoopback = ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(url.hostname)
  if (!isLoopback) {
    throw new Error('DEMO_BASE_URL must target a local loopback address.')
  }
} catch (error) {
  if (error instanceof Error && error.message.startsWith('DEMO_BASE_URL')) throw error
  throw new Error('DEMO_BASE_URL must be a valid local or synthetic preview URL.')
}

export default defineConfig({
  testDir: './e2e/demo',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/demo-sidebar-coffee-chat-ui',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1100 },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
      },
    },
  ],
  ...(useLocalServer
    ? {
        webServer: {
          command: 'pnpm exec next dev --hostname 127.0.0.1 --port 3100',
          url: baseURL,
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            NEXT_PUBLIC_COFFEE_CHATS_DEMO: 'true',
          },
        },
      }
    : {}),
})
