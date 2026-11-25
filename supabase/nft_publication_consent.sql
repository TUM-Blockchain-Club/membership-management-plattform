-- Apply after nft_requests.sql. No consent is inferred for existing requests.
begin;
create table if not exists public.nft_consent_receipts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  member_id integer not null,
  actor_id uuid not null,
  accepted_at timestamptz not null default clock_timestamp(),
  legal_version text not null,
  documents jsonb not null check (jsonb_typeof(documents) = 'object'),
  submission jsonb not null check (jsonb_typeof(submission) = 'object')
);
create index if not exists nft_consent_receipts_request_idx on public.nft_consent_receipts(request_id);
alter table public.nft_consent_receipts enable row level security;
revoke all on public.nft_consent_receipts from public, anon, authenticated, service_role;
grant select, insert on public.nft_consent_receipts to service_role;

alter table public.nft_requests add column if not exists consent_receipt_id uuid references public.nft_consent_receipts(id);
-- All writes use authenticated, authorized server routes. Browser writes must
-- not bypass consent recording or replace the server-owned receipt reference.
revoke insert, update, delete on public.nft_requests from anon, authenticated;

create or replace function public.save_nft_request_with_consent(
  p_member_id integer, p_actor_id uuid, p_payload jsonb, p_documents jsonb,
  p_renew_only boolean default false
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  r public.nft_requests;
  receipt_id uuid;
begin
  if p_actor_id is null or (p_payload->'publication_consent') is distinct from 'true'::jsonb
    or coalesce(p_payload->>'legal_version', '') = ''
    or (p_payload->>'legal_version') is distinct from (p_documents->>'version')
    or p_documents->>'consent' is null or p_documents->'terms' is null or p_documents->'privacy' is null
  then raise exception 'Explicit publication consent and current legal documents are required'; end if;
  -- Serialize submission and renewal, including the first request for a member.
  perform 1 from public.members_main where id = p_member_id for update;
  if not found then raise exception 'Member not found'; end if;
  select * into r from public.nft_requests where member_id = p_member_id for update;
  if r.asset_state = 'burned' then raise exception 'A revoked NFT cannot be republished'; end if;
  if p_renew_only then
    if r.id is null then raise exception 'NFT request not found'; end if;
  else
    insert into public.nft_requests(member_id,status,display_name,fun_facts,image_path,image_url,
      mint_destination,requested_wallet_address,request_image_bucket)
    values (p_member_id,'pending',p_payload->>'display_name',p_payload->>'fun_facts',
      p_payload->>'image_path',p_payload->>'image_url',p_payload->>'mint_destination',
      p_payload->>'requested_wallet_address','nft-request-images')
    on conflict (member_id) do update set status='pending',display_name=excluded.display_name,
      fun_facts=excluded.fun_facts,image_path=excluded.image_path,image_url=excluded.image_url,
      mint_destination=excluded.mint_destination,requested_wallet_address=excluded.requested_wallet_address,
      request_image_bucket=excluded.request_image_bucket,reviewed_at=null,reviewed_by=null,review_note=null
    returning * into r;
  end if;
  insert into public.nft_consent_receipts(request_id,member_id,actor_id,legal_version,documents,submission)
  values(r.id,p_member_id,p_actor_id,p_documents->>'version',p_documents,
    jsonb_build_object('display_name',r.display_name,'fun_facts',r.fun_facts,'image_path',r.image_path,
      'mint_destination',r.mint_destination,'requested_wallet_address',r.requested_wallet_address,
      'approved_display_name',r.approved_display_name,'approved_fun_facts',r.approved_fun_facts,
      'approved_image_path',r.approved_image_path,
      'member_fields',(select jsonb_build_object('department',m."Department",'batch',m."Batch",'status',m."Status")
        from public.members_main m where m.id=p_member_id))) returning id into receipt_id;
  update public.nft_requests set consent_receipt_id=receipt_id where id=r.id returning * into r;
  return to_jsonb(r);
end $$;
revoke all on function public.save_nft_request_with_consent(integer,uuid,jsonb,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.save_nft_request_with_consent(integer,uuid,jsonb,jsonb,boolean) to service_role;
commit;
