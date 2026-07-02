-- event_approvals: aligns already-existing columns to support the event
-- registration approval workflow, and adds the enforcement trigger + RLS
-- policies that make the approval gate real.
--
-- IMPORTANT: this migration does not create new tables, and (with one
-- exception) does not create new columns. The columns below already exist on
-- the live DB from an earlier, unfinished pass (see the unmerged
-- feature/event-approvals branch), but in the wrong type/default/nullability
-- state:
--
--   events.to_be_approved            boolean, nullable, no default
--   event_registrations.status       text, nullable, no default
--   event_registrations.reviewed_by  uuid (wrong; must be bigint -> members_main.id)
--   event_registrations.reviewed_at  date (wrong; must be timestamptz)
--
-- This migration backfills/aligns those columns, adds a status check
-- constraint, adds a BEFORE INSERT trigger that forces the correct status so
-- a client can never insert status = 'approved' directly, and replaces the
-- event_registrations RLS policies so only board members can approve/reject.
--
-- Source of truth in the app:
--   app/api/events/[eventId]/registrations/pending/route.ts
--   app/api/events/[eventId]/registrations/[memberId]/review/route.ts
--   lib/events.ts
--
-- Safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. events.to_be_approved: backfill, default, not null
-- ─────────────────────────────────────────────────────────────────────────────
update public.events
set to_be_approved = false
where to_be_approved is null;

alter table public.events
  alter column to_be_approved set default false;

alter table public.events
  alter column to_be_approved set not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. event_registrations.status: backfill, default, not null, check constraint
-- ─────────────────────────────────────────────────────────────────────────────
-- Existing rows predate the approval workflow and are legacy-approved.
update public.event_registrations
set status = 'approved'
where status is null;

alter table public.event_registrations
  alter column status set default 'approved';

alter table public.event_registrations
  alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.event_registrations'::regclass
      and conname = 'event_registrations_status_check'
  ) then
    alter table public.event_registrations
      add constraint event_registrations_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. event_registrations.reviewed_by: uuid -> bigint references members_main(id)
-- ─────────────────────────────────────────────────────────────────────────────
-- The review endpoint never shipped, so this column is expected to be empty
-- on the live DB. Rather than cast uuid -> bigint (which cannot round-trip),
-- drop and re-add as bigint only if it's still the old uuid column, then
-- attach the FK. Re-running this block after the fix is a no-op.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'event_registrations'
      and column_name = 'reviewed_by'
      and data_type = 'uuid'
  ) then
    alter table public.event_registrations drop column reviewed_by;
  end if;
end
$$;

alter table public.event_registrations
  add column if not exists reviewed_by bigint references public.members_main(id) on delete set null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. event_registrations.reviewed_at: date -> timestamptz
-- ─────────────────────────────────────────────────────────────────────────────
-- Lossless for both empty and populated date data; re-running this against an
-- already-timestamptz column is a harmless identity cast.
alter table public.event_registrations
  alter column reviewed_at type timestamptz using reviewed_at::timestamptz;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Trigger: force status on insert so a client cannot self-approve
-- ─────────────────────────────────────────────────────────────────────────────
-- A registration insert can never set its own status. It is always derived
-- server-side (in Postgres) from whether the target event requires approval,
-- regardless of what the insert payload contains. Board review afterwards
-- happens via UPDATE, which this trigger does not touch.
create or replace function public.enforce_event_registration_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_to_be_approved boolean;
begin
  select to_be_approved into v_to_be_approved
  from public.events
  where id = new.event_id;

  if coalesce(v_to_be_approved, false) then
    new.status := 'pending';
  else
    new.status := 'approved';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_event_registration_status on public.event_registrations;

create trigger enforce_event_registration_status
before insert on public.event_registrations
for each row
execute function public.enforce_event_registration_status();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.event_registrations enable row level security;

-- The current live policies (SELECT for all, INSERT for any authenticated
-- user, DELETE own) predate this repo's SQL files and were never committed,
-- so their exact names are unknown here. Drop every existing policy on this
-- table before applying the intended set, instead of guessing names — a
-- stale permissive policy left in place would silently defeat the approval
-- gate below (permissive policies are OR'd together).
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_registrations'
  loop
    execute format('drop policy if exists %I on public.event_registrations', pol.policyname);
  end loop;
end
$$;

-- Members can read their own registrations.
drop policy if exists "members view own registrations" on public.event_registrations;
create policy "members view own registrations"
on public.event_registrations
for select
to authenticated
using (member_id = current_member_id());

-- Board members can read all registrations (needed for the pending/review UI).
drop policy if exists "board views all registrations" on public.event_registrations;
create policy "board views all registrations"
on public.event_registrations
for select
to authenticated
using (
  exists (
    select 1 from public.members_main m
    where lower(coalesce(m."TBC Email", '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and m."Role" = 'Board Member'
  )
);

-- Members can register only themselves. The BEFORE INSERT trigger above
-- decides the resulting status; this policy only restricts who the row can
-- be for.
drop policy if exists "members insert own registration" on public.event_registrations;
create policy "members insert own registration"
on public.event_registrations
for insert
to authenticated
with check (member_id = current_member_id());

-- Members can withdraw their own registration.
drop policy if exists "members delete own registration" on public.event_registrations;
create policy "members delete own registration"
on public.event_registrations
for delete
to authenticated
using (member_id = current_member_id());

-- Only board members can update a registration — this is the approve/reject
-- gate. Regular members have no UPDATE policy at all, so they cannot edit
-- their own status once inserted.
drop policy if exists "board can review registrations" on public.event_registrations;
create policy "board can review registrations"
on public.event_registrations
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

grant select, insert, update, delete on public.event_registrations to authenticated;
