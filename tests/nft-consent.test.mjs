import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const ts = require('typescript')
// Execute the real route/modules, replacing only infrastructure boundaries.
function load(file, deps = {}) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, require: id => {
    if (!(id in deps)) throw new Error(`Unexpected dependency: ${id}`)
    return deps[id]
  }, Response, Buffer, console })
  return exports
}
const legal = load('lib/nftLegal.ts')
const next = { NextResponse: { json: (body, init) => Response.json(body, init) } }
const identity = { user: { id: 'signed-in-user' }, member: { ID: 7 }, dataClient: {} }
const common = {
  '@/lib/nftLegal': legal,
  'next/server': next,
  '@/lib/supabase/server': { createSupabaseServerClient: async () => ({}) },
  '@/lib/server/nftRequestCurrentMember': {
    resolveCurrentNftRequestMember: async () => identity,
    NftRequestCurrentMemberError: class extends Error {},
  },
}
const current = load('app/api/nft-requests/current/route.ts', {
  ...common,
  '@/lib/nftRequestConstants': { NFT_REQUEST_IMAGE_BUCKET: 'nft-request-images' },
  '@/lib/solanaAddress': { isSolanaPublicKey: () => true },
  '@/lib/server/nftPublicationConsent': { hasCurrentNftConsent: async () => false },
})
const renewal = load('app/api/nft-requests/current/consent/route.ts', common)
const request = body => new Request('http://localhost/api/nft-requests/current', { method: 'POST', body: JSON.stringify(body) })

test('submit and renewal reject absent, false, forged and outdated consent before DB writes', async () => {
  for (const handler of [current.POST, renewal.POST]) {
    for (const payload of [{}, { publication_consent: false }, { publication_consent: 'true', legal_version: legal.NFT_LEGAL_VERSION }, { publication_consent: true, legal_version: 'old' }, null]) {
      assert.equal((await handler(request(payload))).status, 400)
    }
  }
})
test('consent recording requires an actual signed-in user, including under local bypass', async () => {
  identity.user = null
  try { for (const handler of [current.POST, renewal.POST]) assert.equal((await handler(request({ publication_consent: true, legal_version: legal.NFT_LEGAL_VERSION }))).status, 401) }
  finally { identity.user = { id: 'signed-in-user' } }
})
test('renewal binds identity and full legal snapshot server-side and calls atomic RPC', async () => {
  let args
  identity.dataClient = { rpc: async (name, payload) => { args = { name, payload }; return { data: { id: 'existing' }, error: null } } }
  assert.equal((await renewal.POST(request({ publication_consent: true, legal_version: legal.NFT_LEGAL_VERSION, member_id: 999, actor_id: 'forged' }))).status, 200)
  assert.equal(args.name, 'save_nft_request_with_consent')
  assert.equal(args.payload.p_member_id, 7)
  assert.equal(args.payload.p_actor_id, 'signed-in-user')
  assert.equal(args.payload.p_documents, legal.NFT_LEGAL_DOCUMENTS)
  assert.equal(args.payload.p_renew_only, true)
})
test('publication gate fails closed for missing/mismatched evidence and DB errors', async () => {
  const consent = load('lib/server/nftPublicationConsent.ts', { 'server-only': {}, '@/lib/nftLegal': legal })
  await assert.rejects(consent.requireNftPublicationConsent({}, { id: 'r', member_id: 7 }), { status: 409 })
  const filters = []
  let result = { data: null, error: null }
  const query = { select() { return this }, eq(k,v) { filters.push([k,v]); return this }, async maybeSingle() { return result } }
  const client = { from: () => query }
  const row = { id: 'r', member_id: 7, consent_receipt_id: 'receipt' }
  await assert.rejects(consent.requireNftPublicationConsent(client, row), { status: 409 })
  assert.deepEqual(filters, [['id','receipt'],['request_id','r'],['member_id',7],['legal_version',legal.NFT_LEGAL_VERSION]])
  result = { data: { id: 'receipt' }, error: null }
  await consent.requireNftPublicationConsent(client, row)
  result = { data: null, error: { message: 'DB unavailable' } }
  await assert.rejects(consent.requireNftPublicationConsent(client, row), /Could not verify/)
})

test('public asset renderer checks consent before reading portraits or publishing files', async () => {
  const failure = new Error('Consent required')
  const assets = load('lib/server/membershipNftAssets.ts', {
    'server-only': {},
    '@/lib/server/nftPublicationConsent': { requireNftPublicationConsent: async () => { throw failure } },
    '@/lib/nftLifecycle': {}, '@/lib/nftRequestConstants': {}, '@/lib/server/buildNftImage': {},
  })
  // An empty client deliberately has no storage methods: none may be touched.
  await assert.rejects(assets.renderAndUploadMembershipAssets({}, { request: {} }, 'active'), failure)
  await assert.rejects(assets.renderAndUploadMembershipAssets({}, { request: {} }, 'alumni'), failure)
})

test('new submissions pass consent and authenticated identity to the atomic RPC', async () => {
  let saved
  identity.dataClient = {
    from: () => ({ select() { return this }, eq() { return this }, maybeSingle: async () => ({ data: null }) }),
    rpc: async (name, params) => { saved = { name, params }; return { data: { id: 'new-request' }, error: null } },
  }
  const response = await current.POST(request({
    publication_consent: true, legal_version: legal.NFT_LEGAL_VERSION,
    display_name: 'Test T.', image_path: '7/source.png', image_url: 'private', mint_destination: 'club',
    member_id: 999, actor_id: 'forged',
  }))
  assert.equal(response.status, 200)
  assert.equal(saved.params.p_actor_id, 'signed-in-user')
  assert.equal(saved.params.p_member_id, 7)
  assert.equal(saved.params.p_documents, legal.NFT_LEGAL_DOCUMENTS)
  assert.equal(saved.params.p_payload.publication_consent, true)
})
