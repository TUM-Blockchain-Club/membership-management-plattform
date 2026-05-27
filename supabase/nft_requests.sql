-- NFT request schema for the current dashboard form.
--
-- Source of truth in the app:
-- app/dashboard/tabs/NftStatusTab.tsx
--
-- The form currently collects:
--   1. displayName
--   2. picture
--   3. funFacts
--   4. useDifferentWallet + walletAddress
--
-- Important note:
-- The current UI only asks for walletAddress when "Send this NFT to a different wallet"
-- is enabled. That means the database can store a wallet override, but there is still no
-- guaranteed default wallet source for every member. If you later want minting to be fully
-- automatic for every approved request, add a wallet field to members_main or make the wallet
-- mandatory in the form.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'nft_request_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.nft_request_status as enum (
      'pending',
      'approved',
      'rejected',
      'minted'
    );
  end if;
end
$$;

create or replace function public.current_member_id()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select m.id
  from public.members_main m
  where lower(coalesce(m."TBC Email", '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1
$$;

create or replace function public.can_manage_nft_requests()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members_main m
    where lower(coalesce(m."TBC Email", '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and m.id in (0, 99)
  )
$$;

grant execute on function public.current_member_id() to authenticated;
grant execute on function public.can_manage_nft_requests() to authenticated;

create table if not exists public.nft_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_by uuid default auth.uid() references auth.users(id) on delete set null,
  member_id integer not null references public.members_main(id) on delete cascade,
  request_status public.nft_request_status not null default 'pending',
  display_name text not null,
  fun_facts text,
  send_to_different_wallet boolean not null default false,
  wallet_address text,
  picture_bucket text not null default 'nft-request-images',
  picture_path text not null,
  picture_file_name text,
  picture_mime_type text,
  review_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  minted_at timestamptz,
  mint_tx_hash text,
  constraint nft_requests_display_name_check
    check (char_length(btrim(display_name)) between 1 and 120),
  constraint nft_requests_fun_facts_check
    check (fun_facts is null or char_length(fun_facts) <= 50),
  constraint nft_requests_picture_path_check
    check (char_length(btrim(picture_path)) > 0),
  constraint nft_requests_wallet_logic_check
    check (
      (send_to_different_wallet = false and wallet_address is null)
      or
      (send_to_different_wallet = true and wallet_address is not null)
    ),
  constraint nft_requests_wallet_format_check
    check (
      wallet_address is null
      or wallet_address ~* '^0x[a-f0-9]{40}$'
    )
);

create index if not exists nft_requests_member_id_idx
  on public.nft_requests (member_id);

create index if not exists nft_requests_status_created_at_idx
  on public.nft_requests (request_status, created_at desc);

create unique index if not exists nft_requests_one_pending_request_per_member_idx
  on public.nft_requests (member_id)
  where request_status = 'pending';

create or replace function public.handle_nft_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_nft_requests_updated_at on public.nft_requests;

create trigger set_nft_requests_updated_at
before update on public.nft_requests
for each row
execute function public.handle_nft_requests_updated_at();

alter table public.nft_requests enable row level security;

drop policy if exists "members can insert their own nft requests" on public.nft_requests;
create policy "members can insert their own nft requests"
on public.nft_requests
for insert
to authenticated
with check (member_id = public.current_member_id());

drop policy if exists "members can view own nft requests and admins can view all" on public.nft_requests;
create policy "members can view own nft requests and admins can view all"
on public.nft_requests
for select
to authenticated
using (
  member_id = public.current_member_id()
  or public.can_manage_nft_requests()
);

drop policy if exists "admins can update nft requests" on public.nft_requests;
create policy "admins can update nft requests"
on public.nft_requests
for update
to authenticated
using (public.can_manage_nft_requests())
with check (public.can_manage_nft_requests());

drop policy if exists "admins can delete nft requests" on public.nft_requests;
create policy "admins can delete nft requests"
on public.nft_requests
for delete
to authenticated
using (public.can_manage_nft_requests());

grant select, insert, update, delete on public.nft_requests to authenticated;

insert into storage.buckets (id, name, public)
values ('nft-request-images', 'nft-request-images', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "nft request images are public" on storage.objects;
create policy "nft request images are public"
on storage.objects
for select
to public
using (bucket_id = 'nft-request-images');

drop policy if exists "members can upload their own nft request images" on storage.objects;
create policy "members can upload their own nft request images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'nft-request-images'
  and name like (public.current_member_id()::text || '/%')
);

drop policy if exists "members and admins can update nft request images" on storage.objects;
create policy "members and admins can update nft request images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'nft-request-images'
  and (
    public.can_manage_nft_requests()
    or name like (public.current_member_id()::text || '/%')
  )
)
with check (
  bucket_id = 'nft-request-images'
  and (
    public.can_manage_nft_requests()
    or name like (public.current_member_id()::text || '/%')
  )
);

drop policy if exists "members and admins can delete nft request images" on storage.objects;
create policy "members and admins can delete nft request images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'nft-request-images'
  and (
    public.can_manage_nft_requests()
    or name like (public.current_member_id()::text || '/%')
  )
);

create or replace function public.review_nft_request(
  p_request_id uuid,
  p_status public.nft_request_status,
  p_review_note text default null
)
returns public.nft_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.nft_requests;
begin
  if not public.can_manage_nft_requests() then
    raise exception 'Not authorized to review NFT requests';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'p_status must be approved or rejected';
  end if;

  update public.nft_requests
  set request_status = p_status,
      review_note = nullif(btrim(p_review_note), ''),
      reviewed_at = now(),
      reviewed_by = auth.uid()
  where id = p_request_id
  returning * into v_request;

  if v_request.id is null then
    raise exception 'NFT request % not found', p_request_id;
  end if;

  return v_request;
end;
$$;

grant execute on function public.review_nft_request(uuid, public.nft_request_status, text) to authenticated;

-- Example admin load query:
-- select
--   r.id,
--   r.created_at,
--   r.request_status,
--   r.display_name,
--   r.fun_facts,
--   r.send_to_different_wallet,
--   r.wallet_address,
--   r.picture_bucket,
--   r.picture_path,
--   r.review_note,
--   m.id as member_id,
--   m."Name" as member_name,
--   m."TBC Email" as member_email,
--   m."Role" as member_role,
--   m."Department" as member_department
-- from public.nft_requests r
-- join public.members_main m on m.id = r.member_id
-- order by r.created_at desc;

-- Example approve:
-- select public.review_nft_request(
--   '00000000-0000-0000-0000-000000000000',
--   'approved',
--   'Looks good'
-- );

-- Example reject:
-- select public.review_nft_request(
--   '00000000-0000-0000-0000-000000000000',
--   'rejected',
--   'Please upload a clearer portrait'
-- );
