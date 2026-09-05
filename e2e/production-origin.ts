const FIXED_ORIGINS = new Set([
  'https://plattform.tum-blockchain.com',
  'https://preview.plattform.tum-blockchain.com',
])

const TUM_VERCEL_PREVIEW =
  /^membership-management-plattf(?:orm)?-[a-z0-9-]+-tumblockchains-projects\.vercel\.app$/

export function productionE2EOrigin(value: string): string {
  try {
    const url = new URL(value)
    const isOriginOnly =
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash
    const isOwnedDeployment = FIXED_ORIGINS.has(url.origin) || TUM_VERCEL_PREVIEW.test(url.hostname)

    if (isOriginOnly && isOwnedDeployment) return url.origin
  } catch {
    // Use the same safe error for malformed and unapproved targets.
  }

  throw new Error('Production E2E target is not an approved TUM Blockchain deployment.')
}
