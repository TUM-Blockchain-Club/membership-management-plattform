# Coffee Chats production integration

The production integration is based on `Prod` at `8feb7bd`, with the Coffee
Chats implementation from `feature/coffee-chats` at `cf21aca`. It does not
merge `main` or the feature branch's inherited history into production.

## Included changes

- Coffee Chats routes, dashboard integration, matching, delegated administration,
  Mailgun notifications, private selfie storage, demo mode, and existing tests.
- Environment documentation (`a816f68`), Plausible tracking (`2d39f98`), and
  two-week member-picture caching (`1143b7c`).
- shadcn tooling (`ee3082e`) and dashboard control standardization (`326479a`),
  excluding the latter's Attendance changes. Shared date controls retain the
  subsequent Coffee Chats fixes.
- Dependency and lint fixes from `5ec27d2`. Next.js and Sharp are locked to
  16.3.1 and 0.35.3. The lockfile combines these updates with the Coffee Chats
  UI dependencies; the Attendance-only `jsqr` dependency is absent.

## Deliberate exclusions

Attendance/lecture routes, APIs, navigation, SQL, QR scanning, and their follow-up
fixes are excluded, including `13c1543`, which only fixes Attendance effects.
The profile-upload controller change from `1432b80` and the NFT preview-client
change from `aad53b0` are also excluded. Existing production Newsletter behavior
is retained, with the selected shared-control UI changes.

Shared dashboard files contain only the Coffee Chats additions and selected
UI changes. The original profile-upload controller behavior is preserved.
The database migration is copied unchanged from the selected feature tip.

## Validation and deployment requirements

Run `pnpm install --frozen-lockfile --no-optimistic-repeat-install`, `pnpm test`,
`pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build` for this combined tree.

The existing production NFT preview route initializes its Supabase client at
module load. A build therefore needs syntactically valid Supabase URL/key
values even when it does not access a database. Local build checks can use
loopback URLs and non-secret placeholder keys; those checks do not establish
that production credentials or services work.

Before deployment, verify the target database prerequisites and apply
`supabase/coffee_chats.sql` as described in `coffee-chats-integration.md`.
Run `tests/coffee-chats-db.sql` against the target test database and follow the
protected production E2E procedure in `coffee-chats-production-e2e.md`.
Verify Mailgun configuration and leave `NEXT_PUBLIC_COFFEE_CHATS_DEMO=false`
in production. Demo browser checks exercise fake data and do not validate
Supabase authorization, email delivery, or actual selfie storage.
