-- TUM Blockchain Club Solana membership NFT requests and asset lifecycle.
-- This script is idempotent and upgrades the existing request table in place.

create extension if not exists pgcrypto;

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
  member_id integer not null references public.members_main(id) on delete cascade,
  status text not null default 'pending',
  display_name text not null,
  fun_facts text,
  image_path text not null,
  image_url text not null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text,
  mint_tx_hash text,
  burn_tx_hash text,
  update_tx_hash text
);

alter table public.nft_requests
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists request_image_bucket text,
  add column if not exists approved_display_name text,
  add column if not exists approved_fun_facts text,
  add column if not exists approved_image_path text,
  add column if not exists approved_image_bucket text,
  add column if not exists rendered_image_path text,
  add column if not exists metadata_path text,
  add column if not exists metadata_url text,
  add column if not exists metadata_version integer not null default 0,
  add column if not exists chain_network text not null default 'devnet',
  add column if not exists collection_address text,
  add column if not exists asset_address text,
  add column if not exists owner_address text,
  add column if not exists custody_status text not null default 'club',
  add column if not exists asset_state text not null default 'unminted',
  add column if not exists claim_wallet_address text,
  add column if not exists claim_requested_at timestamptz,
  add column if not exists claimed_at timestamptz,
  add column if not exists minted_at timestamptz,
  add column if not exists updated_on_chain_at timestamptz,
  add column if not exists burned_at timestamptz,
  add column if not exists last_chain_error text,
  add column if not exists reconciled_at timestamptz;

-- Rows created by the previous implementation keep their source bucket.
update public.nft_requests
set request_image_bucket = 'nft-images-picks'
where request_image_bucket is null;

alter table public.nft_requests
  alter column request_image_bucket set default 'nft-request-images',
  alter column request_image_bucket set not null,
  drop constraint if exists nft_requests_wallet_address_check,
  drop constraint if exists nft_requests_wallet_format_check,
  drop constraint if exists nft_requests_wallet_logic_check,
  drop constraint if exists nft_requests_mint_tx_hash_check,
  drop constraint if exists nft_requests_burn_tx_hash_check,
  drop constraint if exists nft_requests_update_tx_hash_check,
  drop constraint if exists nft_requests_status_check,
  drop constraint if exists nft_requests_chain_network_check,
  drop constraint if exists nft_requests_custody_status_check,
  drop constraint if exists nft_requests_asset_state_check,
  drop constraint if exists nft_requests_metadata_version_check,
  drop constraint if exists nft_requests_claim_wallet_address_check;

alter table public.nft_requests
  drop column if exists wallet_address;

alter table public.nft_requests
  add constraint nft_requests_status_check check (status in ('pending', 'approved', 'rejected')),
  add constraint nft_requests_chain_network_check check (chain_network in ('devnet', 'mainnet-beta')),
  add constraint nft_requests_custody_status_check check (custody_status in ('club', 'member')),
  add constraint nft_requests_asset_state_check check (asset_state in ('unminted', 'active', 'alumni', 'burned')),
  add constraint nft_requests_metadata_version_check check (metadata_version >= 0),
  add constraint nft_requests_claim_wallet_address_check check (
    claim_wallet_address is null
    or claim_wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
  );

create unique index if not exists nft_requests_one_per_member on public.nft_requests (member_id);
create unique index if not exists nft_requests_asset_address_unique
  on public.nft_requests (asset_address) where asset_address is not null;
create index if not exists nft_requests_status_created_at_idx
  on public.nft_requests (status, created_at desc);
create index if not exists nft_requests_reconciliation_idx
  on public.nft_requests (asset_state, reconciled_at)
  where asset_address is not null and asset_state <> 'burned';

create or replace function public.handle_nft_requests_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_nft_requests_updated_at on public.nft_requests;
create trigger set_nft_requests_updated_at
before update on public.nft_requests
for each row execute function public.handle_nft_requests_updated_at();

alter table public.nft_requests enable row level security;

drop policy if exists "members can insert their own nft requests" on public.nft_requests;
create policy "members can insert their own nft requests" on public.nft_requests
for insert to authenticated with check (member_id = public.current_member_id());

drop policy if exists "members can view own nft requests and admins can view all" on public.nft_requests;
create policy "members can view own nft requests and admins can view all" on public.nft_requests
for select to authenticated using (
  member_id = public.current_member_id() or public.can_manage_nft_requests()
);

drop policy if exists "admins can update nft requests" on public.nft_requests;
create policy "admins can update nft requests" on public.nft_requests
for update to authenticated using (public.can_manage_nft_requests())
with check (public.can_manage_nft_requests());

drop policy if exists "admins can delete nft requests" on public.nft_requests;
create policy "admins can delete nft requests" on public.nft_requests
for delete to authenticated using (public.can_manage_nft_requests());

grant select, insert, update, delete on public.nft_requests to authenticated;

insert into storage.buckets (id, name, public)
values
  ('nft-request-images', 'nft-request-images', false),
  ('nft-public-assets', 'nft-public-assets', true)
on conflict (id) do update set public = excluded.public;

-- Uploads and deletions are performed by authenticated server routes with the
-- service role. Remove the former direct-client/public source-image policies.
drop policy if exists "nft request images are public" on storage.objects;
drop policy if exists "members can upload their own nft request images" on storage.objects;
drop policy if exists "members and admins can update nft request images" on storage.objects;
drop policy if exists "members and admins can delete nft request images" on storage.objects;
drop policy if exists "dev_open_nft_images" on storage.objects;

update public.nft_requests r
set request_image_bucket = 'nft-request-images'
where r.request_image_bucket = 'nft-images-picks'
  and not exists (
    select 1 from storage.objects o
    where o.bucket_id = r.request_image_bucket and o.name = r.image_path
  );

create table if not exists public.nft_chain_operations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.nft_requests(id) on delete cascade,
  operation text not null check (operation in ('mint', 'update', 'claim', 'burn', 'reconcile')),
  state text not null default 'started' check (state in ('started', 'confirmed', 'failed')),
  asset_address text,
  transaction_signature text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists nft_chain_operations_request_created_idx
  on public.nft_chain_operations (request_id, created_at desc);

alter table public.nft_chain_operations enable row level security;
drop policy if exists "admins can view nft chain operations" on public.nft_chain_operations;
create policy "admins can view nft chain operations" on public.nft_chain_operations
for select to authenticated using (public.can_manage_nft_requests());
