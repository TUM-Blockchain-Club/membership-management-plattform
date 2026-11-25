-- Central scoped administration. Apply after Coffee Chats, NFTs and newsletter setup.
-- Copies all legacy assignments before replacing the old tables with read-only views.
begin;
create table if not exists public.admin_assignments (
  member_id bigint not null references public.members_main(id) on delete cascade,
  scope text not null check (scope in ('coffee_chats','nfts','newsletter')),
  assigned_by bigint references public.members_main(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (member_id,scope)
);
create table if not exists public.admin_access_audit (
  id bigint generated always as identity primary key,
  member_id bigint not null,
  scope text not null check (scope in ('coffee_chats','nfts','newsletter')),
  action text not null check (action in ('granted','revoked','migrated')),
  actor_member_id bigint,
  actor_user_id uuid,
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists admin_access_audit_created_idx on public.admin_access_audit(created_at desc);

create or replace function public.can_manage_admin_access()
returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists (
    select 1 from public.members_main m
    where lower(m."TBC Email")=lower(auth.jwt()->>'email') and btrim(m."Role")='Board Member'
  )
$$;
revoke all on function public.can_manage_admin_access() from public,anon;
grant execute on function public.can_manage_admin_access() to authenticated,service_role;

alter table public.admin_assignments enable row level security;
alter table public.admin_access_audit enable row level security;
drop policy if exists "board or own admin assignments" on public.admin_assignments;
create policy "board or own admin assignments" on public.admin_assignments for select to authenticated
using (public.can_manage_admin_access() or member_id=public.current_member_id());
drop policy if exists "board reads admin audit" on public.admin_access_audit;
create policy "board reads admin audit" on public.admin_access_audit for select to authenticated
using (public.can_manage_admin_access());
revoke all on public.admin_assignments,public.admin_access_audit from public,anon,authenticated,service_role;
grant select on public.admin_assignments,public.admin_access_audit to authenticated,service_role;

-- Run the legacy imports only while the original tables still exist. Reapplying
-- the migration must never restore rights that the board has since revoked.
do $$
declare legacy text; feature text;
begin
  if exists (select 1 from pg_class where oid=to_regclass('public.cc_admins') and relkind='r') then
    with imported as (
      insert into public.admin_assignments(member_id,scope)
      select m.id,s.scope from public.members_main m
      cross join (values ('coffee_chats'),('newsletter')) s(scope)
      where coalesce(public.check_email_has_special_access(m."TBC Email"),false)
        and btrim(coalesce(m."Role",'')) <> 'Board Member'
        and (s.scope='newsletter' or not exists (select 1 from public.cc_admins ca where ca.member_id=m.id))
      on conflict do nothing returning member_id,scope
    ) insert into public.admin_access_audit(member_id,scope,action)
      select member_id,scope,'migrated' from imported;
  end if;
  for legacy,feature in select * from (values ('cc_admins','coffee_chats'),('nft_admins','nfts')) v loop
    if exists (select 1 from pg_class where oid=to_regclass('public.'||legacy) and relkind='r') then
      execute format('with imported as (
        insert into public.admin_assignments(member_id,scope,assigned_by,created_at)
        select member_id,%L,assigned_by,created_at from public.%I
        on conflict do nothing returning member_id,scope,assigned_by
      ) insert into public.admin_access_audit(member_id,scope,actor_member_id,action)
        select member_id,scope,assigned_by,''migrated'' from imported',feature,legacy);
      execute format('drop table public.%I',legacy);
    end if;
  end loop;
end $$;

-- Compatibility for existing readers; these views never own another copy of rights.
create or replace view public.cc_admins with (security_invoker=true) as
select member_id,assigned_by,created_at from public.admin_assignments where scope='coffee_chats';
create or replace view public.nft_admins with (security_invoker=true) as
select member_id,assigned_by,created_at from public.admin_assignments where scope='nfts';
revoke all on public.cc_admins,public.nft_admins from public,anon,authenticated,service_role;
grant select on public.cc_admins,public.nft_admins to authenticated,service_role;

create or replace function public.check_email_has_admin_scope(check_email text,check_scope text)
returns boolean language sql stable security definer set search_path='' as $$
  select check_scope in ('coffee_chats','nfts','newsletter') and exists (
    select 1 from public.members_main m
    where lower(m."TBC Email")=lower(check_email)
      and (btrim(m."Role")='Board Member' or exists (
        select 1 from public.admin_assignments a where a.member_id=m.id and a.scope=check_scope
      ))
  )
$$;
revoke all on function public.check_email_has_admin_scope(text,text) from public,anon,authenticated;
grant execute on function public.check_email_has_admin_scope(text,text) to service_role;

create or replace function public.check_email_can_manage_coffee_chats(check_email text)
returns boolean language sql stable security definer set search_path='' as $$
  select public.check_email_has_admin_scope(check_email,'coffee_chats')
$$;
create or replace function public.check_email_can_manage_nft_requests(check_email text)
returns boolean language sql stable security definer set search_path='' as $$
  select public.check_email_has_admin_scope(check_email,'nfts')
$$;
create or replace function public.check_email_can_manage_newsletter(check_email text)
returns boolean language sql stable security definer set search_path='' as $$
  select public.check_email_has_admin_scope(check_email,'newsletter')
$$;
revoke all on function public.check_email_can_manage_coffee_chats(text),public.check_email_can_manage_newsletter(text) from public,anon;
grant execute on function public.check_email_can_manage_coffee_chats(text),public.check_email_can_manage_newsletter(text) to authenticated,service_role;

create or replace function public.set_admin_access(p_member_id bigint,p_scope text,p_enabled boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor_id bigint; target public.members_main; affected integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select id into actor_id from public.members_main
    where lower("TBC Email")=lower(auth.jwt()->>'email') and btrim("Role")='Board Member' for share;
  if actor_id is null then raise exception 'Only board members can manage admin access' using errcode='42501'; end if;
  if p_scope is null or p_scope not in ('coffee_chats','nfts','newsletter') or p_enabled is null then
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
commit;
