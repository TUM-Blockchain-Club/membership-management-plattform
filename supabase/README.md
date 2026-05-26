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

- `nft_requests.sql`
  - Creates/updates `public.nft_requests`.
  - Adds NFT request helper functions, indexes, policies, and storage policies.

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

Do not commit `.env.local` or secret values.

## Migration Workflow

For simple SQL changes:

1. Add or update a SQL file in this directory.
2. Apply it to Supabase through the SQL editor or a direct Postgres migration runner.
3. Update `docs/database/schema.md` if tables, columns, policies, functions, buckets, or operational behavior changed.
4. Run:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

For external event CSV imports, use:

```bash
pnpm exec node scripts/import-external-events-csv.mjs --file=/absolute/path/events.csv --months-back=1
```
