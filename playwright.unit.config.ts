import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.{spec,test}.ts',
  // Node test runner files (top-level await) run via pnpm test:nft.
  testIgnore: ['**/nft-lifecycle.test.ts', '**/nft-artwork-text.test.ts'],
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
})
