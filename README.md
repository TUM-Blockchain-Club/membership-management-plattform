# Membership Management Platform

Next.js dashboard for TUM Blockchain Club membership operations.

## Stack

- Next.js App Router
- React
- TypeScript
- pnpm
- shadcn/ui components in `components/ui`
- Supabase Auth, Postgres, and Storage

## Local Setup

Install dependencies:

```bash
pnpm install
```

Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

Use `.env.example` as the complete local template. It also lists optional auth bypass,
performance profiling, benchmark, and NFT minting variables.

Run the dev server:

```bash
pnpm dev
```

Open `http://localhost:3000`.

The root route redirects authenticated users to `/dashboard` and unauthenticated users to `/signin`.

## Common Commands

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

## Database

The current Supabase schema is documented in:

- `docs/database/schema.md`

Supabase SQL scripts live in:

- `supabase/events_external_metadata.sql`
- `supabase/event_interest.sql`
- `supabase/nft_requests.sql`

Supabase operational notes live in:

- `supabase/README.md`

## External Event Imports

Use the reusable CSV importer:

```bash
pnpm exec node scripts/import-external-events-csv.mjs --file=/absolute/path/events.csv --months-back=1
```

The Events page defaults to future events plus events from the last seven days. The `Past Events` toggle reveals older stored events.

## Documentation

- `docs/database/schema.md`: canonical database schema overview.
- `docs/maintenance/`: implementation and maintenance notes.
- `docs/migration/`: shadcn/UI migration planning notes.
- `AGENTS.md`: repo-specific instructions for future coding agents.
