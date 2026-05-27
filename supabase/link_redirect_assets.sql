-- Adds board-managed display names and images for link analytics definitions.
-- These fields are intentionally separate from canonical sync fields.

alter table public.link_redirect_definitions
  add column if not exists display_label text,
  add column if not exists image_path text,
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('link-redirect-images', 'link-redirect-images', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "link redirect images are public" on storage.objects;
create policy "link redirect images are public"
on storage.objects
for select
to public
using (bucket_id = 'link-redirect-images');
