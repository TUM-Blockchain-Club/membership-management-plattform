# Coffee Chats integration

Coffee Chats is a native authenticated section under `/coffee-chats`. Members
maintain a small matching profile, join the current monthly round, view their
pair or trio, and log the meeting. Board members and explicit special-access
users manage rounds and trigger matching from `/coffee-chats/admin`.

## Data and authorization

- Apply `supabase/coffee_chats.sql` before deploying the routes.
- The migration adds the `members_main.cc_*` profile columns and creates
  `cc_rounds`, `cc_signups`, and `cc_pairs`.
- Only one round can be open at a time. Pair creation and the transition to
  `paired` happen in one locked database transaction through
  `commit_coffee_chat_pairing`.
- Member signup and pair reads remain protected by RLS. Administrative actions
  accept board members and existing explicit special-access users.

## Selfies

`coffee-chat-selfies` is private. `/api/coffee-chats/log-meeting` verifies that
the current member belongs to the pair, accepts only valid JPEG, PNG, or WebP
content up to 5 MB, and uploads with the service-role client. Match and gallery
responses expose one-hour signed URLs rather than permanent public URLs.

Google Drive backup remains optional through `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
`GOOGLE_PRIVATE_KEY`, and `GOOGLE_DRIVE_FOLDER_ID`.

## Verification

```bash
pnpm test:coffee-chats
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

The database transaction check is in `tests/coffee-chats-db.sql` and must run
against the target Supabase database inside its built-in rollback transaction.
