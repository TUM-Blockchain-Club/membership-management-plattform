# Repository Instructions

- Use `pnpm` for all Node.js commands.
- Keep migration and implementation notes in Markdown under `docs/`, especially `docs/migration/` for shadcn migration work.
- Prefer sustainable component structure over one-off compatibility fallbacks. If a fallback seems necessary, document the tradeoff before implementing it.
- For shadcn work, use the project components under `components/ui/` and keep feature-level composition near the route or tab that owns it.
- Run `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build` before handing off UI migration steps.
- Do not commit `.env.local` or other local secret files.
- For local performance profiling, use the server-only `DEV_AUTH_BYPASS=true` with `DEV_AUTH_BYPASS_MEMBER_ID=<members_main.id>`. It is guarded to localhost/127.0.0.1.
- Use `NEXT_PUBLIC_LOG_WEB_VITALS=true`, `NEXT_PUBLIC_MEMBERS_PERF_PROBE=true`, and `PERF_LOG_SERVER=true` for local `/members` profiling. Use `NEXT_PUBLIC_DASHBOARD_BACKGROUND_ANIMATION=false` when isolating idle CPU/paint cost from dashboard background animations.
- Keep `NEXT_PUBLIC_MEMBERS_OVERSCAN` modest; high values can negate virtualization and broad manual image preloading can flood the browser with avatar requests.
- Do not reintroduce route-wide member avatar preloading on `/members`; the fixed CPU regression came from loading far more avatar resources than mounted virtualized cards.
- Events are split into `internal` and `external` rows via `events.event_kind`. Apply `supabase/events_external_metadata.sql` before deploying event UI changes that select external-event metadata columns.
- Link redirect analytics are sourced from `link_redirect_definitions` and `link_redirect_clicks`. Keep the `/link-analytics` page board-only server-side and do not send raw click rows to the client. Apply `supabase/link_redirect_assets.sql` before deploying changes that select link display labels, hardcoded/soft status fields, or uploaded link images. Link images live in the private `link-redirect-images` bucket and should be served through the guarded app API, not as public storage URLs.
- Newsletter campaigns use GrapesJS in the guarded `/newsletter` dashboard tab, Mailgun server-side API routes, `newsletter_projects`, `newsletter_deliveries`, `newsletter_delivery_events`, and the public `newsletter-assets` Supabase Storage bucket. Apply `supabase/newsletter_projects.sql` before deploying newsletter UI/API changes. The active Mailgun domain is `mg.tum-blockchain.com` with `MAILGUN_REGION=eu`; do not use `newsletter.tum-blockchain.com` as the Mailgun API domain.
- `docs/database/schema.md` is the canonical database schema overview. Update it when changing Supabase tables, columns, policies, functions, storage buckets, or import workflows.
