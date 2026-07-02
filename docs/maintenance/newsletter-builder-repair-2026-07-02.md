# Newsletter Builder Repair

Date: 2026-07-02

Scope: PR 23 newsletter builder cleanup.

## What Changed

- Reworked `/newsletter` into one shadcn-based dashboard workspace instead of a custom toolbar plus many small custom modal components.
- Removed the unused Mailgun delivery-status route and client state.
- Restored newsletter tab visibility to `showNewsletterTab` and added a direct-route redirect for unauthorized `/newsletter` access.
- Made `newsletter_projects` a shared special-access workspace. `created_by` is kept as audit metadata; special-access users can update/delete shared campaigns.
- Added `newsletter_projects` to the local Supabase type map and documented the table in `docs/database/schema.md`.

- Apply `supabase/newsletter_projects.sql` before deploying the newsletter builder.
- Local newsletter API bypass requires `DEV_AUTH_BYPASS=true`, `DEV_AUTH_BYPASS_SPECIAL_ACCESS=true`, a localhost request, and `SUPABASE_SERVICE_ROLE_KEY`.

Run before handoff:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```
