import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import ts from 'typescript'

const require = createRequire(import.meta.url)

// Exercise route handlers and the real matching algorithm; only database,
// authentication and email I/O are replaced at the external boundaries.
function fixture({ status = 'pending', completedDuringUpdate = false, historyError = false, authorized = true } = {}) {
  const pair = { id: 'pair-ab', round_id: 'round', person1_id: 1, person2_id: 2, person3_id: null, status,
    selfie_path: status === 'met' ? 'original.jpg' : null, date_met: status === 'met' ? '2026-09-01' : null }
  const members = [1, 2, 3, 4].map(id => ({ id, Name: `Member ${id}`, 'TBC Email': `member${id}@example.invalid`,
    cc_interests: ['Blockchain'], cc_already_know: id === 1 ? [2] : [] }))
  const effects = { updates: [], signups: [], emails: [], commits: [] }
  const round = { id: 'round', month: '2026-09', status: 'open', meet_deadline: null }
  const admin = {
    from(table) {
      let operation = 'select'
      let payload
      const filters = []
      const result = () => {
        if (operation === 'update') {
          if (completedDuringUpdate) pair.status = 'met'
          if (filters.some(([op, key, value]) => op === 'neq' && pair[key] === value)) return { data: null, error: null }
          effects.updates.push(payload)
          Object.assign(pair, payload)
          return { data: { id: pair.id }, error: null }
        }
        if (table === 'cc_rounds') return { data: round, error: null }
        if (table === 'members_main') return { data: members, error: null }
        if (table === 'cc_signups') return { data: members.map(m => ({ member_id: m.id })), error: null }
        if (filters.some(([op]) => op === 'neq')) return { data: [{ person1_id: 1, person2_id: 3, person3_id: null }], error: historyError ? { message: 'History unavailable' } : null }
        if (filters.some(([op, key]) => op === 'eq' && key === 'id')) return { data: pair, error: null }
        return { data: [pair, { id: 'pair-cd', round_id: 'round', person1_id: 3, person2_id: 4, person3_id: null }], error: null }
      }
      const query = {
        select() { return query },
        eq(key, value) { filters.push(['eq', key, value]); return query },
        neq(key, value) { filters.push(['neq', key, value]); return query },
        or() { return query },
        in() { return query },
        update(value) { operation = 'update'; payload = value; return query },
        upsert(value) { effects.signups.push(value); return Promise.resolve({ error: null }) },
        maybeSingle() { return Promise.resolve(result()) },
        then(onFulfilled, onRejected) { return Promise.resolve(result()).then(onFulfilled, onRejected) },
      }
      return query
    },
    rpc(name, args) { effects.commits.push({ name, args }); return Promise.resolve({ data: 2, error: null }) },
  }
  const cache = new Map()
  function load(path) {
    if (cache.has(path)) return cache.get(path)
    const loaded = { exports: {} }
    const code = ts.transpileModule(readFileSync(resolve(path), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText
    const externalRequire = id => {
      if (id === '@/lib/supabase/server') return { createSupabaseServerClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { email: 'admin@example.invalid' } }, error: null }) },
        rpc: async () => ({ data: authorized }),
      }) }
      if (id === '@/lib/server/coffeeChats') return { getCoffeeChatAdminClient: () => admin,
        sendMatchEmail: async options => { effects.emails.push(options) } }
      if (id.startsWith('@/')) return load(`${id.slice(2)}.ts`)
      return require(id)
    }
    new Function('require', 'module', 'exports', code)(externalRequire, loaded, loaded.exports)
    cache.set(path, loaded.exports)
    return loaded.exports
  }
  const request = payload => new Request('http://localhost/api/coffee-chats', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  return { pair, effects,
    replace: () => load('app/api/coffee-chats/rounds/[roundId]/replace-member/route.ts').POST(
      request({ pairId: pair.id, spot: 'person1', newMemberId: 3 }), { params: Promise.resolve({ roundId: 'round' }) }),
    suggest: () => load('app/api/coffee-chats/run-pairing/route.ts').POST(request({ roundId: 'round', preview: true })),
    run: () => load('app/api/coffee-chats/run-pairing/route.ts').POST(request({ roundId: 'round' })),
  }
}

test('completed meetings reject replacement without changing photos or sending email', async () => {
  const f = fixture({ status: 'met' })
  const response = await f.replace()
  assert.equal(response.status, 409)
  assert.equal(f.pair.person1_id, 1)
  assert.equal(f.pair.selfie_path, 'original.jpg')
  assert.deepEqual(f.effects, { updates: [], signups: [], emails: [], commits: [] })
})

test('pending meetings still allow replacement by someone assigned to another pair', async () => {
  const f = fixture()
  const response = await f.replace()
  assert.equal(response.status, 200)
  assert.equal(f.pair.person1_id, 3)
  assert.equal(f.effects.emails.length, 1)
})

test('suggestions fail without saving or emailing when pairing history cannot be read', async () => {
  const f = fixture({ historyError: true })
  const response = await f.suggest()
  assert.equal(response.status, 500)
  assert.deepEqual(f.effects, { updates: [], signups: [], emails: [], commits: [] })
})

test('members without admin access cannot preview pairings', async () => {
  const f = fixture({ authorized: false })
  const response = await f.suggest()
  assert.equal(response.status, 403)
  assert.deepEqual(f.effects, { updates: [], signups: [], emails: [], commits: [] })
})

test('automatic pairing still commits and sends match notifications', async () => {
  const f = fixture()
  const response = await f.run()
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.pairsCreated, 2)
  assert.equal(body.emailsSent, 4)
  assert.equal(f.effects.commits.length, 1)
})

test('a meeting completed during replacement rejects the update and notification', async () => {
  const f = fixture({ completedDuringUpdate: true })
  const response = await f.replace()
  assert.equal(response.status, 409)
  assert.equal(f.pair.person1_id, 1)
  assert.deepEqual(f.effects, { updates: [], signups: [], emails: [], commits: [] })
})

test('automatic suggestions respect saved exclusions and previous partners without committing or emailing', async () => {
  const f = fixture()
  const response = await f.suggest()
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.pairs.length, 2)
  const match = body.pairs.find(p => [p.person1Id, p.person2Id, p.person3Id].includes(1))
  assert.deepEqual([match.person1Id, match.person2Id].sort(), [1, 4])
  assert.deepEqual(f.effects, { updates: [], signups: [], emails: [], commits: [] })
})
