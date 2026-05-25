# Repository Instructions

- Use `pnpm` for all Node.js commands.
- Keep migration and implementation notes in Markdown under `docs/`, especially `docs/migration/` for shadcn migration work.
- Prefer sustainable component structure over one-off compatibility fallbacks. If a fallback seems necessary, document the tradeoff before implementing it.
- For shadcn work, use the project components under `components/ui/` and keep feature-level composition near the route or tab that owns it.
- Run `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build` before handing off UI migration steps.
- Do not commit `.env.local` or other local secret files.
