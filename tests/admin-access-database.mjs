// Isolated PostgreSQL security/migration test. No production data, ports or network.
import assert from 'node:assert/strict'
import { execFileSync, execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { promisify } from 'node:util'
let container
const args=()=>['exec','-i',container,'psql','-U','postgres','-X','-qAt','-v','ON_ERROR_STOP=1']
const sql=q=>execFileSync('docker',args(),{input:q,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim()
const actor=id=>`set role authenticated; set request.jwt.claims='{"email":"member${id}@example.invalid","sub":"00000000-0000-4000-8000-${String(id).padStart(12,'0')}"}'; `
const change=(id,target,scope,enabled)=>sql(actor(id)+`select public.set_admin_access(${target},'${scope}',${enabled});`)
const migration=readFileSync('supabase/admin_access.sql','utf8')
try {
  container=execFileSync('docker',['run','--rm','-d','--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17'],{encoding:'utf8'}).trim()
  for(let i=0;i<30;i++){try{execFileSync('docker',['exec',container,'pg_isready','-h','127.0.0.1','-U','postgres'],{stdio:'ignore'});break}catch{await new Promise(r=>setTimeout(r,1000))}}
  sql(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
    grant usage on schema auth to authenticated,service_role;
    create table public.members_main(id integer primary key,"TBC Email" text,"Role" text,"Status" text);
    insert into public.members_main values
      (1,'member1@example.invalid','Board Member','Active'),(2,'member2@example.invalid','Core Member','Active'),
      (3,'member3@example.invalid','Core Member','Active'),(4,'member4@example.invalid','Core Member','Active'),
      (5,'member5@example.invalid','Core Member','Inactive'),(6,'member6@example.invalid','Core Member','Active');
    create function public.current_member_id() returns integer language sql stable security definer set search_path='' as $$ select id from public.members_main where "TBC Email"=auth.jwt()->>'email' $$;
    create function public.check_email_has_special_access(check_email text) returns boolean language sql stable as $$ select check_email='member3@example.invalid' $$;
    create table public.cc_admins(member_id bigint primary key references public.members_main(id),assigned_by bigint,created_at timestamptz default now());
    create table public.nft_admins(member_id bigint primary key references public.members_main(id),assigned_by bigint,created_at timestamptz default now());
    insert into public.cc_admins(member_id,assigned_by) values(2,1);
    insert into public.nft_admins(member_id,assigned_by) values(4,1);
    grant select on public.members_main to authenticated;
    create function public.check_email_can_manage_coffee_chats(check_email text) returns boolean language sql stable security definer as $$ select exists(select 1 from public.cc_admins where member_id=2) $$;
    create function public.check_email_can_manage_nft_requests(check_email text) returns boolean language sql stable security definer as $$ select exists(select 1 from public.nft_admins where member_id=4) $$;
    create function public.check_email_can_manage_newsletter(check_email text) returns boolean language sql stable security definer as $$ select public.check_email_has_special_access(check_email) $$;
    create table public.mail_fixture(id integer); insert into public.mail_fixture values(1);
    alter table public.mail_fixture enable row level security;
    create policy managers on public.mail_fixture for select to authenticated using(public.check_email_can_manage_newsletter(auth.jwt()->>'email'));
    grant select on public.mail_fixture to authenticated;`)
  sql(migration)
  assert.equal(sql('select count(*) from public.admin_assignments'),'4')
  assert.equal(sql("select relkind from pg_class where oid='public.cc_admins'::regclass"),'v')
  for(const scope of ['coffee_chats','nfts','newsletter']) assert.equal(sql(`select public.check_email_has_admin_scope('member1@example.invalid','${scope}')`),'t')
  assert.equal(sql("select public.check_email_has_admin_scope('member2@example.invalid','coffee_chats')"),'t')
  assert.equal(sql("select public.check_email_has_admin_scope('member4@example.invalid','nfts')"),'t')
  assert.equal(sql(actor(3)+'select count(*) from public.mail_fixture'),'1')
  assert.equal(sql(actor(2)+'select count(*) from public.mail_fixture'),'0')
  for(const id of [2,3,4,6]) assert.throws(()=>change(id,6,'newsletter',true))
  assert.throws(()=>sql("select public.set_admin_access(6,'newsletter',true)"))
  assert.throws(()=>change(1,1,'newsletter',false))
  assert.throws(()=>change(1,5,'newsletter',true))
  assert.throws(()=>change(1,6,'everything',true))
  for(const role of ['authenticated','service_role'])for(const table of ['admin_assignments','admin_access_audit','cc_admins','nft_admins'])for(const action of ['insert','update','delete'])assert.equal(sql(`select has_table_privilege('${role}','public.${table}','${action}')`),'f')
  assert.equal(sql(actor(6)+'select count(*) from public.admin_access_audit'),'0')
  assert.equal(sql(actor(6)+'select count(*) from public.admin_assignments'),'0')
  const replies=await Promise.all(Array.from({length:6},()=>promisify(execFile)('docker',[...args(),'-c',actor(1)+"select public.set_admin_access(6,'newsletter',true);"],{encoding:'utf8'})))
  assert.equal(replies.filter(r=>JSON.parse(r.stdout.trim()).changed).length,1)
  assert.equal(sql("select count(*) from public.admin_access_audit where member_id=6 and action='granted'"),'1')
  assert.equal(sql("select actor_user_id from public.admin_access_audit where member_id=6"),'00000000-0000-4000-8000-000000000001')
  assert.equal(sql(actor(6)+'select count(*) from public.mail_fixture'),'1')
  change(1,6,'newsletter',false)
  assert.equal(sql(actor(6)+'select count(*) from public.mail_fixture'),'0')
  change(1,3,'newsletter',false)
  sql(migration)
  assert.equal(sql("select public.check_email_has_admin_scope('member3@example.invalid','newsletter')"),'f')
  assert.equal(sql("select count(*) from public.admin_access_audit where action='migrated'"),'4')
  sql(`create table public.events(id bigint primary key,event_kind text,end_at timestamptz); grant select on public.events to authenticated;
    insert into public.events values(1,'external',now()+interval '1 day'),(2,'external',now()-interval '1 day'),(3,'external',now()+interval '1 day');`)
  const grantsMigration=readFileSync('supabase/event_grants.sql','utf8')
  sql(grantsMigration)
  sql("update public.events set grant_url='https://example.invalid/apply' where id=3")
  sql(actor(2)+"insert into public.event_grant_applications(event_id,member_id) values(1,2)")
  assert.throws(()=>sql(actor(2)+"insert into public.event_grant_applications(event_id,member_id) values(1,6)"))
  assert.throws(()=>sql(actor(6)+"insert into public.event_grant_applications(event_id,member_id) values(2,6)"))
  assert.throws(()=>sql(actor(6)+"insert into public.event_grant_applications(event_id,member_id) values(3,6)"))
  assert.equal(sql(actor(6)+'select count(*) from public.event_grant_applications'),'0')
  assert.equal(sql(actor(2)+'select count(*) from public.event_grant_applications'),'1')
  assert.equal(sql(actor(1)+'select count(*) from public.event_grant_applications'),'1')
  change(1,6,'grants',true)
  assert.equal(sql(actor(6)+'select count(*) from public.event_grant_applications'),'1')
  assert.throws(()=>change(6,2,'grants',true))
  assert.throws(()=>sql(actor(6)+"update public.event_grant_applications set member_id=6"))
  sql(actor(6)+'delete from public.event_grant_applications where member_id=2')
  assert.equal(sql('select count(*) from public.event_grant_applications'),'1')
  change(1,6,'grants',false)
  assert.equal(sql(actor(6)+'select count(*) from public.event_grant_applications'),'0')
  sql(actor(2)+'delete from public.event_grant_applications where member_id=2')
  assert.equal(sql('select count(*) from public.event_grant_applications'),'0')
  sql(grantsMigration)
  console.log('PASS: grant ownership, privacy, board/scoped visibility, closed events, external forms, withdraw, immutable identity, grant role revocation and repeatable migration.')
  sql(`update public.members_main set "Role"='Core Member' where id=1`)
  assert.throws(()=>change(1,6,'newsletter',true))
  console.log('PASS: legacy imports, board-only writes, scoped mail RLS, automatic board access, read-only legacy views, private immutable audit, concurrent idempotence, safe reapplication and board demotion.')
} finally {if(container)execFileSync('docker',['rm','-f',container],{stdio:'ignore'})}
