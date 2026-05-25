# Step 1: shadcn Foundation and Primitive Components

## Goal

Initialize shadcn/ui for this Next.js App Router project and install the primitive components needed for later UI migrations.

## Scope

- Add `components.json`.
- Add shadcn utility setup, including `cn()`.
- Extend Tailwind v4 theme tokens in `app/globals.css` so semantic classes such as `bg-card`, `border-border`, `text-muted-foreground`, and `bg-destructive` are defined.
- Install the base shadcn primitives used by the current dashboard:
  - `button`
  - `card`
  - `dialog`
  - `alert`
  - `select`
  - `input`
  - `textarea`
  - `checkbox`
  - `badge`
  - `skeleton`
  - `tabs`
  - `separator`
  - `avatar`
  - `tooltip`
  - `dropdown-menu`
  - `sonner`
- Verify lint, TypeScript, and production build.

## Non-Goals

- Do not rewrite feature screens yet.
- Do not change NFT status page behavior.
- Do not restructure folders beyond what shadcn needs.
- Do not change Supabase access logic in this step.

## Acceptance Criteria

- `pnpm lint` passes.
- `pnpm exec tsc --noEmit` passes.
- `pnpm build` passes with `.env.local`.
- The app has installed shadcn primitive source files under `components/ui`.
- Existing screens continue to compile before visual migration.

## Notes for Next Step

Read `docs/migration/step-2-primitive-replacements.md` before replacing raw UI primitives in feature files.
