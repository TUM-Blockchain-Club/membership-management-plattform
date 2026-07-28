-- Lectures + attendance schema.
--
-- Replaces the earlier events-based attendance prototype. Lectures are a
-- separate entity from events. Board members create/edit/delete lectures.
-- When a lecturer starts a lecture, the server begins issuing rotating 6-char
-- codes (refreshed every 15s). A lecture is considered active for 3 hours
-- after `started_at`. Members scan the QR (which the lecturer's screen
-- regenerates client-side every 15s) and the check-in API validates the code.
--
-- Source of truth in the app:
--   - app/dashboard/tabs/attendance/
--   - app/api/lectures/*
--   - app/api/attendance/*
--   - app/attendance/check-in/page.tsx

-- 1. Tear down the old events-based attendance prototype.
drop policy if exists "members view own attendance" on public.attendance;
drop policy if exists "board views all attendance" on public.attendance;
drop policy if exists "members can check in" on public.attendance;
drop policy if exists "board can update events" on public.events;

drop table if exists public.attendance cascade;

alter table public.events drop column if exists check_in_token;
alter table public.events drop column if exists check_in_enabled;

drop policy if exists "qr codes are public" on storage.objects;
drop policy if exists "board can upload qr codes" on storage.objects;
drop policy if exists "board can update qr codes" on storage.objects;

-- The event-qr-codes bucket is no longer used.
-- (Leaving the bucket itself in place is harmless; uncomment to remove.)
-- delete from storage.objects where bucket_id = 'event-qr-codes';
-- delete from storage.buckets where id = 'event-qr-codes';

-- 2. Lectures table.
create table if not exists public.lectures (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null check (kind in ('core', 'side')),
  scheduled_at timestamptz not null,
  location text,
  lecturer_member_id integer references public.members_main(id) on delete set null,
  is_active boolean not null default false,
  started_at timestamptz,
  current_code text,
  current_code_at timestamptz,
  previous_code text,
  previous_code_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lectures_scheduled_at_idx
  on public.lectures (scheduled_at desc);

create index if not exists lectures_is_active_idx
  on public.lectures (is_active)
  where is_active = true;

create or replace function public.handle_lectures_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_lectures_updated_at on public.lectures;
create trigger set_lectures_updated_at
before update on public.lectures
for each row
execute function public.handle_lectures_updated_at();

alter table public.lectures enable row level security;

-- Everyone authenticated can read lectures (members need this for calendar).
drop policy if exists "authenticated can view lectures" on public.lectures;
create policy "authenticated can view lectures"
on public.lectures
for select
to authenticated
using (true);

-- Board members create lectures.
drop policy if exists "board can insert lectures" on public.lectures;
create policy "board can insert lectures"
on public.lectures
for insert
to authenticated
with check (
  exists (
    select 1 from public.members_main m
    where lower(coalesce(m."TBC Email", '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and m."Role" = 'Board Member'
  )
);

-- Board members edit lectures (including start/stop/rotate code).
drop policy if exists "board can update lectures" on public.lectures;
create policy "board can update lectures"
on public.lectures
for update
to authenticated
using (
  exists (
    select 1 from public.members_main m
    where lower(coalesce(m."TBC Email", '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and m."Role" = 'Board Member'
  )
)
with check (
  exists (
    select 1 from public.members_main m
    where lower(coalesce(m."TBC Email", '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and m."Role" = 'Board Member'
  )
);

-- Board members delete lectures.
drop policy if exists "board can delete lectures" on public.lectures;
create policy "board can delete lectures"
on public.lectures
for delete
to authenticated
using (
  exists (
    select 1 from public.members_main m
    where lower(coalesce(m."TBC Email", '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and m."Role" = 'Board Member'
  )
);

grant select, insert, update, delete on public.lectures to authenticated;

-- 3. Attendance table (re-created, now keyed on lectures).
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  member_id integer not null references public.members_main(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  unique (member_id, lecture_id)
);

create index if not exists attendance_lecture_id_idx on public.attendance (lecture_id);
create index if not exists attendance_member_id_idx on public.attendance (member_id);
create index if not exists attendance_checked_in_at_idx on public.attendance (checked_in_at desc);

alter table public.attendance enable row level security;

-- Members see own attendance.
drop policy if exists "members view own attendance" on public.attendance;
create policy "members view own attendance"
on public.attendance
for select
to authenticated
using (member_id = public.current_member_id());

-- Board sees all attendance.
drop policy if exists "board views all attendance" on public.attendance;
create policy "board views all attendance"
on public.attendance
for select
to authenticated
using (
  exists (
    select 1 from public.members_main m
    where lower(coalesce(m."TBC Email", '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and m."Role" = 'Board Member'
  )
);

-- Members insert their own attendance (the check-in API path).
drop policy if exists "members can check in" on public.attendance;
create policy "members can check in"
on public.attendance
for insert
to authenticated
with check (member_id = public.current_member_id());

grant select, insert on public.attendance to authenticated;
