# Supabase

This directory contains SQL migration/setup scripts for the live Supabase-backed app.

The current app uses the `public` schema. There is no current `mmp` schema setup in this repository, and there is no active `supabase/schema.sql` file.

For the live schema overview, table columns, relationships, RLS summary, storage buckets, and maintenance commands, see:

- `docs/database/schema.md`

## SQL Files

- `events_external_metadata.sql`
  - Adds external-event metadata columns to `public.events`.
  - Adds the `event-images` storage bucket and public read policy.
  - Keeps `events.event_kind` constrained to `internal` or `external`.

- `event_interest.sql`
  - Adds Tally/WhatsApp action-link columns to `public.events`.
  - Creates `public.event_interest` for member-event interest tracking.
  - Adds idempotent indexes and RLS policies for interest reads/inserts/deletes.

- `link_redirect_assets.sql`
  - Adds board-managed display names and image references to `public.link_redirect_definitions`.
  - Adds hardcoded-vs-soft link status metadata.
  - Adds the private `link-redirect-images` storage bucket.

- `nft_requests.sql`
  - Creates/updates the Solana membership request, custody, lifecycle, and receipt schema.
  - Creates the private source-image and public rendered-asset buckets.

- `coffee_chats.sql`
  - Adds Coffee Chat profile columns to `members_main`.
  - Creates rounds, signups, pairings, board/special-access policies, and the atomic pairing function.
  - Creates the private `coffee-chat-selfies` bucket used by guarded server-side uploads.

## Environment Variables

Required for normal app operation:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Required for server-side admin operations and maintenance scripts:

```env
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

`SUPABASE_SERVICE_ROLE_KEY` is the canonical server key name. Some older code paths
also accept `SUPABASE_SERVICE_KEY` or `SERVICE_ROLE_KEY`, but new local and
deployment configuration should use `SUPABASE_SERVICE_ROLE_KEY`.

Do not commit `.env.local` or secret values.

## Auth Providers

The app sign-in screen only exposes Google OAuth. Keep Google enabled in Supabase Auth providers.

If email/password or magic-link login should be unavailable outside the UI too, disable the Email provider in the Supabase dashboard under Authentication providers. UI removal alone does not prevent direct API calls to enabled auth providers.

## Migration Workflow

For simple SQL changes:

1. Add or update a SQL file in this directory.
2. Apply it to Supabase through the SQL editor or a direct Postgres migration runner.
3. Update `docs/database/schema.md` if tables, columns, policies, functions, buckets, or operational behavior changed.
4. Run:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm test:coffee-chats
pnpm build
```

For external event CSV imports, use:

```bash
pnpm exec node scripts/import-external-events-csv.mjs --file=/absolute/path/events.csv --months-back=1
```
