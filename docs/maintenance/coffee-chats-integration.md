# Coffee Chats integration

Coffee Chats is a native authenticated dashboard tab under `/coffee-chats`.
Its routes live in the `(dashboard)` route group so the shared dashboard header,
navigation, account controls, background, and footer remain mounted. Do not add
a second Coffee Chats application shell or a standalone "Back to Dashboard"
control.

The default route is a state-aware current-round experience. It derives one
next action from matching-preference completion, signup state, the open round,
and the latest outstanding match. The old `/coffee-chats/join` and
`/coffee-chats/my-match` URLs redirect to this default route for compatibility.
Preferences, gallery, and authorized admin tools are secondary routes.

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
  can add or remove delegated administrators from the member directory.

## Admin pairing and replacements

`Auto-suggest Pairs` requests a read-only preview from the guarded pairing API.
The preview uses saved acquaintance exclusions and previous partners, just like
the automatic pairing run. It does not save pairings or send emails. Admins may
edit the draft before confirming it; a failed preview leaves the draft intact.
Exclusions remain preferences under the existing algorithm: when no compatible
partner is available, it may fall back to an excluded pairing.

Completed (`met`) meetings cannot have participants replaced. The API checks
status both when reading the pair and in the conditional update, so a completion
between those operations also blocks replacement. Existing meeting data and
selfies are preserved. Replacement may still assign a member who is in another
pair in the same round; this is an intentional administrative choice.

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
