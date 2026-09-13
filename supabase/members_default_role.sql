-- New club accounts start as Core Member. Existing explicit roles are preserved
-- during auth linking. The one-time backfill promotes Guest and empty roles only.
begin;

alter table public.members_main alter column "Role" set default 'Core Member';

-- Auth provisioning and controlled migrations run with trusted database roles.
-- Keep the guard invoker-based so this bypass never applies merely because the
-- trigger function is owned by postgres.
create or replace function public.block_guest_core_updates_email()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  actor_role text;
  actor_email text := auth.jwt() ->> 'email';
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') then return new; end if;
  select "Role" into actor_role from public.members_main
    where "TBC Email" = actor_email limit 1;
  if actor_role is null then raise exception 'No member record found for current email'; end if;
  if lower(btrim(actor_role)) in ('guest', 'core member') then
    if new."Role" is distinct from old."Role"
      or new."Status" is distinct from old."Status"
      or new."Department" is distinct from old."Department"
      or new."Project/Task" is distinct from old."Project/Task"
      or new."TBC Email" is distinct from old."TBC Email"
      or new."UUID" is distinct from old."UUID" then
      raise exception 'Not allowed to edit protected member fields for your role';
    end if;
  end if;
  return new;
end $$;

create or replace function public.handle_new_user_members_main()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.members_main ("UUID", "TBC Email", "Name")
  values (new.id, new.email, coalesce(split_part(new.email, '@', 1), 'Member'))
  on conflict ("TBC Email") do update set
    "UUID" = excluded."UUID",
    "Role" = coalesce(nullif(btrim(public.members_main."Role"), ''), excluded."Role"),
    "Name" = coalesce(public.members_main."Name", excluded."Name");
  return new;
end $$;
revoke all on function public.handle_new_user_members_main() from public, anon, authenticated;

update public.members_main set "Role" = 'Core Member'
where "Role" is null or btrim("Role") = '' or lower(btrim("Role")) = 'guest';

commit;
