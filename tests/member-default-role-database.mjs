// Isolated fixture; never connects to production. Uses an existing postgres:17 image.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
let container
const sql = query => execFileSync('docker', ['exec', '-i', container, 'psql', '-U', 'postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], { input: query, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
try {
  container = execFileSync('docker', ['run', '--rm', '-d', '--network', 'none', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17'], { encoding: 'utf8' }).trim()
  for (let i = 0; i < 60; i++) {
    try {
      const logs = execFileSync('docker', ['logs', container], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      if (!logs.includes('init process complete; ready for start up')) throw new Error('Initializing')
      sql('select 1'); break
    } catch { await new Promise(resolve => setTimeout(resolve, 500)) }
  }
  sql(`create role authenticated; create role anon; create role service_role; create schema auth;
    create function auth.jwt() returns jsonb language sql as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    grant usage on schema auth to authenticated; grant execute on function auth.jwt() to authenticated;
    create table auth.users(id uuid primary key,email text);
    create table public.members_main(id bigint generated always as identity primary key,"UUID" uuid,"TBC Email" text unique,"Role" text,"Name" text,"Status" text,"Department" text,"Project/Task" text);
    insert into public.members_main("TBC Email","Role","Status") values
      ('guest@example.invalid','GUEST','Passive'),('guest2@example.invalid','Guest',null),
      ('empty@example.invalid',null,null),('blank@example.invalid','   ',null),
      ('board@example.invalid','Board Member','Active'),('ex@example.invalid','Ex-Core Member','Left');`)
  const migration = readFileSync('supabase/members_default_role.sql', 'utf8')
  sql(migration)
  sql(`create trigger guard before update on public.members_main for each row execute function public.block_guest_core_updates_email();
       create trigger provision after insert on auth.users for each row execute function public.handle_new_user_members_main();
       grant select,update on public.members_main to authenticated;`)
  assert.equal(sql(`select count(*) from public.members_main where "Role"='Core Member'`), '4')
  assert.equal(sql(`select "Role"||':'||"Status" from public.members_main where "TBC Email"='ex@example.invalid'`), 'Ex-Core Member:Left')
  assert.equal(sql(`select "Status" from public.members_main where "TBC Email"='guest@example.invalid'`), 'Passive')
  sql(`insert into auth.users values ('00000000-0000-0000-0000-000000000001','new@example.invalid'),('00000000-0000-0000-0000-000000000002','ex@example.invalid'),('00000000-0000-0000-0000-000000000003','board@example.invalid');
       insert into public.members_main("TBC Email") values ('default@example.invalid');`)
  assert.equal(sql(`select "Role" from public.members_main where "TBC Email"='new@example.invalid'`), 'Core Member')
  assert.equal(sql(`select "Role" from public.members_main where "TBC Email"='default@example.invalid'`), 'Core Member')
  assert.equal(sql(`select "Role" from public.members_main where "TBC Email"='ex@example.invalid'`), 'Ex-Core Member')
  assert.equal(sql(`select "Role" from public.members_main where "TBC Email"='board@example.invalid'`), 'Board Member')
  assert.throws(() => sql(`set role authenticated; set request.jwt.claims='{"email":"new@example.invalid"}'; update public.members_main set "Role"='Board Member' where "TBC Email"='new@example.invalid';`))
  sql(`set role authenticated; set request.jwt.claims='{"email":"new@example.invalid"}'; update public.members_main set "Name"='Example' where "TBC Email"='new@example.invalid';`)
  sql(migration)
  console.log('PASS: backfill, preserved roles/status, signup, account linking, database default, privilege guard and idempotency')
} finally {
  if (container) execFileSync('docker', ['stop', container], { stdio: 'ignore' })
}
