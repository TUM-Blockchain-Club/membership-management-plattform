# Dashboard loading and region

Vercel Functions run in `dub1` (Dublin), configured in `vercel.json` alongside the existing cron. This places application execution near the Supabase database in AWS `eu-west-1`. Vercel Hobby supports one selectable function region; multiple regions require a higher plan. Existing deployments retain their region until redeployed with this configuration. CDN ingress and routing middleware location can differ from function execution.

Reference: https://vercel.com/docs/functions/configuring-functions/region

## Request and navigation boundaries

- The persistent dashboard layout loads only the current member and navigation permissions. It no longer serializes the whole directory or event history into every initial page.
- `getRequestMember`, the server Supabase client, and `getSupabaseUser` use React request-scoped caching. Home and Coffee Chats share the identity/member read with the layout. These are not process-wide caches and never share authenticated data between users. Middleware and separate HTTP/API requests still perform their own authentication.
- The current member's Special Access result is reused for their profile. Five independent navigation permission checks run concurrently, preserving their existing database authority.
- Home queries only the next two non-ended events and does not load event registrations or interest rosters. Its event summary runs concurrently with the Coffee Chat summary.
- Members, Statistics and Attendance load the directory on demand. Events loads its full listing on demand. `/api/dashboard/data` verifies the current user/member, permits only these two named resources, and uses the user-scoped Supabase client/RLS. The existing localhost-only profiling bypass remains available.
- Loaded collections belong to the mounted dashboard shell and are reused across tabs. Mutations update these collections. Leaving the shell discards them. Failed requests show an explicit retry action; leaving a loading tab aborts its request. Profile edits before directory loading do not mark an empty directory as loaded.
- Sidebar destinations use Next.js Links composed with Radix SidebarMenuButton. Next.js performs its default route prefetching; dynamic routes can prefetch the layout/loading boundary without eagerly fetching every collection. Mobile navigation closes the drawer; modified clicks retain native link behavior.

## Verification

`pnpm test:dashboard` checks resource validation, authentication, user-scoped reads, private response caching, no eager collections in the shell, reuse of Special Access and the bounded Home query. Existing lint, type checks, build and full test suite remain required.

Browser checks should cover Home → Members → Events → Members, direct entry to collection routes, failed loads/retry, and a persistent sidebar without document reloads. Performance conclusions require authenticated navigation timing on the deployed preview; local bypass tests validate behavior but do not measure production authentication latency.

The Home and NFT status collectible responds to mouse movement across the page.
Tilt is measured from the card center, bounded to 6°/8°, and applied through CSS
variables in one scheduled animation frame per pointer update. It does not cause
React rerenders or run a continuous JS animation loop. Hidden/offscreen cards
reset, and reduced-motion and touch users do not receive page-driven tilt.
The personal draft keeps its existing direct-hover interaction.
