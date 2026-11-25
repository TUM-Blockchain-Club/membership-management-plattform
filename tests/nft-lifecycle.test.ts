import assert from 'node:assert/strict'
import test from 'node:test'

const moduleUrl = new URL('../lib/nftLifecycle.ts', import.meta.url)
const {
  buildMembershipMetadata,
  getMembershipAssetAction,
  getMembershipAssetState,
  getRequestedMintOwnerAddress,
  getSavedMintDestination,
  getSolanaExplorerUrl,
  isBurningMemberStatus,
} = await import(moduleUrl.href) as typeof import('../lib/nftLifecycle')
const { getInitialNftDisplayName, getSuggestedNftDisplayName } = await import(
  new URL('../lib/nftDisplayName.ts', import.meta.url).href
) as typeof import('../lib/nftDisplayName')
const { isSolanaPublicKey } = await import(
  new URL('../lib/solanaAddress.ts', import.meta.url).href
) as typeof import('../lib/solanaAddress')

test('display-name suggestions keep only the first name and surname initial', () => {
  assert.equal(getSuggestedNftDisplayName('Nikolas Hack'), 'Nikolas H.')
  assert.equal(getSuggestedNftDisplayName('  Ada  Lovelace  '), 'Ada L.')
  assert.equal(getSuggestedNftDisplayName('Satoshi'), 'Satoshi')
  assert.equal(getSuggestedNftDisplayName(null), '')
})

test('display-name suggestions apply the documented first-name plus surname-initial rule to multi-word names', () => {
  assert.equal(getSuggestedNftDisplayName('E2E Test Member'), 'E2E M.')
})

test('a profile-update form starts from the name on the minted NFT, a new application from the suggestion', () => {
  assert.equal(getInitialNftDisplayName('E2E Test Member', null), 'E2E M.')
  assert.equal(getInitialNftDisplayName('E2E Test Member', { display_name: 'E2E Test M.', asset_address: 'asset', asset_state: 'active' }), 'E2E Test M.')
  assert.equal(getInitialNftDisplayName('E2E Test Member', { display_name: 'E2E Test M.', asset_address: null, asset_state: 'unminted' }), 'E2E M.')
  assert.equal(getInitialNftDisplayName('E2E Test Member', { display_name: 'E2E Test M.', asset_address: 'asset', asset_state: 'burned' }), 'E2E M.')
})

test('profile updates of a minted NFT keep the saved mint destination', () => {
  const minted = { asset_address: 'asset', mint_destination: 'member' as const, requested_wallet_address: 'member-wallet' }
  assert.deepEqual(getSavedMintDestination({ mint_destination: 'club', requested_wallet_address: null }, minted), {
    mintDestination: 'member',
    requestedWalletAddress: 'member-wallet',
  })
  assert.deepEqual(getSavedMintDestination({}, minted), { mintDestination: 'member', requestedWalletAddress: 'member-wallet' })
})

test('new requests use the submitted mint destination, defaulting to club custody', () => {
  assert.deepEqual(getSavedMintDestination({ mint_destination: 'member', requested_wallet_address: ' wallet ' }, null), {
    mintDestination: 'member',
    requestedWalletAddress: 'wallet',
  })
  assert.deepEqual(getSavedMintDestination({ mint_destination: 'club', requested_wallet_address: 'stale' }, { asset_address: null }), {
    mintDestination: 'club',
    requestedWalletAddress: null,
  })
  assert.deepEqual(getSavedMintDestination({}, null), { mintDestination: 'club', requestedWalletAddress: null })
})

test('mint destination selects club custody or the requested member wallet', () => {
  assert.equal(getRequestedMintOwnerAddress('club', null), null)
  assert.equal(getRequestedMintOwnerAddress('club', 'stale-wallet'), null)
  assert.equal(getRequestedMintOwnerAddress('member', '  member-wallet  '), 'member-wallet')
  assert.throws(
    () => getRequestedMintOwnerAddress('member', null),
    /wallet address is required/i
  )
})

test('Solana wallet validation rejects malformed request destinations', () => {
  assert.equal(isSolanaPublicKey('11111111111111111111111111111111'), true)
  assert.equal(isSolanaPublicKey('not-a-wallet'), false)
})

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
