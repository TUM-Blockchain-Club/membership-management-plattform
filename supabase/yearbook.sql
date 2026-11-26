-- Yearbook schema.
--
-- Members opt in to a yearbook edition, write one message (optionally with a
-- photo) about any TBC member, and maintain their own page (portrait + quote).
-- Only pages and messages where both the author and the subject joined the
-- edition are exported for print.
--
-- All yearbook tables are server-only: RLS is enabled without policies and the
-- anon/authenticated roles have no grants. The guarded `/api/yearbook/*` routes
-- verify the member and use the service role. Photos live in the private
-- `yearbook-photos` bucket and are served through short-lived signed URLs.
--
-- Adds the `yearbook` admin scope (board members inherit it automatically).
-- Safe to re-run.

begin;

create extension if not exists pgcrypto;

-- Admin scope ---------------------------------------------------------------

alter table public.admin_assignments drop constraint if exists admin_assignments_scope_check;
alter table public.admin_assignments add constraint admin_assignments_scope_check
  check (scope in ('coffee_chats','nfts','newsletter','grants','yearbook'));
alter table public.admin_access_audit drop constraint if exists admin_access_audit_scope_check;
alter table public.admin_access_audit add constraint admin_access_audit_scope_check
  check (scope in ('coffee_chats','nfts','newsletter','grants','yearbook'));

create or replace function public.check_email_has_admin_scope(check_email text,check_scope text)
returns boolean language sql stable security definer set search_path='' as $$
  select check_scope in ('coffee_chats','nfts','newsletter','grants','yearbook') and exists (
    select 1 from public.members_main m
    where lower(m."TBC Email")=lower(check_email)
      and (btrim(m."Role")='Board Member' or exists (
        select 1 from public.admin_assignments a where a.member_id=m.id and a.scope=check_scope
      ))
  )
$$;
revoke all on function public.check_email_has_admin_scope(text,text) from public,anon,authenticated;
grant execute on function public.check_email_has_admin_scope(text,text) to service_role;

create or replace function public.set_admin_access(p_member_id bigint,p_scope text,p_enabled boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor_id bigint; target public.members_main; affected integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select id into actor_id from public.members_main
    where lower("TBC Email")=lower(auth.jwt()->>'email') and btrim("Role")='Board Member' for share;
  if actor_id is null then raise exception 'Only board members can manage admin access' using errcode='42501'; end if;
  if p_scope is null or p_scope not in ('coffee_chats','nfts','newsletter','grants','yearbook') or p_enabled is null then
    raise exception 'Invalid access change' using errcode='22023';
  end if;
  -- Board rights are inherited from the member role and cannot be toggled.
  select * into target from public.members_main where id=p_member_id;
  if target.id is null then raise exception 'Member not found' using errcode='22023'; end if;
  if btrim(target."Role")='Board Member' then raise exception 'Board access is automatic' using errcode='22023'; end if;
  select * into target from public.members_main where id=p_member_id for update;
  if btrim(target."Role")='Board Member' then raise exception 'Board access is automatic' using errcode='22023'; end if;
  if p_enabled and target."Status" is distinct from 'Active' then
    raise exception 'Only active members can receive new access' using errcode='22023';
  end if;
  if p_enabled then
    insert into public.admin_assignments(member_id,scope,assigned_by) values(p_member_id,p_scope,actor_id) on conflict do nothing;
  else
    delete from public.admin_assignments where member_id=p_member_id and scope=p_scope;
  end if;
  get diagnostics affected=row_count;
  if affected>0 then
    insert into public.admin_access_audit(member_id,scope,action,actor_member_id,actor_user_id)
      values(p_member_id,p_scope,case when p_enabled then 'granted' else 'revoked' end,actor_id,auth.uid());
  end if;
  return jsonb_build_object('changed',affected>0);
end $$;
revoke all on function public.set_admin_access(bigint,text,boolean) from public,anon,service_role;
grant execute on function public.set_admin_access(bigint,text,boolean) to authenticated;

create or replace function public.check_email_can_manage_yearbook(check_email text)
returns boolean language sql stable security definer set search_path='' as $$
  select public.check_email_has_admin_scope(check_email,'yearbook')
$$;
revoke all on function public.check_email_can_manage_yearbook(text) from public,anon;
grant execute on function public.check_email_can_manage_yearbook(text) to authenticated,service_role;

-- Editions ------------------------------------------------------------------

create table if not exists public.yb_editions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'open',
  closes_at timestamptz,
  created_by bigint references public.members_main(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint yb_editions_title_check check (char_length(btrim(title)) between 1 and 80),
  constraint yb_editions_status_check check (status in ('open','closed'))
);

-- Members only ever see one active edition, so at most one may be open.
create unique index if not exists yb_editions_one_open_idx
  on public.yb_editions ((status)) where status = 'open';
create index if not exists yb_editions_created_at_idx on public.yb_editions (created_at desc);

-- Participants (the opt-in) ---------------------------------------------------

create table if not exists public.yb_participants (
  edition_id uuid not null references public.yb_editions(id) on delete cascade,
  member_id bigint not null references public.members_main(id) on delete cascade,
  quote text,
  portrait_path text,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (edition_id, member_id),
  constraint yb_participants_quote_check check (quote is null or char_length(quote) <= 200)
);

create index if not exists yb_participants_member_idx on public.yb_participants (member_id);

-- Messages --------------------------------------------------------------------

-- One message per author and subject per edition; authors edit it in place.
-- Rows stay when an author leaves, but the export only includes messages where
-- both people are participants, so rejoining restores them.
create table if not exists public.yb_entries (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.yb_editions(id) on delete cascade,
  author_id bigint not null references public.members_main(id) on delete cascade,
  subject_id bigint not null references public.members_main(id) on delete cascade,
  body text not null,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint yb_entries_author_subject_unique unique (edition_id, author_id, subject_id),
  constraint yb_entries_not_self_check check (author_id <> subject_id),
  constraint yb_entries_body_check check (char_length(btrim(body)) between 1 and 600)
);

create index if not exists yb_entries_subject_idx on public.yb_entries (edition_id, subject_id);
create index if not exists yb_entries_author_idx on public.yb_entries (author_id);
create index if not exists yb_entries_subject_member_idx on public.yb_entries (subject_id);

-- Server-only access ----------------------------------------------------------

alter table public.yb_editions enable row level security;
alter table public.yb_participants enable row level security;
alter table public.yb_entries enable row level security;

revoke all on public.yb_editions, public.yb_participants, public.yb_entries from public, anon, authenticated;
grant select, insert, update, delete on public.yb_editions, public.yb_participants, public.yb_entries to service_role;

-- Private photo bucket ----------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('yearbook-photos', 'yearbook-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

commit;
