# Coffee Chats integration

Coffee Chats is a native authenticated dashboard tab under `/coffee-chats`.
Its routes live in the `(dashboard)` route group so the shared dashboard sidebar,
account controls, background, and footer remain mounted. Do not add
a second Coffee Chats application shell or a standalone "Back to Dashboard"
control.

The default route is a state-aware current-round experience. It derives one
next action from matching-preference completion, signup state, the open round,
and the latest outstanding match. The old `/coffee-chats/join` and
`/coffee-chats/my-match` URLs redirect to this default route for compatibility.
Preferences and gallery remain in the member page navigation. Authorized admin
tools at `/coffee-chats/admin` have a separate Coffee Chats Admin entry in the
sidebar Administration group, their own active tab and heading, and no member
subnavigation. Visibility uses the existing effective Coffee Chat admin permission
and respects Normal Member View; entering that view returns admins to the member
route. Route changes use the shared dashboard router and keep its shell mounted.

The preferences page contains meeting-place recommendations and a searchable
checklist of every member except the signed-in member for `cc_already_know`.
Those member IDs are treated as pairing exclusions whenever another complete
matching is available.

At least one interest is required before saving and joining. Three to five are
recommended in the UI. Other profile details and acquaintance exclusions are
optional and progressively disclosed.

## Data and authorization

- Apply `supabase/coffee_chats.sql` before deploying the routes.
- The migration adds the `members_main.cc_*` profile columns and creates
  `cc_admins`, `cc_rounds`, `cc_signups`, and `cc_pairs`.
- Only one round can be open at a time. Pair creation and the transition to
  `paired` happen in one locked database transaction through
  `commit_coffee_chat_pairing`.
- Admin deadline inputs are interpreted in the administrator's browser timezone
  and converted to UTC ISO timestamps before they are written to Supabase.
- Member signup and pair reads remain protected by RLS. Administrative actions
  accept board members and delegated Coffee Chats administrators. Board members
  manage delegated rights through the central `/admin-access` page. The
  `cc_admins` relation is a read-only view of the `coffee_chats` scope in
  `admin_assignments`; the Coffee Chats workspace has no role editor.

## Selfies

`coffee-chat-selfies` is private. `/api/coffee-chats/log-meeting` verifies that
the current member belongs to the pair, accepts only valid JPEG, PNG, or WebP
content up to 5 MB, and uploads with the service-role client. The route requires
an explicit `complete-meeting` or `upload-selfie` intent. Uploading a selfie to
an already completed meeting never changes pair status or sign-off fields.
Match and gallery responses expose one-hour signed URLs rather than permanent
public URLs. Supabase Storage is the only selfie storage provider.

## Verification

```bash
pnpm test
pnpm test:coffee-chats
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

The database transaction check is in `tests/coffee-chats-db.sql` and must run
against the target Supabase database inside its built-in rollback transaction.
The protected production browser workflow is documented in
`docs/maintenance/coffee-chats-production-e2e.md`.

## Round administration details

Round rows open a Radix dialog with signup names, departments and signup times.
A visible “View round” button supports keyboard access; the whole row also
responds to pointer clicks. Pairing and confirmed deletion live inside the
round detail flow rather than the overview table.

`GET /api/coffee-chats/rounds/[roundId]` and `PATCH` require authenticated board
or delegated Coffee Chat administrator access before using the admin client.
The response includes only participant fields needed by this view and is not
cached. Deadline edits accept UTC timestamps or null, validate ordering and
update only the two existing deadline fields. The UI shows local dates and
times and preserves untouched timestamps. Reading a round never runs pairing
or modifies signups. No database migration is required.

Home and the match view show partner avatars (with initials when absent), names
and departments. Home also shows the meeting deadline. Partner image URLs use
the same legacy-picture decoding as member cards. An unfinished match no longer
hides a later signup round: a separate notice links Home to the signup action on
Coffee Chats while retaining the current match. The notice distinguishes joined,
open and deadline-passed rounds; joining still uses the existing authenticated
signup endpoint and profile requirements. Two partners are supported for triples.
