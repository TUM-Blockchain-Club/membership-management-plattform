# Audit: Event Approvals & QR Attendance — Pre-Implementation Recon

Read-only audit performed on `main` at commit `2d39f98` (2026-07-02). No code, schema, or files were modified as part of this audit.

---

## 1. Project & stack orientation

**Stack**: Next.js 16 (App Router) + React 19 + TypeScript, Tailwind v4, shadcn/radix-ui components, Supabase (`@supabase/ssr` + `@supabase/supabase-js`), package manager `pnpm` (there's a stray untracked `package-lock.json` from npm — the project standard is `pnpm-lock.yaml`, see `AGENTS.md:3`).

**Folder structure**:

- `app/(dashboard)/` — the route-group that actually serves dashboard URLs: `events/page.tsx`, `profile/page.tsx`, `members/page.tsx`, `statistics/page.tsx`, `nft-approvals/page.tsx`, `nft-status/page.tsx`, `link-analytics/`. `app/(dashboard)/layout.tsx` calls `loadDashboardInitialData('all')` (server-side) and passes it into `DashboardShell`.
- `app/dashboard/` (no parens) — shared client-side dashboard machinery consumed by the routes above: `DashboardContext.tsx`, `DashboardFrame.tsx`, `useDashboardController.tsx`, and per-tab implementations under `app/dashboard/tabs/*` (e.g. `tabs/events/EventsPage.tsx`, `tabs/profile/ProfilePage.tsx`, `tabs/attendance/*` — the last one only exists on the `feature/attendance-tracking` branch, see §4). `app/dashboard/page.tsx` is just `redirect('/profile')`.
- `app/api/` — Next.js Route Handlers, e.g. `app/api/events/route.ts`, `app/api/events/[eventId]/route.ts`, `app/api/events/[eventId]/interest/route.ts`, `app/api/nft-requests/*`.
- `app/components/dashboard/` — shared dashboard UI (`EventCard.tsx`, `MemberCard.tsx`, etc.) and `types.ts` for dashboard-wide TS types.
- `components/ui/` — shadcn primitives only.
- `lib/` — client-callable data-access modules (`lib/events.ts`, `lib/members.ts`, `lib/auth.ts`), plus `lib/server/*` for server-only/service-role logic (`eventAdmin.ts`, `supabaseAdmin.ts`, `nftRequestAdmin.ts`, etc.).

**Supabase wiring**:
- Browser client: `lib/supabase.ts` — `createBrowserClient` from `@supabase/ssr`, using `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Exported as `supabase` and used directly by client components/hooks (e.g. `useDashboardEvents.ts` calls `supabase.from('event_registrations').insert(...)` directly from the browser).
- Server client: `lib/supabase/server.ts` — `createServerClient` from `@supabase/ssr`, cookie-based, used inside Server Components and Route Handlers via `createSupabaseServerClient()`.
- Service-role/admin client: `lib/server/supabaseAdmin.ts` (`getSupabaseAdminClient()`), used to bypass RLS for privileged server-side writes (see `lib/server/eventAdmin.ts`).
- **`supabase/` directory exists but contains no Supabase-CLI migrations** — no `supabase/config.toml`, no `supabase/migrations/`. It's four hand-authored, idempotent SQL scripts applied manually:
  - `supabase/events_external_metadata.sql`
  - `supabase/event_interest.sql`
  - `supabase/link_redirect_assets.sql`
  - `supabase/nft_requests.sql`
- The canonical schema description lives in `docs/database/schema.md` (hand-maintained, "last inspected against the live Supabase project: 2026-05-26" — i.e. it documents live DB state that may not be fully backed by a committed SQL file, see §6 and the Open Questions section).

---

## 2. Roles / permissions

**Table/column**: `public.members_main.Role` (text, nullable). Values observed in code/docs: `Board Member`, `Core Member`, `Ex-Core Member`, `Guest`. There is also `public.members_main.Status` (separate axis: `Active`, `Passive`, `Left`, `Kicked out`, plus UI-referenced `Honorary`, `Alumni`, `Advisor`).

There is **no boolean `is_board` column and no separate `roles`/`permissions` table** — role is a single free-text column on `members_main`.

**Two distinct authorization mechanisms exist side by side:**

1. **Role string check** — `Role === 'Board Member'`, done client-side / in server components by comparing the resolved member row's `Role`. Example: `app/dashboard/tabs/profile/ProfilePage.tsx:257` (`isBoardMember={member?.Role === 'Board Member'}`), `avatarRingClass()`/`roleBadgeClass()` in the same file (lines 25–46). Also used in `app/dashboard/useDashboardController.tsx` (`effectiveIsBoardMember`) and `app/dashboard/lib/memberUtils.ts`.
2. **`has_special_access()` RPC** — a Postgres function called via `supabase.rpc('has_special_access')` (server) or `supabase.rpc('check_email_has_special_access', { check_email })` (client, in `useDashboardController.tsx:103`). This is a **separate, DB-side special-access allowlist**, not simply `Role = 'Board Member'` — per `docs/database/schema.md:298`, "Special-access emails are currently encoded in DB policies and app-side admin checks." `lib/server/eventAdmin.ts:16-38` (`requireEventAdmin`) gates all event-admin write routes (`app/api/events/route.ts`, `app/api/events/[eventId]/route.ts`, `app/api/events/[eventId]/image/route.ts`) on `has_special_access()`, **not** on `Role`.

There's also a hardcoded NFT-admin allowlist by member ID: `NFT_ADMIN_MEMBER_IDS = new Set([0, 99, 107, 26, 126])` in `app/dashboard/lib/loadDashboardInitialData.ts:51` — a third, independent authorization path, separate from both `Role` and `has_special_access()`.

**RLS policies keyed on role** (per `docs/database/schema.md`, §"Row Level Security And Policies" — no committed SQL in this repo defines these; they exist only in the live DB, see Open Questions):
- `members_main`: authenticated users can read all; users can update their own row (matched via `"TBC Email"` = auth email); **board members can insert members**; **board members can update members in matching departments**; special-access emails can insert/update all.
- `events`: publicly readable; **board members can update via RLS**; event admin API routes additionally re-check `has_special_access()` server-side and use the service-role client.
- `event_registrations`: publicly readable; authenticated users can insert; authenticated users can delete their own rows.
- `attendance` (existing, event-keyed — see §4): insertable by the checked-in member, viewable by the owner, viewable by board members.

The one role-keyed RLS policy whose exact SQL exists in this repo is in `supabase/lectures.sql` on the **unmerged** `feature/attendance-tracking` branch (see §4), e.g.:

```sql
create policy "board can insert lectures"
on public.lectures
for insert to authenticated
with check (
  exists (
    select 1 from public.members_main m
    where lower(coalesce(m."TBC Email", '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and m."Role" = 'Board Member'
  )
);
```

This pattern (join `members_main` on lower-cased email match against `auth.jwt() ->> 'email'`, check `Role = 'Board Member'`) is the only concrete precedent in the repo for a role-gated RLS policy, and is a reasonable template for a Feature-1 approvals policy.

---

## 3. Events & registration (Feature 1 groundwork)

### `public.events`

Exact columns per `docs/database/schema.md` (cross-checked against `lib/events.ts` and `app/dashboard/lib/loadDashboardInitialData.ts`):

`id` (bigint PK), `created_at`, `title`, `description`, `start_at`, `end_at`, `location`, `organizer_department`, `capacity_total` (integer), `check_in_token` (uuid, default `gen_random_uuid()`), `check_in_enabled` (boolean, default `false`), `event_kind` (`internal`|`external`, checked), `event_type`, `priority`, `external_status`, `city`, `format`, `is_hackathon`, `attending_names` (text[]), `all_day`, `image_url`, `event_link_url`, `tally_url`, `whatsapp_url`.

**Note**: `check_in_token`/`check_in_enabled` are documented as live columns but there is no committed SQL adding them anywhere on `main`, and the `feature/attendance-tracking` branch actively **drops** them (see §4) — treat their live existence as unconfirmed/stale without checking the actual DB.

### `public.event_registrations`

Exact columns (from `docs/database/schema.md` + `lib/events.ts` types): `id` (bigint PK), `created_at`, `event_id` (bigint, FK → `events.id`), `member_id` (bigint, FK → `members_main.id`). **No `status` column exists today.**

### Registration code path today

Client-side, direct Supabase call — no API route involved:

- `app/dashboard/tabs/events/useDashboardEvents.ts:44-71`, `handleEventRegistration(eventId, isCurrentlyRegistered)`:
  - If already registered: `supabase.from('event_registrations').delete().eq('event_id', eventId).eq('member_id', member.id)`.
  - Else: `supabase.from('event_registrations').insert({ event_id: eventId, member_id: member.id })`.
  - Then calls `loadEvents(member.id)` → `eventService.getUpcomingEvents()` (`lib/events.ts:94`) to refresh `is_registered`/`current_registrations`.

This write happens directly from the browser using the anon-key client and relies entirely on RLS (`event_registrations`: authenticated insert/delete-own, per §2) — there is **no server-side gate today** on internal event registration; capacity is only enforced by RLS/UI, not a service-role check.

### Where event access is gated

- **Read access**: `events` table is publicly readable (RLS); the UI (`EventsPage.tsx`, `EventCard.tsx`) computes `is_registered`/`current_registrations`/capacity display client-side from `getUpcomingEvents()`.
- **Write access (create/update/delete events, images)**: gated server-side by `requireEventAdmin()` in `lib/server/eventAdmin.ts`, called from `app/api/events/route.ts` (POST), `app/api/events/[eventId]/route.ts` (PATCH/DELETE), `app/api/events/[eventId]/image/route.ts`. This checks `has_special_access()`, not `Role`.
- **Registration writes** ("does a member get into an event"): currently ungated beyond RLS `insert`/`delete own`, executed directly from the client (see above). **This is exactly where an approval check needs to be inserted** — either by moving registration off the direct client call and into a new API route that checks event-level "requires approval" + sets `status = 'pending'`, or by adding an `event_registrations.status` column + RLS/trigger logic.

### Prior art already exists for Feature 1 — `origin/feature/event-approvals`

A branch already implements a rough version of this. It was branched from `main` at `b3d0a66` (2026-05-27) and has **not** been rebased onto current `main` (which has since moved to `2d39f98`, 2026-06-22) and is **not merged**. One commit: `9860e02 feat(events): add pending/approval workflow for event registrations`.

What it adds (diff vs `main`, 7 files, +126/-19, **no SQL migration included**):
- `app/api/events/[eventId]/registrations/pending/route.ts` (new) — `GET`, board/admin-only (`requireEventAdmin`), selects `event_registrations` `.eq('status', 'pending')`.
- `app/api/events/[eventId]/registrations/[memberId]/review/route.ts` (new) — `POST`, board/admin-only, accepts `{ status: 'approved' | 'rejected' }`, updates the registration row with `reviewed_at`/`reviewed_by` via the service-role client.
- `lib/events.ts` — adds `status?: string | null` to the registration row type, adds `Event.toBeApproved`/`to_be_approved` fields, filters `getUpcomingEvents()`/`getEventParticipants()` to only count `status === 'approved'` (or `undefined`, treated as legacy-approved) as "registered", adds `is_pending`.
- `app/dashboard/tabs/events/useDashboardEvents.ts` — `handleEventRegistration` gains a `requiresApproval?: boolean` param; when set, inserts with `status: 'pending'` and shows a "submitted — waiting for approval" toast.
- `app/dashboard/lib/loadDashboardInitialData.ts` — mirrors the same pending/approved split for the SSR-loaded initial event list.
- `app/components/dashboard/EventCard.tsx` — button label becomes "Pending" when `isPending`.

**Gap**: this branch assumes `event_registrations.status` and `events.to_be_approved`/`toBeApproved` columns already exist — it ships **no SQL** to create them, no RLS updates for the new `status` values, and no migration for `reviewed_at`/`reviewed_by`. It is UI/API scaffolding only, written against a schema that doesn't exist yet on `main` or (as far as this repo shows) anywhere. Treat it as a design reference / partially-done starting point, not a mergeable feature.

There's also a local+remote branch `feature/event-registrations` (`14af4d0`), but `git merge-base --is-ancestor` confirms **it is already merged into `main`** — it's just old history (adds the original events/registration feature itself), not new unmerged work. No action needed there.

---

## 4. Meetings & attendance (Feature 2 groundwork) — **critical finding**

**A substantial, mostly-complete QR check-in feature already exists on `origin/feature/attendance-tracking`.** It is unmerged and stale (branched from `main` at `5335dcc`, 2026-05-21; last commit `37b75de`, 2026-06-24 — i.e. it was updated *after* the current tip of `main`, but never merged back).

```
git log origin/feature/attendance-tracking --oneline   (relative to main)
  37b75de Potential fix for pull request finding 'CodeQL / Creating biased random numbers from a cryptographically secure source'
  469dda9 Implement dynamic qr code for attendance tracking
  ab5a4ee Allow members change own profile picture

git diff main...origin/feature/attendance-tracking --stat
  34 files changed, 2841 insertions(+), 4 deletions(-)
```

Key files it adds:
- `supabase/lectures.sql` — full schema (see below).
- `lib/server/attendanceAuth.ts` — `requireAttendanceMember()` / `requireBoardMember()`, resolves the current Supabase auth user to a `members_main` row via `TBC Email` and checks `Role === 'Board Member'`.
- `lib/server/lectureCodes.ts` — code generation/validity helpers: 6-char codes from a confusable-character-free alphabet, rotated every 15s (`CODE_ROTATION_MS`), valid for 30s (`CODE_VALIDITY_MS`), lecture considered "active" for 3 hours after `started_at` (`LECTURE_ACTIVE_WINDOW_MS`).
- `app/api/lectures/route.ts`, `app/api/lectures/[id]/route.ts`, `app/api/lectures/[id]/start/route.ts`, `app/api/lectures/[id]/stop/route.ts`, `app/api/lectures/[id]/rotate-code/route.ts` — board-only lecture CRUD + lifecycle.
- `app/api/attendance/check-in/route.ts` — member-facing check-in: parses a `"<lectureId>:<code>"` token, validates the lecture is active and the code (current or previous, within validity window) matches, then `insert`s into `attendance` (unique constraint absorbs double-scans as `alreadyCheckedIn: true`).
- `app/api/attendance/my/route.ts` — member's own attendance history + `totalLectures` count.
- `app/api/attendance/by-member/route.ts` — board-only, attendance history for an arbitrary member.
- `app/api/attendance/overview/route.ts` — board-only aggregate view (not inspected in full, but present).
- `app/attendance/check-in/page.tsx`, `app/attendance/loading.tsx`, `app/attendance/page.tsx` — member-facing scan/check-in UI, standalone from the dashboard route group.
- `app/dashboard/tabs/attendance/*` — board-facing management UI: `AttendancePage.tsx` (470 lines), `LectureEditor.tsx`, `LectureQrDisplay.tsx` (renders the rotating QR), `AttendanceCalendar.tsx`, `useAttendance.ts`, `calendarUtils.ts`.
- `app/dashboard/tabs/AttendanceTab.tsx`, `app/dashboard/routes/AttendanceDashboardRoute.tsx`, plus wiring into `DashboardFrame`, `useDashboardController.tsx`, `dashboard/lib/routes.ts`.
- `package.json` adds `qrcode` + `@types/qrcode` (these two packages are **already present on `main` today** — but for an unrelated reason, see below).

### Schema this branch introduces (`supabase/lectures.sql`)

The branch's own top-of-file comment is explicit: *"Replaces the earlier events-based attendance prototype. Lectures are a separate entity from events."* It:

1. **Tears down** an events-keyed attendance prototype: `drop table if exists public.attendance cascade`, drops `events.check_in_token` / `events.check_in_enabled`, drops the associated RLS policies and the `event-qr-codes` storage bucket policies. **This is exactly the schema currently documented in `docs/database/schema.md` §"`public.attendance`"** (id uuid PK, `member_id`, `event_id` FK → `events.id`, `checked_in_at`, unique `(member_id, event_id)`) — i.e. `docs/database/schema.md` documents a prototype that this branch deliberately deletes.
2. **Creates `public.lectures`**: `id` (uuid PK), `title`, `kind` (`core`|`side`, checked), `scheduled_at`, `location`, `lecturer_member_id` (FK → `members_main.id`, `on delete set null`), `is_active` (bool), `started_at`, `current_code`/`current_code_at`, `previous_code`/`previous_code_at`, `created_at`, `updated_at` (+ trigger to bump it). RLS: authenticated read-all; board-only insert/update/delete (role check pattern quoted in §2).
3. **Re-creates `public.attendance`, now keyed on `lecture_id` instead of `event_id`**: `id` (uuid PK), `member_id` (int, FK → `members_main.id`, cascade), `lecture_id` (uuid, FK → `lectures.id`, cascade), `checked_in_at`, unique `(member_id, lecture_id)`. RLS: member sees own rows (`member_id = current_member_id()`), board sees all, member can insert own row (the check-in path).

**This means "meetings" in this app's vocabulary are called "lectures"**, and they are modeled as a first-class entity independent of `events` — not a special kind of event. If you want attendance tied to `events` rows instead (e.g. for non-lecture event check-in), that's a real design fork from what's already built, not just a naming difference.

### How the QR feature could extend rather than duplicate

- If "meetings" ≈ "lectures" (recurring internal sessions, board-run, needing check-in), **this branch is very close to what Feature 2 needs** — rebase it onto current `main`, resolve conflicts (main has moved on `package.json`, `DashboardFrame`, `useDashboardController.tsx`, `dashboard/lib/routes.ts`, `loadDashboardInitialData.ts` since the branch's fork point), and pick up review comments from the CodeQL fix commit (`37b75de`) which already addresses one flagged security finding (non-cryptographic RNG for code generation — worth double-checking `randomInt` from `crypto` is what actually shipped, which it is per `lib/server/lectureCodes.ts`).
- If instead Feature 2 needs to attach attendance to *events* (the existing `events` table, e.g. for check-in at conference-style `event_kind = 'internal'` events, distinct from recurring lectures), then neither the stale `docs/database/schema.md` prototype nor the `lectures` branch is a direct fit — the `lectures` branch explicitly deletes the events-keyed version. In that case, coordinate schema naming/keys carefully so you don't reintroduce a third, parallel attendance table on top of what this branch already tore down once.
- Either way: **do not build a new `attendance` table without first deciding whether to build on `lectures.sql` from this branch.** Recommend rebasing/reviewing `origin/feature/attendance-tracking` before writing any new attendance SQL.

### The `qrcode` package on `main` is unrelated

`package.json` on `main` already lists `qrcode`/`@types/qrcode`, which could look like leftover attendance work — it isn't. It was added for the **Link Analytics QR preview** feature (`app/dashboard/tabs/link-analytics/LinkAnalyticsDashboard.tsx:6,303`, `QRCode.toCanvas(...)` rendering a QR for redirect links, per the recent commit `5708780 Render QR preview from offscreen export`). No attendance code currently references it on `main`.

---

## 5. Profile page

- Route: `app/(dashboard)/profile/page.tsx` — a thin client component (`'use client'`) that reads `DashboardContext` (`app/dashboard/DashboardContext.tsx`) via `use()` and renders `app/dashboard/tabs/profile/ProfilePage.tsx` with props pulled from the shared dashboard controller (`viewedMember`, `member`, `hasSpecialAccess`, `canEditField`, etc.).
- Data fetching is **not** done in the profile page itself. It's fetched once, server-side, in `app/(dashboard)/layout.tsx` → `loadDashboardInitialData('all')` (`app/dashboard/lib/loadDashboardInitialData.ts`), which runs on every dashboard navigation load and populates `DashboardShell` → `useDashboardController` → `DashboardContext`. The profile page just reads from that already-hydrated context; it does not issue its own Supabase query.
- Implication for attendance display: adding an "attendance" section to the profile page means either (a) fetching attendance client-side inside `ProfilePage.tsx` / a new hook (pattern used by `feature/attendance-tracking`'s `app/api/attendance/my/route.ts`, called from the client), or (b) extending `loadDashboardInitialData.ts` to include attendance summary data server-side alongside members/events, following the existing "load everything upfront in the layout" pattern. The existing attendance branch takes approach (a) — a dedicated `/api/attendance/my` route fetched client-side — rather than folding it into the SSR initial-data load.

---

## 6. Branch & migration state

- **Current branch**: `main`, in sync with `origin/main` at `2d39f98`. Working tree clean except one untracked `package-lock.json` (npm artifact; project standard is pnpm — see `pnpm-lock.yaml`/`pnpm-workspace.yaml`).
- **Local branches present** (in addition to `main`): `design/minor-tweaks`, `feature/event-approvals`, `feature/event-registrations` — the latter two are local checkouts of the remote branches discussed in §3/§4.
- **Migrations are applied manually**, not via Supabase CLI: no `supabase/config.toml`, no `supabase/migrations/` directory. Per `supabase/README.md` §"Migration Workflow": add/update a `.sql` file under `supabase/`, apply it through the Supabase SQL editor or a direct Postgres connection, then update `docs/database/schema.md`. `AGENTS.md` reinforces this (`Apply supabase/events_external_metadata.sql before deploying...`, `docs/database/schema.md` is canonical and must be updated on schema changes).
- Practical consequence for handoff: **schema changes should be delivered as a new idempotent `.sql` file under `supabase/`** (`create table if not exists`, `drop policy if exists` + recreate, per the existing style in `event_interest.sql` and the unmerged `lectures.sql`), plus a `docs/database/schema.md` update — there is no automated migration runner to wire into.
- `docs/database/schema.md` is stated as last inspected 2026-05-26, i.e. **11 branch-days before `main`'s current tip and before the CodeQL fix on `feature/attendance-tracking`.** Its `public.attendance` section describes the prototype the `lectures.sql` branch tears down — treat it as historical, not current-state-guaranteed, until re-verified against the live DB.

---

## Open questions / risks

1. **Attendance schema decision is the single biggest fork in the road.** Confirm with whoever owns product intent: is Feature 2 "QR check-in for recurring lectures" (matches `feature/attendance-tracking`'s `lectures` table almost exactly) or "QR check-in for `events` rows" (would need a new design since that branch actively deletes the events-keyed version)? This determines whether you rebase/finish the existing branch or design fresh.
2. **`docs/database/schema.md` may not reflect the live DB.** It documents `events.check_in_token`/`check_in_enabled` and an events-keyed `attendance` table with no corresponding SQL file in `main`'s `supabase/` directory — meaning these were either applied by hand directly against Supabase and never committed, or the doc is stale/aspirational. Verify directly against the live Supabase project (via the dashboard or a read-only query) before assuming either table/column exists, and before assuming it's safe to drop them the way `lectures.sql` does.
3. **`feature/event-approvals` ships no migration.** Its API routes assume `event_registrations.status` and `events.to_be_approved`/`toBeApproved` columns exist; they don't, anywhere in this repo. Any approvals work needs new SQL for these (plus RLS updates — currently registrations are freely insertable/deletable by any authenticated user, which will need to change once `status` gates "getting in").
4. **Both relevant branches are stale relative to `main`** (`event-approvals` diverged 2026-05-27; `attendance-tracking` diverged 2026-05-21, though its own commits run through 2026-06-24). Expect conflicts in `package.json`, `app/dashboard/useDashboardController.tsx`, `app/dashboard/lib/loadDashboardInitialData.ts`, and dashboard routing/tab wiring files if rebasing either onto current `main`.
5. **Three separate, inconsistent authorization mechanisms exist**: `members_main.Role === 'Board Member'` (string compare, client- and server-side), `has_special_access()` / `check_email_has_special_access()` (DB-side allowlist RPC, used for event-admin writes and link analytics), and a hardcoded `NFT_ADMIN_MEMBER_IDS` set. Decide up front which one(s) gate event-approval review and QR/lecture management, and whether to consolidate — mixing three models across two new features will make future permission audits harder.
6. **Registration writes happen directly from the browser client today** (`useDashboardEvents.ts`), with no server-side capacity/approval check — RLS is the only gate. If approvals need to be enforced server-side (not just RLS), this write path likely needs to move behind an API route (as `feature/event-approvals`'s review endpoints already do for the board side, but not for the member-side insert).
7. Confirm whether the stray untracked `package-lock.json` in the working tree is intentional (npm lockfile in a pnpm project) — unrelated to these two features but worth flagging since it's sitting in the tree during this audit.
