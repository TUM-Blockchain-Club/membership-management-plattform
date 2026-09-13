import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url), ts = require('typescript')
let user, allowed, accessError, table, writes, calls, missing
const query = {
  select: () => query, eq: () => query, order: () => query,
  update: payload => { writes.push(payload); return query },
  maybeSingle: async () => ({ data: missing ? null : { id: 'round-1', status: 'open' }, error: null }),
  then: resolve => Promise.resolve({ data: table === 'cc_signups' ? [] : null, error: null }).then(resolve),
}
const client = {
  auth: { getUser: async () => ({ data: { user }, error: null }) },
  rpc: async () => ({ data: allowed, error: accessError }),
  from: name => { calls.push(name); table = name; return query },
}
const exports = {}
const code = ts.transpileModule(readFileSync('app/api/coffee-chats/rounds/[roundId]/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
vm.runInNewContext(code, { exports, Response, require: id => ({
  'next/server': { NextResponse: { json: Response.json } },
  '@/lib/supabase/server': { createSupabaseServerClient: async () => client },
  '@/lib/server/coffeeChats': { getCoffeeChatAdminClient: () => client },
})[id] })
const props = { params: Promise.resolve({ roundId: 'round-1' }) }
const request = body => new Request('https://example.invalid/api/coffee-chats/rounds/round-1', { method: 'PATCH', body: JSON.stringify(body) })
const valid = { signup_deadline: '2026-10-01T10:00:00.000Z', meet_deadline: '2026-10-15T10:00:00.000Z' }
test('round details and deadline updates require authenticated Coffee Chat admin access', async () => {
  calls=[];writes=[];user=null;allowed=false
  for (const method of ['GET','PATCH']) assert.equal((await exports[method](request(valid),props)).status,401)
  user={email:'admin@example.invalid'}
  for (const method of ['GET','PATCH']) assert.equal((await exports[method](request(valid),props)).status,403)
  allowed=true;accessError={message:'RPC failed'}
  assert.equal((await exports.GET(request(valid),props)).status,403)
  assert.equal(calls.length,0)
  accessError=null
  assert.equal((await exports.GET(request(valid),props)).status,200)
})
test('deadline edits validate dates and ordering and only update allowed fields', async () => {
  user={email:'admin@example.invalid'};allowed=true;accessError=null;writes=[];missing=false
  for (const body of [null, {}, {...valid,signup_deadline:'bad'}, {...valid,meet_deadline:'2026-02-30T10:00:00.000Z'}, {...valid,signup_deadline:valid.meet_deadline,meet_deadline:valid.signup_deadline}]) {
    assert.equal((await exports.PATCH(request(body),props)).status,400)
  }
  assert.equal(writes.length,0)
  assert.equal((await exports.PATCH(request({...valid,status:'paired',month:'forged'}),props)).status,200)
  assert.equal(JSON.stringify(writes[0]),JSON.stringify(valid))
  assert.equal((await exports.PATCH(request({signup_deadline:null,meet_deadline:null}),props)).status,200)
  missing=true
  assert.equal((await exports.PATCH(request(valid),props)).status,404)
  assert.equal((await exports.GET(request(valid),props)).status,404)
})
