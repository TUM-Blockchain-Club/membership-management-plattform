import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.{spec,test}.ts',
  testIgnore: '**/nft-lifecycle.test.ts',
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
})
