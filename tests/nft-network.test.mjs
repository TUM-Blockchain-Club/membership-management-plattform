import assert from 'node:assert/strict'
import test from 'node:test'
import { load } from './helpers/load-ts-module.mjs'

const lifecycle = load('lib/nftLifecycle.ts')
const network = load('lib/server/solanaNetwork.ts', { 'server-only': {}, '@/lib/nftLifecycle': lifecycle })
const next = { NextResponse: { json: (body, init) => Response.json(body, init) } }

const withNetwork = async (value, run) => {
  const previous = process.env.SOLANA_NETWORK
  process.env.SOLANA_NETWORK = value
  try { return await run() } finally {
    if (previous === undefined) delete process.env.SOLANA_NETWORK
    else process.env.SOLANA_NETWORK = previous
  }
}

// Minimal awaitable Supabase query builder that records filters.
const queryReturning = (result, filters = []) => {
  const query = {
    select() { return query }, update() { return query }, order() { return query }, not(...args) { filters.push(['not', ...args]); return query },
    neq(...args) { filters.push(['neq', ...args]); return query }, eq(...args) { filters.push(['eq', ...args]); return query },
    async maybeSingle() { return result }, async single() { return result },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject) },
  }
  return query
}

test('configured network defaults to devnet and rejects unknown values', async () => {
  await withNetwork('', () => assert.equal(network.getConfiguredSolanaNetwork(), 'devnet'))
  await withNetwork('mainnet-beta', () => assert.equal(network.getConfiguredSolanaNetwork(), 'mainnet-beta'))
  await withNetwork('testnet', () => assert.throws(() => network.getConfiguredSolanaNetwork()))
})

test('asset actions are refused when the asset lives on another network', async () => {
  await withNetwork('mainnet-beta', () => {
    assert.throws(() => network.assertAssetOnConfiguredNetwork('devnet'), { status: 409, message: /devnet.*mainnet-beta/ })
    assert.doesNotThrow(() => network.assertAssetOnConfiguredNetwork('mainnet-beta'))
  })
})

test('signer functions refuse an asset from another network before contacting Solana', async () => {
  const solana = load('lib/server/solanaMembership.ts', {
    'server-only': {}, '@metaplex-foundation/mpl-core': {}, '@metaplex-foundation/umi': {}, '@metaplex-foundation/umi-bundle-defaults': {},
    '@/lib/server/solanaNetwork': network,
  })
  await withNetwork('mainnet-beta', async () => {
    const devnet = { assetAddress: 'asset', network: 'devnet' }
    for (const call of [
      () => solana.updateMembershipAsset({ ...devnet, name: 'n', uri: 'u' }),
      () => solana.claimMembershipAsset({ ...devnet, recipientAddress: 'wallet' }),
      () => solana.burnMembershipAsset(devnet),
      () => solana.reconcileMembershipAsset(devnet),
    ]) await assert.rejects(call, { status: 409 })
  })
})

test('reconciliation only checks assets on the configured network', async () => {
  const filters = []
  const checked = []
  const rows = [{ id: 'r', asset_address: 'asset', owner_address: 'owner', metadata_url: 'uri', chain_network: 'mainnet-beta' }]
  const supabase = { from: () => queryReturning({ data: rows, error: null }, filters) }
  const reconcile = load('lib/server/reconcileMembershipNfts.ts', {
    'server-only': {}, '@/lib/supabase/server': {}, '@/lib/server/solanaNetwork': network,
    '@/lib/server/solanaMembership': {
      reconcileMembershipAsset: async (asset) => { checked.push(asset); return { ownerAddress: 'owner', uri: 'uri' } },
    },
  })
  await withNetwork('mainnet-beta', async () => {
    const results = await reconcile.reconcileMembershipNfts(supabase)
    assert.deepEqual(JSON.parse(JSON.stringify(results)), [{ requestId: 'r', ok: true, message: null }])
  })
  assert.deepEqual([...filters.find(([kind, column]) => kind === 'eq' && column === 'chain_network')], ['eq', 'chain_network', 'mainnet-beta'])
  assert.deepEqual(JSON.parse(JSON.stringify(checked)), [{ assetAddress: 'asset', network: 'mainnet-beta' }])
})

