-- Seed/migration for testing meeting QR generation in older local/live Supabase schemas.
-- Apply this in the Supabase SQL editor before testing the meeting check-in flow.

create extension if not exists pgcrypto;

alter table public.events
  add column if not exists check_in_enabled boolean not null default false,
  add column if not exists check_in_token uuid default gen_random_uuid();

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'events_event_kind_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events drop constraint events_event_kind_check;
  end if;

  alter table public.events
    add constraint events_event_kind_check
    check (event_kind in ('internal', 'external', 'meeting'));
exception
  when duplicate_object then
    null;
end $$;

alter table public.attendance
  add column if not exists event_id integer,
  add column if not exists checked_in_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'attendance_event_id_fkey'
      and conrelid = 'public.attendance'::regclass
  ) then
    alter table public.attendance
      add constraint attendance_event_id_fkey
      foreign key (event_id) references public.events(id) on delete cascade;
  end if;
end $$;

create index if not exists attendance_event_id_idx
  on public.attendance (event_id);

create unique index if not exists attendance_member_id_event_id_key
  on public.attendance (member_id, event_id);

insert into public.events (
  title,
  description,
  start_at,
  end_at,
  location,
  organizer_department,
  capacity_total,
  event_kind,
  event_type,
  priority,
  external_status,
  city,
  format,
  image_url,
  event_link_url,
  tally_url,
  whatsapp_url,
  is_hackathon,
  attending_names,
  all_day,
  check_in_enabled,
  check_in_token
)
select
  'QR Test Meeting',
  'Mock meeting for testing QR code generation.',
  '2026-07-04T10:00:00+00:00'::timestamptz,
  '2026-07-04T11:00:00+00:00'::timestamptz,
  'TBC Office',
  'Engineering',
  0,
  'meeting',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  false,
  array[]::text[],
  false,
  true,
  gen_random_uuid()
where not exists (
  select 1
  from public.events
  where title = 'QR Test Meeting'
    and event_kind = 'meeting'
);