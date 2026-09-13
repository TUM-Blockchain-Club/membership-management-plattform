// Disposable PostgreSQL only: synthetic data, no ports, no network, always removed.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
let container
const sql = query => execFileSync('docker', ['exec','-i',container,'psql','-U','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'], { input: query, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim()
try {
  container = execFileSync('docker',['run','--rm','-d','--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17'],{encoding:'utf8'}).trim()
  for(let i=0;i<30;i++) { try { execFileSync('docker',['exec',container,'pg_isready','-U','postgres'],{stdio:'ignore'}); break } catch { await new Promise(r=>setTimeout(r,1000)) } }
  sql(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
    create table storage.buckets(id text primary key,name text,public boolean);
    create table storage.objects(id uuid,bucket_id text,name text);
    create table public.members_main(id integer primary key,"TBC Email" text,"Role" text,"Department" text,"Batch" text,"Status" text);
    insert into public.members_main values(1,'test@example.invalid','Core Member','IT','1','Active');`)
  sql(readFileSync('supabase/nft_requests.sql','utf8'))
  sql(`insert into public.nft_requests(member_id,display_name,image_path,image_url) values(1,'Test','1/source.png','private');`)
  sql(readFileSync('supabase/nft_publication_consent.sql','utf8'))
  sql(readFileSync('supabase/nft_publication_consent.sql','utf8'))
  assert.equal(sql('select consent_receipt_id is null from public.nft_requests'), 't')
  for (const role of ['anon','authenticated']) {
    for (const verb of ['insert','update','delete']) assert.equal(sql(`select has_table_privilege('${role}','public.nft_requests','${verb}')`),'f')
    assert.equal(sql(`select has_table_privilege('${role}','public.nft_consent_receipts','select')`),'f')
    assert.equal(sql(`select has_function_privilege('${role}','public.save_nft_request_with_consent(integer,uuid,jsonb,jsonb,boolean)','execute')`),'f')
  }
  assert.equal(sql("select has_table_privilege('service_role','public.nft_consent_receipts','update')"),'f')
  const actor='00000000-0000-4000-8000-000000000001'
  const docs={version:'test-v1',consent:'Permission',terms:[],privacy:[]}
  const payload={publication_consent:true,legal_version:'test-v1',display_name:'Updated',image_path:'1/new.png',image_url:'private',mint_destination:'club'}
  const quote=v=>`'${JSON.stringify(v).replaceAll("'","''")}'::jsonb`
  const save=(p,renew=false)=>sql(`set role service_role; select public.save_nft_request_with_consent(1,'${actor}',${quote(p)},${quote(docs)},${renew});`)
  for(const bad of [{...payload,publication_consent:false},{...payload,publication_consent:'true'},{...payload,legal_version:'old'}]) assert.throws(()=>save(bad))
  assert.equal(sql('select count(*) from public.nft_consent_receipts'),'0')
  const renewed=JSON.parse(save(payload,true))
  assert.equal(renewed.display_name,'Test')
  assert.equal(renewed.status,'pending')
  assert.ok(renewed.consent_receipt_id)
  assert.equal(sql('select actor_id from public.nft_consent_receipts'),actor)
  assert.equal(sql("select documents->>'consent' from public.nft_consent_receipts"),'Permission')
  const updated=JSON.parse(save(payload))
  assert.equal(updated.id,renewed.id)
  assert.equal(updated.display_name,'Updated')
  assert.notEqual(updated.consent_receipt_id,renewed.consent_receipt_id)
  assert.equal(sql('select count(*) from public.nft_consent_receipts'),'2')
  // An invalid submission rolls back both request mutation and receipt creation.
  assert.throws(()=>save({...payload,image_path:null}))
  assert.equal(sql('select count(*) from public.nft_consent_receipts'),'2')
  sql("update public.nft_requests set asset_state='burned'")
  assert.throws(()=>save(payload,true))
  assert.throws(()=>save(payload))
  sql('delete from public.nft_requests')
  assert.equal(sql('select count(*) from public.nft_consent_receipts'),'2')
  console.log('PASS: repeatable migration, legacy consent absent, direct-write/RPC permissions, strict consent, atomic save/renewal, immutable evidence, rollback, revoked guard, retained evidence.')
} finally { if(container) execFileSync('docker',['rm','-f',container],{stdio:'ignore'}) }
