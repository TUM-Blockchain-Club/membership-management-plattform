-- Newsletter projects schema.
--
-- Stores GrapeJS-based email campaigns created in the Newsletter tab.
-- Access is restricted to special-access users via RLS using the
-- check_email_has_special_access RPC (same pattern as other admin features).

create extension if not exists pgcrypto;

create table if not exists public.newsletter_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Untitled',
  subject text,
  from_name text,
  from_email text,
  to_address text,
  html text,
  gjs_data jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_projects_created_by_idx
  on public.newsletter_projects (created_by);

create index if not exists newsletter_projects_updated_at_idx
  on public.newsletter_projects (updated_at desc);

create or replace function public.handle_newsletter_projects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_newsletter_projects_updated_at on public.newsletter_projects;

create trigger set_newsletter_projects_updated_at
before update on public.newsletter_projects
for each row
execute function public.handle_newsletter_projects_updated_at();

alter table public.newsletter_projects enable row level security;

drop policy if exists "special access users can manage newsletter projects" on public.newsletter_projects;

create policy "special access users can read newsletter projects"
on public.newsletter_projects
for select
to authenticated
using (public.check_email_has_special_access(auth.jwt() ->> 'email'));

drop policy if exists "special access users can create newsletter projects" on public.newsletter_projects;
create policy "special access users can create newsletter projects"
on public.newsletter_projects
for insert
to authenticated
with check (
  public.check_email_has_special_access(auth.jwt() ->> 'email')
  and created_by = auth.uid()
);

drop policy if exists "special access users can update own newsletter projects" on public.newsletter_projects;
create policy "special access users can update own newsletter projects"
on public.newsletter_projects
for update
to authenticated
using (
  public.check_email_has_special_access(auth.jwt() ->> 'email')
  and created_by = auth.uid()
)
with check (
  public.check_email_has_special_access(auth.jwt() ->> 'email')
  and created_by = auth.uid()
);

drop policy if exists "special access users can delete own newsletter projects" on public.newsletter_projects;
create policy "special access users can delete own newsletter projects"
on public.newsletter_projects
for delete
to authenticated
using (
  public.check_email_has_special_access(auth.jwt() ->> 'email')
  and created_by = auth.uid()
);

grant select, insert, update, delete on public.newsletter_projects to authenticated;

-- Newsletter assets storage bucket (public reads, authenticated uploads)
insert into storage.buckets (id, name, public)
values ('newsletter-assets', 'newsletter-assets', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "newsletter assets are public" on storage.objects;
create policy "newsletter assets are public"
on storage.objects
for select
to public
using (bucket_id = 'newsletter-assets');

drop policy if exists "special access users can upload newsletter assets" on storage.objects;
create policy "special access users can upload newsletter assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'newsletter-assets'
  and public.check_email_has_special_access(auth.jwt() ->> 'email')
);

drop policy if exists "special access users can delete newsletter assets" on storage.objects;
create policy "special access users can delete newsletter assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'newsletter-assets'
  and public.check_email_has_special_access(auth.jwt() ->> 'email')
);
