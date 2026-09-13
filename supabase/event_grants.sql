begin;
alter table public.admin_assignments drop constraint if exists admin_assignments_scope_check;
alter table public.admin_assignments add constraint admin_assignments_scope_check check(scope in ('coffee_chats','nfts','newsletter','grants'));
alter table public.admin_access_audit drop constraint if exists admin_access_audit_scope_check;
alter table public.admin_access_audit add constraint admin_access_audit_scope_check check(scope in ('coffee_chats','nfts','newsletter','grants'));
create or replace function public.check_email_has_admin_scope(check_email text,check_scope text)
returns boolean language sql stable security definer set search_path='' as $$
  select check_scope in ('coffee_chats','nfts','newsletter','grants') and exists (
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
  if p_scope is null or p_scope not in ('coffee_chats','nfts','newsletter','grants') or p_enabled is null then
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

create or replace function public.can_manage_event_grants() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.check_email_has_admin_scope(auth.jwt()->>'email','grants')
$$;
revoke all on function public.can_manage_event_grants() from public,anon;
grant execute on function public.can_manage_event_grants() to authenticated,service_role;
alter table public.events add column if not exists grant_url text;
create table if not exists public.event_grant_applications (
 event_id bigint not null references public.events(id) on delete cascade,
 member_id bigint not null references public.members_main(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(event_id,member_id)
);
create index if not exists event_grant_applications_member_idx on public.event_grant_applications(member_id);
alter table public.event_grant_applications enable row level security;
revoke all on public.event_grant_applications from public,anon,authenticated;
grant select,insert,delete on public.event_grant_applications to authenticated;
drop policy if exists grant_read on public.event_grant_applications;
create policy grant_read on public.event_grant_applications for select to authenticated using(member_id=(select public.current_member_id()) or (select public.can_manage_event_grants()));
drop policy if exists grant_apply on public.event_grant_applications;
create policy grant_apply on public.event_grant_applications for insert to authenticated with check (
 member_id=(select public.current_member_id()) and exists(select 1 from public.events e where e.id=event_id and e.event_kind='external' and e.end_at>=now() and nullif(btrim(e.grant_url),'') is null)
);
drop policy if exists grant_withdraw on public.event_grant_applications;
create policy grant_withdraw on public.event_grant_applications for delete to authenticated using(member_id=(select public.current_member_id()));
commit;
