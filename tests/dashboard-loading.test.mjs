import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const ts = require('typescript')
function load(file, deps) {
  const exports = {}
  const code = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports, URL, Date, require: id => { if (!(id in deps)) throw new Error(`Unexpected dependency ${id}`); return deps[id] } })
  return exports
}
let context, calls
const route = load('app/api/dashboard/data/route.ts', {
  'next/server': { NextResponse: { json: Response.json } },
  '@/lib/server/requestMember': { getRequestMember: async () => context },
  '@/lib/server/dashboardData': {
    loadDashboardMembers: async client => { calls.push(['members', client]); return [] },
    loadDashboardEvents: async (client, id) => { calls.push(['events', client, id]); return [] },
  },
})
const request = resource => new Request(`http://localhost/api/dashboard/data?resource=${resource}`)
test('lazy endpoint rejects unknown, unauthenticated and non-member requests without loading lists', async () => {
  calls = []; context = { user: null, member: null }
  assert.equal((await route.GET(request('secrets'))).status, 400)
  assert.equal((await route.GET(request('members'))).status, 401)
  context = { user: { id: 'user' }, member: null }
  assert.equal((await route.GET(request('events'))).status, 403)
  context.error = new Error('private database details')
  const response = await route.GET(request('members'))
  assert.equal(response.status, 503)
  assert.equal((await response.text()).includes('private database details'), false)
  assert.equal(calls.length, 0)
})
test('lazy endpoint loads only requested data using the authenticated client, never browser-supplied identity', async () => {
  calls = []; const client = {}
  context = { user: { id: 'user' }, member: { id: 7 }, dataClient: client }
  const response = await route.GET(request('members'))
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.equal(calls.length, 1); assert.equal(calls[0][0], 'members'); assert.equal(calls[0][1], client)
  await route.GET(new Request('http://localhost/api/dashboard/data?resource=events&memberId=999'))
  assert.equal(calls[1][2], 7)
})
test('shell loads no collections and reuses own special access instead of querying it twice', async () => {
  const rpcCalls = []
  const initial = load('app/dashboard/lib/loadDashboardInitialData.ts', {
    'server-only': {}, react: { cache: fn => fn },
    '@/lib/server/requestMember': { getRequestMember: async () => ({
      member: { id: 7, 'TBC Email': 'synthetic@example.invalid' }, user: { email: 'synthetic@example.invalid' },
      supabase: { rpc: async name => { rpcCalls.push(name); return { data: true } } },
    }) },
    '@/lib/devBypass': { hasLocalDevBypassSpecialAccess: () => false },
    '@/lib/coffee-chats': { coffeeChatsDemoEnabled: false },
  })
  const data = await initial.loadDashboardInitialData()
  assert.equal(data.allMembers.length, 0); assert.equal(data.events.length, 0)
  assert.equal(data.viewedMemberHasSpecialAccess, true)
  assert.equal(rpcCalls.length, 4)
  assert.equal(rpcCalls.includes('check_email_has_special_access'), false)
})
test('Home limits upcoming events at the database and never fetches registration or interest lists', async () => {
  const operations = []
  const query = Object.fromEntries(['select', 'gte', 'order', 'limit'].map(method => [method, (...args) => { operations.push([method, ...args]); return query }]))
  query.then = resolve => Promise.resolve({ data: [{ id: 'future' }], error: null }).then(resolve)
  const loaders = load('lib/server/dashboardData.ts', {
    'server-only': {},
    '@/lib/server/requestMember': { MEMBER_COLUMNS: 'id', getRequestMember: async () => ({ member: { id: 7 }, dataClient: { from: table => { assert.equal(table, 'events'); return query } } }) },
  })
  assert.equal((await loaders.loadHomeEvents()).length, 1)
  assert.equal(operations.find(item => item[0] === 'limit')[1], 2)
  assert.equal(operations.find(item => item[0] === 'gte')[1], 'end_at')
})
