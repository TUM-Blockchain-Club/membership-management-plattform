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

commit;
