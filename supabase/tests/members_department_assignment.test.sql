-- Run against a configured test database with:
-- psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/tests/members_department_assignment.test.sql

begin;

alter table public.members_main disable trigger "Strapi Webhook";

insert into public.members_main ("Name", "TBC Email", "Role", "Department")
values
  ('Department Test Member', 'member-department-once@example.invalid', 'Core Member', null),
  ('Department Test Board', 'board-department-once@example.invalid', 'Board Member', 'Research');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"email":"member-department-once@example.invalid","role":"authenticated"}',
  true
);

update public.members_main
set "Department" = 'Research'
where "TBC Email" = 'member-department-once@example.invalid';

do $$
begin
  if not exists (
    select 1
    from public.members_main
    where "TBC Email" = 'member-department-once@example.invalid'
      and "Department" = 'Research'
  ) then
    raise exception 'Initial department assignment did not persist.';
  end if;
end;
$$;

do $$
begin
  update public.members_main
  set "Department" = 'Marketing'
  where "TBC Email" = 'member-department-once@example.invalid';

  raise exception 'A member changed an existing department.';
exception
  when insufficient_privilege then null;
end;
$$;

do $$
begin
  update public.members_main
  set "Role" = 'Board Member'
  where "TBC Email" = 'member-department-once@example.invalid';

  raise exception 'A member changed their own role.';
exception
  when insufficient_privilege then null;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"email":"board-department-once@example.invalid","role":"authenticated"}',
  true
);

update public.members_main
set "Department" = 'Marketing'
where "TBC Email" = 'member-department-once@example.invalid';

do $$
begin
  if not exists (
    select 1
    from public.members_main
    where "TBC Email" = 'member-department-once@example.invalid'
      and "Department" = 'Marketing'
  ) then
    raise exception 'Board department correction did not persist.';
  end if;
end;
$$;

reset role;
rollback;
