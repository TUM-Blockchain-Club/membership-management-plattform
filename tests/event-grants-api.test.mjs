import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url), ts = require('typescript')
let user = null, admin = false, calls = []
const query = { select: () => query, eq: (...args) => { calls.push(['eq', ...args]); return query }, order: () => query, upsert: (...args) => { calls.push(['upsert', ...args]); return query }, delete: () => query, then: resolve => Promise.resolve({ data: [], error: null }).then(resolve) }
const client = { auth: { getUser: async () => ({ data: { user } }) }, rpc: async name => ({ data: name === 'current_member_id' ? 7 : admin, error: null }), from: table => { calls.push(['from', table]); return query } }
const exports = {}
const code = ts.transpileModule(readFileSync('app/api/event-grants/route.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
vm.runInNewContext(code, { exports, URL, require: id => ({ 'next/server': { NextResponse: { json: Response.json } }, '@/lib/supabase/server': { createSupabaseServerClient: async () => client } })[id] })
const request = body => new Request('https://example.invalid/api/event-grants', { method: 'POST', body: JSON.stringify(body) })
test('grant endpoints deny unauthenticated users and restrict administrator rosters', async () => {
  assert.equal((await exports.GET(new Request('https://example.invalid/api/event-grants?admin=true'))).status,401)
  assert.equal((await exports.POST(request({eventId:1,apply:true}))).status,401)
  user={id:'synthetic'};calls=[]
  assert.equal((await exports.GET(new Request('https://example.invalid/api/event-grants?admin=true'))).status,403)
  assert.equal(calls.length,0)
  await exports.GET(new Request('https://example.invalid/api/event-grants?viewer=999'))
  assert.equal(JSON.stringify(calls.find(call=>call[0]==='eq')),JSON.stringify(['eq','member_id',7]))
})
test('grant writes reject invalid input and ignore forged member IDs', async () => {
  user={id:'synthetic'}
  for(const body of [null,{}, {eventId:'1',apply:true},{eventId:1,apply:'yes'},{eventId:-1,apply:true}]) assert.equal((await exports.POST(request(body))).status,400)
  calls=[]
  assert.equal((await exports.POST(request({eventId:1,apply:true,memberId:999}))).status,200)
  assert.equal(JSON.stringify(calls.find(call=>call[0]==='upsert')[1]),JSON.stringify({event_id:1,member_id:7}))
})
