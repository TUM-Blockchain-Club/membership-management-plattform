# Newsletter Builder Repair

Date: 2026-07-02

Scope: PR 23 newsletter builder cleanup.

## What Changed

- Reworked `/newsletter` into one shadcn-based dashboard workspace instead of a custom toolbar plus many small custom modal components.
- Reintroduced the useful PR feature cores without the old modal-heavy UI: reusable newsletter assets and persisted Mailgun delivery tracking.
- Restored newsletter tab visibility to `showNewsletterTab` and added a direct-route redirect for unauthorized `/newsletter` access.
- Made `newsletter_projects` a shared special-access workspace. `created_by` is kept as audit metadata; special-access users can update/delete shared campaigns.
- Added `newsletter_projects`, `newsletter_deliveries`, and `newsletter_delivery_events` to the local Supabase type map and documented the tables in `docs/database/schema.md`.
- Added the public `newsletter-assets` bucket with special-access write policies. The asset API only accepts JPG, PNG, GIF, and WebP files up to 5 MB under the `images/` prefix.
- Newsletter manager access now includes all members with `Role = 'Board Member'` plus explicit special-access users via `check_email_can_manage_newsletter(check_email text)`.
- Mailgun sends now write a delivery row after a successful API response. The delivery-status route can list recent sends and refresh events for a specific Mailgun message id.
- Newsletter API response handling accepts plain-text upstream errors, including Mailgun `Forbidden` responses, so the UI surfaces the real error instead of failing with a JSON parse message.
- The OAuth callback now writes Supabase session cookies onto the returned redirect response, which keeps server API routes authenticated on preview domains.
- Newsletter client requests also send the current Supabase access token as a Bearer header. Server routes validate that token with Supabase before applying the same newsletter-manager access check, which covers preview deployments where SSR cookies are unavailable or stale.
- Newsletter workspace controls are grouped around the editor: Templates, Assets, and Projects above it; Send and Delivery Tracking below it. The editor intentionally uses the full content width with a bounded responsive height.

- Apply `supabase/newsletter_projects.sql` before deploying the newsletter builder.
- Local newsletter API bypass requires `DEV_AUTH_BYPASS=true`, `DEV_AUTH_BYPASS_SPECIAL_ACCESS=true`, a localhost request, and `SUPABASE_SERVICE_ROLE_KEY`.

Run before handoff:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```
