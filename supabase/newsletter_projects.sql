-- Newsletter projects schema.
--
-- Stores GrapeJS-based email campaigns created in the Newsletter tab.
-- Access is restricted to newsletter managers: board members or users with
-- explicit special access.

create extension if not exists pgcrypto;

create index if not exists members_main_tbc_email_lower_idx
  on public.members_main (lower("TBC Email"));

create or replace function public.check_email_can_manage_newsletter(check_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.check_email_has_special_access(check_email), false)
    or exists (
      select 1
      from public.members_main
      where lower("TBC Email") = lower(check_email)
        and btrim("Role") = 'Board Member'
    );
$$;

grant execute on function public.check_email_can_manage_newsletter(text) to authenticated;

create table if not exists public.newsletter_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Untitled',
  subject text,
  from_name text,
  from_email text,
  to_address text,
  html text,
  gjs_data jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_projects_created_by_idx
  on public.newsletter_projects (created_by);

create index if not exists newsletter_projects_updated_at_idx
  on public.newsletter_projects (updated_at desc);

create or replace function public.handle_newsletter_projects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_newsletter_projects_updated_at on public.newsletter_projects;

create trigger set_newsletter_projects_updated_at
before update on public.newsletter_projects
for each row
execute function public.handle_newsletter_projects_updated_at();

alter table public.newsletter_projects enable row level security;

drop policy if exists "special access users can manage newsletter projects" on public.newsletter_projects;

drop policy if exists "special access users can read newsletter projects" on public.newsletter_projects;
create policy "special access users can read newsletter projects"
on public.newsletter_projects
for select
to authenticated
using (public.check_email_can_manage_newsletter((select auth.jwt()) ->> 'email'));

drop policy if exists "special access users can create newsletter projects" on public.newsletter_projects;
create policy "special access users can create newsletter projects"
on public.newsletter_projects
for insert
to authenticated
with check (
  public.check_email_can_manage_newsletter((select auth.jwt()) ->> 'email')
  and created_by = (select auth.uid())
);

drop policy if exists "special access users can update own newsletter projects" on public.newsletter_projects;
drop policy if exists "special access users can update newsletter projects" on public.newsletter_projects;
create policy "special access users can update newsletter projects"
on public.newsletter_projects
for update
to authenticated
using (public.check_email_can_manage_newsletter((select auth.jwt()) ->> 'email'))
with check (public.check_email_can_manage_newsletter((select auth.jwt()) ->> 'email'));

drop policy if exists "special access users can delete own newsletter projects" on public.newsletter_projects;
drop policy if exists "special access users can delete newsletter projects" on public.newsletter_projects;
create policy "special access users can delete newsletter projects"
on public.newsletter_projects
for delete
to authenticated
using (public.check_email_can_manage_newsletter((select auth.jwt()) ->> 'email'));

grant select, insert, update, delete on public.newsletter_projects to authenticated;

