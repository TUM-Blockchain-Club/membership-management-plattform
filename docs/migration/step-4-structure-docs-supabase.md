# Step 4: Structure, Docs, and Supabase Consistency

## Goal

Improve repository structure, documentation, and Supabase consistency after the UI migration has stable primitives.

## Scope

- Decide final structure for domain components, likely:
  - `components/ui`
  - `features/dashboard`
  - `features/members`
  - `features/nft-requests`
  - `lib/supabase/client.ts`
  - `lib/supabase/server.ts`
- Split `useDashboardController` into smaller hooks where useful.
- Supabase docs now have a current baseline in `docs/database/schema.md`; keep them updated as schema changes land.
- Regenerate Supabase database types or document how to regenerate them.
- Centralize NFT admin authorization IDs or move them fully into Supabase.
- Add or remove missing routes referenced by UI:
  - `/signup`
  - `/terms`
  - `/privacy`
- Fix build-time environment assumptions in API routes.

## Acceptance Criteria

- README explains local setup, env vars, scripts, Supabase, and deployment.
- Supabase setup docs match current code, with `docs/database/schema.md` as the canonical schema overview.
- Authorization constants are not duplicated inconsistently.
- Production build works with documented env setup.
- `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build` pass.
