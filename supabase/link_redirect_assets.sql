-- Adds board-managed display names and images for link analytics definitions.
-- These fields are intentionally separate from canonical sync fields.

alter table public.link_redirect_definitions
  add column if not exists display_label text,
  add column if not exists image_path text,
  add column if not exists image_url text,
  add column if not exists redirect_source text not null default 'soft',
  add column if not exists hardcoded_target_url text,
  add column if not exists hardcoded_synced_at timestamptz;

do $$
begin
  alter table public.link_redirect_definitions
    add constraint link_redirect_definitions_redirect_source_check
    check (redirect_source in ('hardcoded', 'soft'));
exception
  when duplicate_object then null;
end $$;

insert into storage.buckets (id, name, public)
values ('link-redirect-images', 'link-redirect-images', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "link redirect images are public" on storage.objects;