test('mint/update, lifecycle and claim routes refuse a devnet asset on mainnet before any side effect', async () => {
  const sideEffects = []
  const record = {
    request: { id: 'r', member_id: 7, asset_address: 'asset', asset_state: 'active', chain_network: 'devnet', claim_wallet_address: 'wallet', display_name: 'Ada L.' },
    member: { status: 'Active' },
  }
  const dataClient = { from: () => queryReturning({ data: record.request, error: null }) }
  const deps = {
    'next/server': next,
    '@/lib/nftLifecycle': lifecycle,
    '@/lib/solanaAddress': { isSolanaPublicKey: () => true },
    '@/lib/server/solanaNetwork': network,
    '@/lib/supabase/server': { createSupabaseServerClient: async () => ({}) },
    '@/lib/server/supabaseAdmin': { getSupabaseAdminClient: () => dataClient },
    '@/lib/server/nftRequestAdmin': { requireNftRequestAdmin: async () => ({ user: { id: 'admin' } }), NftRequestAdminError: class extends Error {} },
    '@/lib/server/nftPublicationConsent': {
      NftPublicationConsentError: class extends Error {},
      requireNftPublicationConsent: async () => sideEffects.push('consent'),
    },
    '@/lib/server/nftChainOperation': {
      startNftChainOperation: async () => { sideEffects.push('operation'); return 'op' },
      confirmNftChainOperation: async () => sideEffects.push('confirm'),
      failNftChainOperation: async () => sideEffects.push('fail'),
    },
    '@/lib/server/membershipNftAssets': {
      loadMembershipNftRecord: async () => record,
      renderAndUploadMembershipAssets: async () => sideEffects.push('render'),
      deleteMembershipPublicAssets: async () => sideEffects.push('delete'),
      deleteMembershipSourceImages: async () => sideEffects.push('delete'),
      deleteSupersededMembershipPublicAssets: async () => sideEffects.push('delete'),
      deleteSupersededMembershipSourceImages: async () => sideEffects.push('delete'),
    },
    '@/lib/server/solanaMembership': new Proxy({}, { get: () => async () => sideEffects.push('chain') }),
  }
  const routes = [
    [load('app/api/nft-requests/[requestId]/mint/route.ts', deps), {}],
    [load('app/api/nft-requests/[requestId]/lifecycle/route.ts', deps), { action: 'revoke' }],
    [load('app/api/nft-requests/[requestId]/claim/route.ts', deps), {}],
  ]
  await withNetwork('mainnet-beta', async () => {
    for (const [route, body] of routes) {
      const response = await route.POST(
        new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body) }),
        { params: Promise.resolve({ requestId: 'r' }) }
      )
      assert.equal(response.status, 409)
      assert.match((await response.json()).error, /devnet/)
    }
  })
  assert.deepEqual(sideEffects, [])
})

test('member and board APIs expose the configured network for the devnet label', async () => {
  const dataClient = { from: () => queryReturning({ data: [], error: null }) }
  const current = load('app/api/nft-requests/current/route.ts', {
    'next/server': next,
    '@/lib/nftLegal': {}, '@/lib/nftRequestConstants': {}, '@/lib/solanaAddress': {}, '@/lib/nftLifecycle': lifecycle,
    '@/lib/server/nftPublicationConsent': { hasCurrentNftConsent: async () => true },
    '@/lib/server/nftRequestCurrentMember': {
      resolveCurrentNftRequestMember: async () => ({ member: { ID: 7 }, dataClient: { from: () => queryReturning({ data: null, error: null }) } }),
      NftRequestCurrentMemberError: class extends Error {},
    },
    '@/lib/supabase/server': { createSupabaseServerClient: async () => ({}) },
    '@/lib/server/solanaNetwork': network,
  })
  const queue = load('app/api/nft-requests/admin-queue/route.ts', {
    'next/server': next,
    '@/lib/server/nftRequestAdmin': { requireNftRequestAdmin: async () => ({}), NftRequestAdminError: class extends Error {} },
    '@/lib/server/supabaseAdmin': { getSupabaseAdminClient: () => dataClient },
    '@/lib/supabase/server': { createSupabaseServerClient: async () => ({}) },
    '@/lib/server/solanaNetwork': network,
  })
  for (const value of ['devnet', 'mainnet-beta']) {
    await withNetwork(value, async () => {
      for (const handler of [current.GET, queue.GET]) {
        const response = await handler(new Request('http://localhost/api'))
        assert.equal((await response.json()).network, value)
      }
    })
  }
})
