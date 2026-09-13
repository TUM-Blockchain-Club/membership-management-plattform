// Isolated PostgreSQL integration test. Requires PostgreSQL 17 tools on PATH
// or PG_BIN; creates no production connections and removes its temporary cluster.
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import assert from 'node:assert/strict'
const bin = process.env.PG_BIN || '/usr/lib/postgresql/17/bin'
const dir = mkdtempSync(join(tmpdir(), 'attendance-test-'))
const env = { ...process.env, PGHOST: dir, PGPORT: '55439', PGDATABASE: 'postgres' }
const docker = process.env.PG_TEST_DOCKER === 'true'
let container
const psql = () => docker ? ['docker', ['exec', '-i', container, 'psql', '-U', 'postgres']] : [join(bin, 'psql'), []]
const sql = (query) => {
  const [command, args] = psql()
  return execFileSync(command, [...args, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'], { env, input: query, encoding: 'utf8' }).trim()
}
const lecture = '00000000-0000-4000-8000-000000000001'
const asMember = (id, query) => `set role authenticated; set request.jwt.claims = '{"email":"member${id}@example.invalid"}'; ${query}`
let started = false
try {
  if (docker) {
    container = execFileSync('docker', ['run', '--rm', '-d', '--network', 'none', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17'], { encoding: 'utf8' }).trim()
    for (let attempt = 0; attempt < 30; attempt++) {
      try { execFileSync('docker', ['exec', container, 'pg_isready', '-U', 'postgres'], { stdio: 'ignore' }); break } catch { await new Promise(resolve => setTimeout(resolve, 1000)) }
    }
  } else {
  execFileSync(join(bin, 'initdb'), ['-D', join(dir, 'data'), '-A', 'trust', '--no-locale'], { stdio: 'ignore' })
  execFileSync(join(bin, 'pg_ctl'), ['-D', join(dir, 'data'), '-l', join(dir, 'log'), '-o', `-F -k ${dir} -p 55439 -h ''`, '-w', 'start'], { stdio: 'ignore' })
  started = true
  }
  sql(`create role authenticated; create role anon; create schema auth; create schema storage;
    create table storage.objects(id integer); create table public.events(id integer);
    create table public.attendance(id integer);
    create table public.members_main(id integer primary key, "TBC Email" text, "Role" text);
    insert into public.members_main values (1, 'member1@example.invalid', 'Board Member'), (2, 'member2@example.invalid', 'Member');
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    create function public.current_member_id() returns integer language sql stable security definer set search_path='' as $$ select id from public.members_main where "TBC Email" = auth.jwt()->>'email' $$;
    grant usage on schema auth to authenticated; grant select on public.members_main to authenticated;`)
  sql(readFileSync('supabase/lectures.sql', 'utf8'))
  sql(readFileSync('supabase/attendance_secure_check_in.sql', 'utf8'))
  // Applying the security migration twice preserves existing schema and data.
  sql(readFileSync('supabase/attendance_secure_check_in.sql', 'utf8'))
  sql(`insert into public.lectures(id,title,kind,scheduled_at) values ('${lecture}','Test lecture','core',now());`)
  assert.equal(sql("select has_table_privilege('authenticated','public.attendance','insert')"), 'f')
  assert.equal(sql("select has_column_privilege('authenticated','public.lectures','current_code','select')"), 'f')
  assert.equal(sql("select has_column_privilege('authenticated','public.lectures','title','select')"), 't')
  assert.equal(sql("select has_function_privilege('anon','public.attendance_check_in(uuid,text)','execute')"), 'f')
  const rpc = (id, name, args) => JSON.parse(sql(asMember(id, `select public.${name}(${args});`)))
  assert.equal(rpc(2, 'attendance_lecture_code', `'${lecture}',true`).status, 403)
  const first = rpc(1, 'attendance_lecture_code', `'${lecture}',true`)
  assert.equal(rpc(1, 'attendance_lecture_code', `'${lecture}',true`).token, first.token)
  assert.equal(rpc(2, 'attendance_check_in', `'${lecture}','WRONG'`).status, 410)
  const code = first.token.split(':')[1]
  assert.equal(rpc(2, 'attendance_check_in', `'${lecture}','${code}'`).alreadyCheckedIn, false)
  assert.equal(rpc(2, 'attendance_check_in', `'${lecture}','${code}'`).alreadyCheckedIn, true)
  assert.equal(sql('select count(*) from public.attendance'), '1')
  sql(`update public.lectures set current_code_at = clock_timestamp() - interval '16 seconds';`)
  const command = asMember(1, `select public.attendance_lecture_code('${lecture}', false);`)
  const results = await Promise.all(Array.from({ length: 6 }, () => promisify(execFile)(psql()[0], [...psql()[1], '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', command], { env })))
  const tokens = results.map(r => JSON.parse(r.stdout.trim()).token)
  assert.equal(new Set(tokens).size, 1)
  assert.notEqual(tokens[0], first.token)
  assert.equal(rpc(2, 'attendance_check_in', `'${lecture}','${code}'`).alreadyCheckedIn, true)
  sql("update public.lectures set previous_code_at=clock_timestamp()-interval '31 seconds',current_code_at=clock_timestamp()-interval '31 seconds';")
  assert.equal(rpc(2, 'attendance_check_in', `'${lecture}','${code}'`).status, 410)
  sql("update public.lectures set is_active=false;")
  assert.equal(rpc(2, 'attendance_check_in', `'${lecture}','${code}'`).status, 403)
  assert.equal(rpc(1, 'attendance_lecture_code', `'${lecture}',false`).status, 409)
  console.log('PASS: permissions, board-only issuance, idempotent start/check-in, six concurrent displays, grace, expiry, stopped lecture, repeatable migration.')
} finally {
  if (container) execFileSync('docker', ['rm', '-f', container], { stdio: 'ignore' })
  if (started) execFileSync(join(bin, 'pg_ctl'), ['-D', join(dir, 'data'), '-m', 'immediate', '-w', 'stop'], { stdio: 'ignore' })
  rmSync(dir, { recursive: true, force: true })
}