create table if not exists public.newsletter_deliveries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.newsletter_projects(id) on delete set null,
  delivery_type text not null default 'campaign',
  status text not null default 'sent',
  subject text not null,
  from_name text,
  from_email text not null,
  recipient text not null,
  mailgun_message_id text,
  mailgun_message text,
  last_event text,
  last_event_at timestamptz,
  event_summary jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'newsletter_deliveries_delivery_type_check'
      and conrelid = 'public.newsletter_deliveries'::regclass
  ) then
    alter table public.newsletter_deliveries
      add constraint newsletter_deliveries_delivery_type_check
      check (delivery_type in ('test', 'campaign'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'newsletter_deliveries_status_check'
      and conrelid = 'public.newsletter_deliveries'::regclass
  ) then
    alter table public.newsletter_deliveries
      add constraint newsletter_deliveries_status_check
      check (status in ('sent', 'delivered', 'failed'));
  end if;
end $$;

create index if not exists newsletter_deliveries_project_id_idx
  on public.newsletter_deliveries (project_id);

create index if not exists newsletter_deliveries_created_by_idx
  on public.newsletter_deliveries (created_by);

create index if not exists newsletter_deliveries_created_at_idx
  on public.newsletter_deliveries (created_at desc);

create unique index if not exists newsletter_deliveries_mailgun_message_id_idx
  on public.newsletter_deliveries (mailgun_message_id)
  where mailgun_message_id is not null;

drop trigger if exists set_newsletter_deliveries_updated_at on public.newsletter_deliveries;

create trigger set_newsletter_deliveries_updated_at
before update on public.newsletter_deliveries
for each row
execute function public.handle_newsletter_projects_updated_at();

alter table public.newsletter_deliveries enable row level security;

drop policy if exists "special access users can read newsletter deliveries" on public.newsletter_deliveries;
create policy "special access users can read newsletter deliveries"
on public.newsletter_deliveries
for select
to authenticated
using (public.check_email_can_manage_newsletter((select auth.jwt()) ->> 'email'));

drop policy if exists "special access users can create newsletter deliveries" on public.newsletter_deliveries;
create policy "special access users can create newsletter deliveries"
on public.newsletter_deliveries
for insert
to authenticated
with check (
  public.check_email_can_manage_newsletter((select auth.jwt()) ->> 'email')
  and created_by = (select auth.uid())
);

drop policy if exists "special access users can update newsletter deliveries" on public.newsletter_deliveries;
create policy "special access users can update newsletter deliveries"
on public.newsletter_deliveries
for update
to authenticated
using (public.check_email_can_manage_newsletter((select auth.jwt()) ->> 'email'))
with check (public.check_email_can_manage_newsletter((select auth.jwt()) ->> 'email'));

drop policy if exists "special access users can delete newsletter deliveries" on public.newsletter_deliveries;
create policy "special access users can delete newsletter deliveries"
on public.newsletter_deliveries
for delete
to authenticated
using (public.check_email_can_manage_newsletter((select auth.jwt()) ->> 'email'));

grant select, insert, update, delete on public.newsletter_deliveries to authenticated;

create table if not exists public.newsletter_delivery_events (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.newsletter_deliveries(id) on delete cascade,
  event text not null,
  recipient text not null,
  event_timestamp timestamptz not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists newsletter_delivery_events_delivery_id_idx
  on public.newsletter_delivery_events (delivery_id);

create index if not exists newsletter_delivery_events_event_timestamp_idx
  on public.newsletter_delivery_events (event_timestamp desc);

create unique index if not exists newsletter_delivery_events_unique_event_idx
  on public.newsletter_delivery_events (delivery_id, event, recipient, event_timestamp);

alter table public.newsletter_delivery_events enable row level security;

drop policy if exists "special access users can read newsletter delivery events" on public.newsletter_delivery_events;
create policy "special access users can read newsletter delivery events"
on public.newsletter_delivery_events
for select
to authenticated
using (public.check_email_can_manage_newsletter((select auth.jwt()) ->> 'email'));

drop policy if exists "special access users can create newsletter delivery events" on public.newsletter_delivery_events;
create policy "special access users can create newsletter delivery events"
on public.newsletter_delivery_events
for insert
to authenticated
with check (public.check_email_can_manage_newsletter((select auth.jwt()) ->> 'email'));

drop policy if exists "special access users can delete newsletter delivery events" on public.newsletter_delivery_events;
create policy "special access users can delete newsletter delivery events"
on public.newsletter_delivery_events
for delete
to authenticated
using (public.check_email_can_manage_newsletter((select auth.jwt()) ->> 'email'));

grant select, insert, delete on public.newsletter_delivery_events to authenticated;

insert into storage.buckets (id, name, public)
values ('newsletter-assets', 'newsletter-assets', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "newsletter assets are public" on storage.objects;
create policy "newsletter assets are public"
on storage.objects
for select
to public
using (bucket_id = 'newsletter-assets');

drop policy if exists "special access users can upload newsletter assets" on storage.objects;
create policy "special access users can upload newsletter assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'newsletter-assets'
  and public.check_email_can_manage_newsletter((select auth.jwt()) ->> 'email')
);

drop policy if exists "special access users can update newsletter assets" on storage.objects;
create policy "special access users can update newsletter assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'newsletter-assets'
  and public.check_email_can_manage_newsletter((select auth.jwt()) ->> 'email')
)
with check (
  bucket_id = 'newsletter-assets'
  and public.check_email_can_manage_newsletter((select auth.jwt()) ->> 'email')
);

drop policy if exists "special access users can delete newsletter assets" on storage.objects;
create policy "special access users can delete newsletter assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'newsletter-assets'
  and public.check_email_can_manage_newsletter((select auth.jwt()) ->> 'email')
);
