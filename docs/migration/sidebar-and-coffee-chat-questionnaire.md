# Sidebar navigation and Coffee Chat questionnaire

The dashboard uses the shadcn Radix Sidebar within the persistent `(dashboard)`
layout. Feature content continues to use the existing route map and dashboard
controller. Administrative navigation remains derived from the controller's
permission flags; hiding navigation does not replace server authorization.

The sidebar replaces the horizontal dashboard navigation. It collapses on
desktop and opens as a sheet on mobile. Account actions remain part of the
shared shell. Existing dark theme tokens and feature layouts are retained.

Navigation is grouped into Platform and Administration using `SidebarGroup`.
Grouping does not grant or remove access: each entry retains its existing
visibility rules. Sidebar surfaces use neutral selection tones, and panel
dividers explicitly use `border-sidebar-border` rather than the default text
color. Header, menu, and account spacing share the same collapsed/mobile shell.

Coffee Chat matching preferences are the platform's multi-step questionnaire.
The questionnaire collects the existing matching profile fields and saves them
through the existing member update path. At least one interest is required;
other details and pairing exclusions remain optional. Round signup remains a
separate action on the current-round page.

The Radix questionnaire wrapper uses the official `@shadcn/react/questionnaire`
primitive. Its optional unanswered steps use the primitive's skip action:
"Continue" advances past optional profile details, and "Save preferences"
submits an empty exclusion step. Both populated and empty exclusion selections
reach the same form submission handler. Profile values remain controlled by
the feature, including selections hidden by the member search.

The components come from the official shadcn Radix registry and use the
project's existing `radix-nova` configuration and UI primitives. This change
does not require a primitive-library migration or a database migration.

## Review and verification

Run the regular checks:

```sh
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

The isolated browser suite uses synthetic Coffee Chat demo data:

```sh
pnpm exec playwright test --config=playwright.demo.config.ts
```

`NEXT_PUBLIC_COFFEE_CHATS_DEMO=true` is only for isolated demos. It must never
be enabled on the production deployment. Demo saves are simulated and do not
verify persistence against Supabase. Authenticated production testing remains
governed by the existing protected production E2E workflow.
