# Local Performance Benchmarking

## Local Auth Bypass

Use the local-only bypass when performance profiling needs a reproducible member session without going through Supabase Auth:

```bash
DEV_AUTH_BYPASS=true
DEV_AUTH_BYPASS_MEMBER_ID=0
DEV_AUTH_BYPASS_SPECIAL_ACCESS=false
```

The bypass is accepted only for `localhost` and `127.0.0.1`. It loads `members_main.id = DEV_AUTH_BYPASS_MEMBER_ID` as the current member. If a service role key is available, the server-side admin client is used for local bypass data loading; otherwise the normal server Supabase client is used.

## Measuring

Recommended local passes:

1. Start the app in production mode for stable measurements:

```bash
pnpm build
pnpm start
```

2. Open `/members` with:

```bash
NEXT_PUBLIC_LOG_WEB_VITALS=true
NEXT_PUBLIC_MEMBERS_PERF_PROBE=true
NEXT_PUBLIC_MEMBERS_OVERSCAN=6
NEXT_PUBLIC_DASHBOARD_BACKGROUND_ANIMATION=false
PERF_LOG_SERVER=true
```

3. Watch the browser console for `[web-vitals]` and `[members-perf]` entries. This reports Next.js Web Vitals, Long Tasks, resource timings, mounted virtual rows/member cards, and scroll frame drops.

4. Watch the server terminal for `[dashboard-perf]` entries. This separates auth, member lookup, route data loading, member count, approximate JSON payload size, and approximate picture payload size.

5. Run the lightweight server benchmark against a running app:

```bash
BENCH_URL=http://127.0.0.1:3000/members BENCH_ITERATIONS=8 pnpm bench:members:server
```

6. Run the browser benchmark against a running app:

```bash
BENCH_URL=http://127.0.0.1:3000/members BENCH_TRACE=true pnpm bench:members:browser
```

The browser benchmark loads `/members?perf=1`, waits for network idle, scrolls the directory, records Chrome DevTools Protocol performance metrics, captures `[members-perf]` console entries, and writes JSON plus a Playwright trace under `reports/performance/`.

7. Record a manual Chrome DevTools Performance trace while loading and scrolling `/members` when visual flamecharts are needed. Use the Performance panel to inspect CPU activity, main-thread scripting, rendering, painting, and frame rate.

## CPU Suspects

- The global grid background is static by default. Continuous full-viewport background animation previously made idle CPU/GPU diagnosis noisy.
- Member avatars should now start loading for mounted overscan rows, but large `Picture` payloads can still inflate server payload and hydration cost.
- `backdrop-blur`, large shadows, and full-card gradients can add paint/compositing cost on scroll.
- Keep `NEXT_PUBLIC_MEMBERS_OVERSCAN` modest. High values can mount most of the directory and turn virtualization back into a large DOM problem.
- Avoid broad manual avatar preloading. The browser benchmark showed 108 image resources after scrolling while only 22-28 member cards were mounted.

## Fixed CPU Regression

The confirmed `/members` CPU regression was client-side. Server benchmarks were healthy, but browser traces showed too much resource work while scrolling. The root fix was to remove the manual avatar preloader and make full-viewport background animation opt-in.

When reproducing similar issues, compare:

- Number of mounted cards vs. number of image resources.
- Idle CPU with and without background animation.
- Scroll task time after changing overscan.

## Repeatable CI Benchmark

For repeatable budgets, add a browser benchmark tool rather than relying on feel:

- Lighthouse/Lighthouse CI for page-load metrics and performance budgets.
- Playwright traces for scripted flows such as opening `/members`, scrolling to Alumni, and opening Edit Profile.

Playwright is installed for the local browser benchmark. Lighthouse CI is not installed yet.

## Playwright On Ubuntu 26.04

Playwright 1.60 does not officially map Ubuntu 26.04 yet. Install Chromium with the Ubuntu 24.04 fallback:

```bash
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 pnpm exec playwright install chromium
PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 pnpm exec playwright install-deps chromium
```

The browser benchmark script sets the same host-platform override before importing Playwright.
