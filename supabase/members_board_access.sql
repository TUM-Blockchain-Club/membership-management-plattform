-- Allow every board member to update every member, independent of department.
-- The client still applies its existing per-field restrictions.

begin;

drop policy if exists "Board members can update department members" on public.members_main;
drop policy if exists "Board members can update all members" on public.members_main;

create policy "Board members can update all members"
on public.members_main
for update
to authenticated
using (
  exists (
    select 1
    from public.members_main board_member
    where lower(btrim(board_member."TBC Email")) = lower(btrim((select auth.jwt()) ->> 'email'))
      and btrim(board_member."Role") = 'Board Member'
  )
)
with check (
  exists (
    select 1
    from public.members_main board_member
    where lower(btrim(board_member."TBC Email")) = lower(btrim((select auth.jwt()) ->> 'email'))
      and btrim(board_member."Role") = 'Board Member'
  )
);

-- Enforce the managed-field rules below RLS as well. Members may choose an
-- initial department for their own row, while later department changes and all
-- role changes remain board/admin managed. Protecting Role prevents a member
-- from bypassing the department rule by promoting their own row first.
create or replace function public.enforce_member_role_and_department_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_email text := lower(btrim(coalesce((select auth.jwt()) ->> 'email', '')));
  actor_is_board boolean := false;
  actor_has_special_access boolean := false;
  normalized_department text;
begin
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;

  select exists (
    select 1
    from public.members_main actor
    where lower(btrim(coalesce(actor."TBC Email", ''))) = actor_email
      and btrim(coalesce(actor."Role", '')) = 'Board Member'
  ) into actor_is_board;

  actor_has_special_access := coalesce(
    public.check_email_has_special_access(actor_email),
    false
  );

  if new."Role" is distinct from old."Role"
    and not actor_is_board
    and not actor_has_special_access then
    raise exception 'Only board members or administrators can change member roles.'
      using errcode = '42501';
  end if;

  if new."Department" is not distinct from old."Department"
    or actor_is_board
    or actor_has_special_access then
    return new;
  end if;

  normalized_department := btrim(coalesce(new."Department", ''));

  if actor_email = lower(btrim(coalesce(old."TBC Email", '')))
    and nullif(btrim(coalesce(old."Department", '')), '') is null
    and normalized_department = any (array[
      'Industry',
      'Web3 Talents',
      'Legal & Finance',
      'External Relations',
      'Education',
      'Marketing',
      'IT & Development',
      'Research'
    ]::text[]) then
    new."Department" := normalized_department;
    return new;
  end if;

  raise exception 'Department can only be selected once when it is empty.'
    using errcode = '42501';
end;
$$;

drop trigger if exists trg_enforce_member_role_and_department_changes
on public.members_main;

create trigger trg_enforce_member_role_and_department_changes
before update of "Role", "Department" on public.members_main
for each row
execute function public.enforce_member_role_and_department_changes();

commit;
