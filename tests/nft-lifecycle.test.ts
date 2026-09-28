import assert from 'node:assert/strict'
import test from 'node:test'

const moduleUrl = new URL('../lib/nftLifecycle.ts', import.meta.url)
const {
  buildMembershipMetadata,
  getMembershipAssetAction,
  getMembershipAssetState,
  getSolanaExplorerUrl,
  isBurningMemberStatus,
} = await import(moduleUrl.href) as typeof import('../lib/nftLifecycle')

test('active and alumni member statuses preserve the membership asset', () => {
  assert.equal(getMembershipAssetState('Active'), 'active')
  assert.equal(getMembershipAssetAction('Active', 'active'), 'none')

  assert.equal(getMembershipAssetState('Alumni'), 'alumni')
  assert.equal(getMembershipAssetAction('Alumni', 'active'), 'update_alumni')
  assert.equal(getMembershipAssetAction('Alumni', 'alumni'), 'none')
})

test('left, kicked and explicitly revoked memberships burn the asset', () => {
  for (const status of ['Left', 'Kicked out', 'Revoked']) {
    assert.equal(isBurningMemberStatus(status), true)
    assert.equal(getMembershipAssetState(status), 'revoked')
    assert.equal(getMembershipAssetAction(status, 'active'), 'burn')
    assert.equal(getMembershipAssetAction(status, 'alumni'), 'burn')
    assert.equal(getMembershipAssetAction(status, 'burned'), 'none')
  }
})

test('unknown statuses require a board decision instead of burning automatically', () => {
  assert.equal(getMembershipAssetState('Passive'), 'active')
  assert.equal(getMembershipAssetAction('Passive', 'active'), 'none')
  assert.equal(getMembershipAssetAction(null, 'active'), 'none')
})

test('metadata exposes only the approved public membership fields', () => {
  assert.deepEqual(buildMembershipMetadata({
    name: 'Nikolas K.',
    imageUrl: 'https://assets.example/member.png',
    department: 'IT & Development',
    funFact: 'Built the member platform',
    batch: '8',
    assetState: 'alumni',
    alumniYear: 2026,
  }), {
    name: 'Nikolas K. — TBC Membership',
    symbol: 'TBC',
    description: 'TUM Blockchain Club membership NFT',
    image: 'https://assets.example/member.png',
    attributes: [
      { trait_type: 'Membership Status', value: 'Alumni' },
      { trait_type: 'Department', value: 'IT & Development' },
      { trait_type: 'Batch', value: '8' },
      { trait_type: 'Club Period', value: 'Batch 8 – 2026' },
      { trait_type: 'Member Flex', value: 'Built the member platform' },
    ],
    properties: {
      category: 'image',
      files: [{ uri: 'https://assets.example/member.png', type: 'image/png' }],
    },
  })
})

test('explorer links identify the configured Solana network', () => {
  assert.equal(
    getSolanaExplorerUrl('abc123', 'devnet', 'tx'),
    'https://explorer.solana.com/tx/abc123?cluster=devnet'
  )
  assert.equal(
    getSolanaExplorerUrl('asset123', 'mainnet-beta', 'address'),
    'https://explorer.solana.com/address/asset123'
  )
})
