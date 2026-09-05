# Env Example Refresh - 2026-06-11

## Summary

Refreshed `.env.example` against the current environment variable usage in app code,
API routes, maintenance scripts, and benchmark scripts.

## Changes

- Added `SUPABASE_SERVICE_ROLE_KEY` because server-side admin clients, NFT preview
  routes, uploads, and CSV maintenance scripts need it.
- Added `DATABASE_URL` to match the documented direct Postgres/migration tooling
  setup, even though the Next.js app itself does not read it directly.
- Added benchmark variables used by `scripts/bench-members-server.mjs` and
  `scripts/bench-members-browser.mjs`.
- Added NFT minting variables used by `lib/server/nftMinting.ts`.
- Documented that contract variables can also be loaded from `../contracts/.env`
  during local development via `lib/server/contractEnv.ts`.

## Notes For Future Agents

- Keep `SUPABASE_SERVICE_ROLE_KEY` as the canonical service-role env name. Legacy
  aliases are still accepted by some code paths, but should not be expanded in new
  docs unless the code is intentionally migrated.
- If new `process.env` reads are added, update `.env.example` in the same change.
