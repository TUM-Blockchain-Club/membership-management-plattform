# Members Grid Loading And Dropdown

## Context

The `/members` route can feel uneven while loading because it combines server data loading, client hydration, grid rendering, image decoding, and filter/sort work on the same user-visible path.

## Resolution

The CPU/scroll lag was fixed by removing two browser-side pressure sources:

1. **Broad manual avatar preloading.** The virtualized grid only mounted about 22-28 member cards, but the benchmark still observed 108 image resources after scrolling. That meant we were preserving a small DOM while still forcing the browser to start nearly every avatar request. The manual `new Image()` preloader was removed; avatars now load only for mounted virtual rows.
2. **Continuous full-viewport background work.** The global grid pattern/glow and `background-attachment: fixed` made the page harder to keep idle. The dashboard background is now static by default, and animation is opt-in through `NEXT_PUBLIC_DASHBOARD_BACKGROUND_ANIMATION=true`.

This is the important lesson for future changes: **do not compensate for virtualization with broad preloading.** If the grid is virtualized, resource loading should be virtualized too.

Relevant best-practice threads checked for this change:

- Next.js App Router loading states and Suspense should keep the route shell responsive while slow data resolves.
- Next.js/Vercel performance guidance recommends avoiding request waterfalls, reducing serialized client props, and dynamically importing heavy UI that is not immediately needed.
- Large member grids should keep the rendered DOM small through virtualization/windowing.

## Changes

- The member editor modal is dynamically imported from `DashboardFrame`, so the closed edit form and its selects/autocomplete are not part of the first interactive bundle for `/members`.
- Member directory filtering now filters, sorts, and buckets sections in one memoized pass instead of repeatedly scanning the same member list.
- Member card avatar images use lazy async decoding to reduce main-thread image work during the first grid render.
- Virtualized member cards pass `imageLoading="eager"` only for mounted rows. Broad manual avatar preloading was removed because it can flood the browser with image work while scrolling.
- Full-viewport grid/glow animation and `background-attachment: fixed` were removed from the default page background.
- The virtualized list renders an SSR/client-stable spacer until hydration. `useWindowVirtualizer` depends on browser viewport measurements, so rendering its measured total height during SSR caused hydration mismatches.
- Member filter updates run inside a React transition so select changes do not have to block urgent UI updates.
- The member editor dialog no longer raises itself above normal overlay stacking. This lets shadcn/Radix select portals render above the dialog instead of behind its semi-transparent surface.
- Select popovers in the members page and profile editor use an explicit popover background and border for an opaque dropdown surface.
- `next.config.ts` now keeps `allowedDevOrigins` inside the typed Next config instead of mixing ESM and CommonJS exports.
- Local performance diagnostics are documented in `docs/maintenance/local-performance-benchmarking.md`.

## Remaining Performance Suspects

- `MEMBER_COLUMNS` still includes `Picture` for every member loaded by `/members`. If this column contains large byte arrays instead of compact URLs, the route will serialize a lot of data from the server component boundary into the client. The sustainable fix would be to split member list rows from full editable member profiles, then fetch full profile details only when the editor opens.
- The route currently fetches all members before rendering the members view. For very large datasets, pagination or server-side search/filtering would reduce both database payload and client work.
- Blurred card styling adds paint cost. Virtualization reduces the number of cards in the DOM, but low-end devices can still feel backdrop/blur work.
- If scrolling still catches unloaded images, tune `NEXT_PUBLIC_MEMBERS_OVERSCAN` cautiously. Do not reintroduce broad manual image preloading without measuring browser resource pressure.

## Guardrails

- Keep `NEXT_PUBLIC_MEMBERS_OVERSCAN` modest. Increasing it mounts more cards and can erase the benefit of virtualization.
- Do not add route-wide avatar preloading. Prefer browser-native lazy/eager behavior on the mounted images.
- Keep background animation opt-in. If re-enabled, benchmark idle CPU and scroll CPU before shipping.
- Do not remove the hydration spacer from `MembersVirtualList` unless the replacement guarantees identical server and first-client markup.

## Verification Notes

- The shadcn CLI docs command could not be completed in the sandbox because it needs network access to `ui.shadcn.com`; the escalated command was rejected because `shadcn@latest` would download and execute unpinned npm code.
