import { expect, test } from '@playwright/test'

import { productionE2EOrigin } from '../e2e/production-origin'

test('production E2E accepts only owned production and preview origins', () => {
  expect(productionE2EOrigin('https://plattform.tum-blockchain.com')).toBe(
    'https://plattform.tum-blockchain.com',
  )
  expect(
    productionE2EOrigin(
      'https://membership-management-plattf-git-d88997-tumblockchains-projects.vercel.app',
    ),
  ).toBe(
    'https://membership-management-plattf-git-d88997-tumblockchains-projects.vercel.app',
  )
  expect(() => productionE2EOrigin('https://attacker.example')).toThrow(
    'Production E2E target is not an approved TUM Blockchain deployment.',
  )
})
