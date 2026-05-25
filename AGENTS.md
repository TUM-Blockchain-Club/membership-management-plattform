# Repository Instructions

- Use `pnpm` for all Node.js commands.
- Keep migration and implementation notes in Markdown under `docs/`, especially `docs/migration/` for shadcn migration work.
- Prefer sustainable component structure over one-off compatibility fallbacks. If a fallback seems necessary, document the tradeoff before implementing it.
- For shadcn work, use the project components under `components/ui/` and keep feature-level composition near the route or tab that owns it.
- Run `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build` before handing off UI migration steps.
- Do not commit `.env.local` or other local secret files.
- For local performance profiling, prefer the server-only `DEV_AUTH_BYPASS=true` with `DEV_AUTH_BYPASS_MEMBER_ID=<members_main.id>` over public auth bypass flags. It is guarded to localhost/127.0.0.1.
- Use `NEXT_PUBLIC_LOG_WEB_VITALS=true`, `NEXT_PUBLIC_MEMBERS_PERF_PROBE=true`, and `PERF_LOG_SERVER=true` for local `/members` profiling. Use `NEXT_PUBLIC_DASHBOARD_BACKGROUND_ANIMATION=false` when isolating idle CPU/paint cost from dashboard background animations.
- Keep `NEXT_PUBLIC_MEMBERS_OVERSCAN` modest; high values can negate virtualization and broad manual image preloading can flood the browser with avatar requests.
- Do not reintroduce route-wide member avatar preloading on `/members`; the fixed CPU regression came from loading far more avatar resources than mounted virtualized cards.
