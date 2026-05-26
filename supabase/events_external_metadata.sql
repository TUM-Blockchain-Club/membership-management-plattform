-- Add structured support for internal organization events and external ecosystem events.
-- Apply this in the Supabase SQL editor or through a direct Postgres migration runner.

alter table public.events
  add column if not exists event_kind text not null default 'internal',
  add column if not exists event_type text,
  add column if not exists priority text,
  add column if not exists external_status text,
  add column if not exists city text,
  add column if not exists format text,
  add column if not exists image_url text,
  add column if not exists event_link_url text,
  add column if not exists is_hackathon boolean not null default false,
  add column if not exists attending_names text[] not null default '{}',
  add column if not exists all_day boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_event_kind_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_event_kind_check
      check (event_kind in ('internal', 'external'));
  end if;
end $$;

with external_events (
  title,
  event_type,
  priority,
  external_status,
  city,
  format,
  is_hackathon,
  attending_names
) as (
  values
    ('Vienna Blockchain Week', 'Conference', 'P3', null, 'Vienna', null, false, array[]::text[]),
    ('Nordic Blockchain Conference', 'Conference', 'P3', null, 'Stockholm', null, false, array[]::text[]),
    ('Crypto Valley Conference', 'Conference', 'P4', null, 'Zug', null, false, array[]::text[]),
    ('Istanbul Blockchain Week', 'Conference', 'P3', null, 'Istanbul', null, false, array[]::text[]),
    ('EthConf', 'Conference', 'P2', 'Registration Open', 'New York', null, false, array[]::text[]),
    ('BTC Prague', 'Conference', 'P3', null, 'Prague', null, false, array[]::text[]),
    ('ETHGlobal New York', 'Hackathon', 'P2', null, 'New York', null, true, array[]::text[]),
    ('Solana Summit Germany', 'Conference', 'P1', null, 'Berlin', 'In-Person', false, array[]::text[]),
    ('DappCon', 'Conference', 'P3', 'Registration Open', 'Berlin', null, false, array[]::text[]),
    ('Dutch Blockchain Week Summit', 'Conference', 'P3', null, 'Amsterdam', null, false, array[]::text[]),
    ('Cashflow Conference', 'Conference', 'P4', 'Registration Open', 'Frankfurt', null, false, array[]::text[]),
    ('Pragma Lisbon', 'Conference', 'P3', null, 'Lisbon', null, false, array[]::text[]),
    ('ETHGlobal Lisbon', 'Hackathon', 'P2', null, 'Lisbon', null, true, array[]::text[]),
    ('Conf3rence', 'Conference', 'P2', null, 'Dortmund', null, false, array[]::text[]),
    ('Pragma Tokyo', 'Conference', 'P3', null, 'Tokyo', null, false, array[]::text[]),
    ('ETHGlobal Tokyo', 'Hackathon', 'P2', null, 'Tokyo', null, true, array[]::text[]),
    ('Token 2049 Singapore', 'Conference', 'P3', null, 'Singapore', null, false, array[]::text[]),
    ('Sui Basecamp', 'Conference', 'P3', null, 'Singapore', null, false, array[]::text[]),
    ('Devcon 8', 'Conference, Hackathon', 'P1', null, 'Mumbai, India', null, true, array[]::text[])
)
update public.events as events
set
  event_kind = 'external',
  event_type = external_events.event_type,
  priority = external_events.priority,
  external_status = external_events.external_status,
  city = external_events.city,
  format = external_events.format,
  is_hackathon = external_events.is_hackathon,
  attending_names = external_events.attending_names,
  all_day = true,
  location = external_events.city,
  organizer_department = external_events.event_type,
  description = 'External ecosystem event.'
from external_events
where events.title = external_events.title;

update public.events
set event_kind = 'internal'
where event_kind is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'events'
      and column_name = 'image_link_url'
  ) then
    update public.events
    set event_link_url = image_link_url
    where event_link_url is null
      and image_link_url is not null;

    alter table public.events
      drop column image_link_url;
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "event images are public" on storage.objects;
create policy "event images are public"
on storage.objects
for select
to public
using (bucket_id = 'event-images');
