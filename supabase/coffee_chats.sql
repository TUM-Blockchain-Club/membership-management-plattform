-- Coffee Chats schema.
--
-- Adds member profile fields, monthly rounds, signups, pairings, guarded
-- administration, and a private selfie bucket. Pair creation is committed
-- through one database function so duplicate requests cannot create duplicate
-- matches or leave a round half-updated.

create extension if not exists pgcrypto;

alter table public.members_main add column if not exists cc_interests text[] not null default '{}';
alter table public.members_main add column if not exists cc_study_programme text;
alter table public.members_main add column if not exists cc_already_know bigint[] not null default '{}';
alter table public.members_main add column if not exists cc_favourite_coffee text;
alter table public.members_main add column if not exists cc_favourite_spots text[] not null default '{}';
alter table public.members_main add column if not exists cc_fun_fact text;
alter table public.members_main add column if not exists cc_active boolean not null default false;

create index if not exists members_main_tbc_email_lower_idx
  on public.members_main (lower("TBC Email"));

create table if not exists public.cc_admins (
  member_id bigint primary key references public.members_main(id) on delete cascade,
  assigned_by bigint references public.members_main(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.check_email_can_manage_coffee_chats(check_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.check_email_has_special_access(check_email), false)
    or exists (
      select 1
      from public.members_main m
      where lower(m."TBC Email") = lower(check_email)
        and (
          btrim(m."Role") = 'Board Member'
          or exists (
            select 1 from public.cc_admins ca where ca.member_id = m.id
          )
        )
    );
$$;

revoke all on function public.check_email_can_manage_coffee_chats(text) from public, anon;
grant execute on function public.check_email_can_manage_coffee_chats(text) to authenticated;

alter table public.cc_admins enable row level security;

drop policy if exists "cc_admins select authenticated" on public.cc_admins;
create policy "cc_admins select authenticated"
  on public.cc_admins for select to authenticated
  using (true);

drop policy if exists "cc_admins manage board only" on public.cc_admins;
create policy "cc_admins manage board only"
  on public.cc_admins for all to authenticated
  using (
    exists (
      select 1
      from public.members_main m
      where lower(m."TBC Email") = lower((select auth.jwt()) ->> 'email')
        and btrim(m."Role") = 'Board Member'
    )
    or coalesce(public.check_email_has_special_access((select auth.jwt()) ->> 'email'), false)
  )
  with check (
    exists (
      select 1
      from public.members_main m
      where lower(m."TBC Email") = lower((select auth.jwt()) ->> 'email')
        and btrim(m."Role") = 'Board Member'
    )
    or coalesce(public.check_email_has_special_access((select auth.jwt()) ->> 'email'), false)
  );

grant select, insert, delete on public.cc_admins to authenticated;

create table if not exists public.cc_rounds (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  status text not null default 'open',
  signup_deadline timestamptz,
  meet_deadline timestamptz,
  created_at timestamptz not null default now(),
  constraint cc_rounds_month_format_check check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  constraint cc_rounds_status_check check (status in ('open', 'paired', 'closed')),
  constraint cc_rounds_deadline_order_check check (
    signup_deadline is null or meet_deadline is null or signup_deadline <= meet_deadline
  )
);

create unique index if not exists cc_rounds_month_unique_idx on public.cc_rounds (month);
create unique index if not exists cc_rounds_one_open_idx
  on public.cc_rounds ((status))
  where status = 'open';
create index if not exists cc_rounds_created_at_idx on public.cc_rounds (created_at desc);

create table if not exists public.cc_signups (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.cc_rounds(id) on delete cascade,
  member_id bigint not null references public.members_main(id) on delete cascade,
  signed_up_at timestamptz not null default now(),
  constraint cc_signups_round_member_unique unique (round_id, member_id)
);

create index if not exists cc_signups_round_id_idx on public.cc_signups (round_id);
create index if not exists cc_signups_member_id_idx on public.cc_signups (member_id);

create table if not exists public.cc_pairs (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.cc_rounds(id) on delete cascade,
  person1_id bigint not null references public.members_main(id),
  person2_id bigint not null references public.members_main(id),
  person3_id bigint references public.members_main(id),
  icebreaker_q1 text,
  icebreaker_q2 text,
  icebreaker_q3 text,
  status text not null default 'pending',
  selfie_path text,
  date_met date,
  person1_signed_off boolean not null default false,
  person2_signed_off boolean not null default false,
  person3_signed_off boolean not null default false,
  rating integer,
  highlight_note text,
  created_at timestamptz not null default now(),
  constraint cc_pairs_distinct_people_check check (
    person1_id <> person2_id
    and (person3_id is null or (person3_id <> person1_id and person3_id <> person2_id))
  ),
  constraint cc_pairs_status_check check (status in ('pending', 'met', 'skipped')),
  constraint cc_pairs_rating_check check (rating is null or rating between 1 and 5),
  constraint cc_pairs_highlight_length_check check (char_length(highlight_note) <= 500)
);

alter table public.cc_pairs drop column if exists drive_url;

create index if not exists cc_pairs_round_id_idx on public.cc_pairs (round_id);
create index if not exists cc_pairs_person1_id_idx on public.cc_pairs (person1_id);
create index if not exists cc_pairs_person2_id_idx on public.cc_pairs (person2_id);
create index if not exists cc_pairs_person3_id_idx on public.cc_pairs (person3_id);

alter table public.cc_rounds enable row level security;
alter table public.cc_signups enable row level security;
alter table public.cc_pairs enable row level security;

drop policy if exists "cc authenticated read rounds" on public.cc_rounds;
create policy "cc authenticated read rounds"
  on public.cc_rounds for select to authenticated
  using (true);

drop policy if exists "cc admin manage rounds" on public.cc_rounds;
create policy "cc admin manage rounds"
  on public.cc_rounds for all to authenticated
  using (public.check_email_can_manage_coffee_chats((select auth.jwt()) ->> 'email'))
  with check (public.check_email_can_manage_coffee_chats((select auth.jwt()) ->> 'email'));

drop policy if exists "cc own signups select" on public.cc_signups;
create policy "cc own signups select"
  on public.cc_signups for select to authenticated
  using (member_id = public.current_member_id());

drop policy if exists "cc own signups insert" on public.cc_signups;
create policy "cc own signups insert"
  on public.cc_signups for insert to authenticated
  with check (
    member_id = public.current_member_id()
    and exists (
      select 1
      from public.members_main member
      where member.id = public.current_member_id()
        and member.cc_active
        and coalesce(cardinality(member.cc_interests), 0) > 0
    )
    and exists (
      select 1
      from public.cc_rounds round
      where round.id = round_id
        and round.status = 'open'
        and (round.signup_deadline is null or round.signup_deadline > now())
    )
  );

drop policy if exists "cc own signups delete" on public.cc_signups;
create policy "cc own signups delete"
  on public.cc_signups for delete to authenticated
  using (member_id = public.current_member_id());

drop policy if exists "cc admin signups" on public.cc_signups;
create policy "cc admin signups"
  on public.cc_signups for all to authenticated
  using (public.check_email_can_manage_coffee_chats((select auth.jwt()) ->> 'email'))
  with check (public.check_email_can_manage_coffee_chats((select auth.jwt()) ->> 'email'));

drop policy if exists "cc own pairs select" on public.cc_pairs;
create policy "cc own pairs select"
  on public.cc_pairs for select to authenticated
  using (
    person1_id = public.current_member_id()
    or person2_id = public.current_member_id()
    or person3_id = public.current_member_id()
  );

drop policy if exists "cc admin pairs" on public.cc_pairs;
create policy "cc admin pairs"
  on public.cc_pairs for all to authenticated
  using (public.check_email_can_manage_coffee_chats((select auth.jwt()) ->> 'email'))
  with check (public.check_email_can_manage_coffee_chats((select auth.jwt()) ->> 'email'));

grant select, insert on public.cc_rounds to authenticated;
grant select, insert, delete on public.cc_signups to authenticated;
grant select on public.cc_pairs to authenticated;

create or replace function public.commit_coffee_chat_pairing(
  target_round_id uuid,
  pair_rows jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  round_status text;
  inserted_count integer;
  participant_count integer;
  distinct_participant_count integer;
begin
  select status into round_status
  from public.cc_rounds
  where id = target_round_id
  for update;

  if not found then
    raise exception 'Round not found';
  end if;

  if round_status <> 'open' then
    raise exception 'Round is not open';
  end if;

  if exists (select 1 from public.cc_pairs where round_id = target_round_id) then
    raise exception 'Round already has pairings';
  end if;

  if pair_rows is null or jsonb_typeof(pair_rows) <> 'array' or jsonb_array_length(pair_rows) = 0 then
    raise exception 'Pair rows must be a non-empty JSON array';
  end if;

  with proposed as (
    select *
    from jsonb_to_recordset(pair_rows) as pair(
      person1_id bigint,
      person2_id bigint,
      person3_id bigint,
      icebreaker_q1 text,
      icebreaker_q2 text,
      icebreaker_q3 text
    )
  ), participants as (
    select person1_id as member_id from proposed
    union all select person2_id from proposed
    union all select person3_id from proposed where person3_id is not null
  )
  select count(*), count(distinct member_id)
  into participant_count, distinct_participant_count
  from participants;

  if participant_count <> distinct_participant_count then
    raise exception 'A member appears in more than one proposed pairing';
  end if;

  if exists (
    with proposed as (
      select *
      from jsonb_to_recordset(pair_rows) as pair(
        person1_id bigint,
        person2_id bigint,
        person3_id bigint,
        icebreaker_q1 text,
        icebreaker_q2 text,
        icebreaker_q3 text
      )
    ), participants as (
      select person1_id as member_id from proposed
      union all select person2_id from proposed
      union all select person3_id from proposed where person3_id is not null
    )
    select 1
    from participants
    left join public.cc_signups signup
      on signup.round_id = target_round_id and signup.member_id = participants.member_id
    where participants.member_id is null or signup.id is null
  ) then
    raise exception 'Every paired member must be signed up for the round';
  end if;

  insert into public.cc_pairs (
    round_id,
    person1_id,
    person2_id,
    person3_id,
    icebreaker_q1,
    icebreaker_q2,
    icebreaker_q3
  )
  select
    target_round_id,
    person1_id,
    person2_id,
    person3_id,
    icebreaker_q1,
    icebreaker_q2,
    icebreaker_q3
  from jsonb_to_recordset(pair_rows) as pair(
    person1_id bigint,
    person2_id bigint,
    person3_id bigint,
    icebreaker_q1 text,
    icebreaker_q2 text,
    icebreaker_q3 text
  );

  get diagnostics inserted_count = row_count;

  update public.cc_rounds
  set status = 'paired'
  where id = target_round_id;

  return inserted_count;
end;
$$;

revoke all on function public.commit_coffee_chat_pairing(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.commit_coffee_chat_pairing(uuid, jsonb) to service_role;

insert into storage.buckets (id, name, public)
values ('coffee-chat-selfies', 'coffee-chat-selfies', false)
on conflict (id) do update set public = false;

drop policy if exists "cc selfies public read" on storage.objects;
drop policy if exists "cc selfies authenticated upload" on storage.objects;
