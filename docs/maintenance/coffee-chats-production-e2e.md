# Coffee Chats production E2E

Coffee Chats browser tests run against a deployed application connected to the
production Supabase project. They are intentionally excluded from pull-request
CI and can only be started through the `Coffee Chats production E2E` manual
workflow.

## Test seams

- Playwright uses the public `/coffee-chats` browser interface.
- Supabase Auth, RLS, and Postgres remain real production adapters.
- Production Storage remains configured but is not mutated by the automated scenarios.
- Mailgun is not triggered by the current browser scenarios.
- The suite never creates, pairs, closes, or deletes production rounds.

The member scenario changes one interest on a dedicated test member, verifies
that it survives a page reload, and restores the original selection in a
`finally` block. The account must start with at least one interest. The admin
scenario is read-only.

## GitHub environment

Create a protected GitHub environment named `production-e2e`, require a manual
reviewer, and configure these environment secrets:

```text
E2E_SUPABASE_URL
E2E_SUPABASE_ANON_KEY
E2E_DATABASE_URL
E2E_MEMBER_EMAIL
E2E_MEMBER_PASSWORD
E2E_ADMIN_EMAIL
E2E_ADMIN_PASSWORD
```

Use dedicated member and board/admin test accounts. Password sign-in must be
available for those accounts, and each auth email must match its `members_main`
`TBC Email`. Seed the member with at least one interest and give the admin
account Board Member or explicit Coffee Chat admin access. Do not reuse
personal credentials.

The workflow runs `tests/coffee-chats-db.sql` through `E2E_DATABASE_URL`. The
script validates pairing inside a transaction and always rolls it back. Normal
production readers never observe its temporary rows.

## Running

1. Deploy the commit to be tested.
2. Start `Coffee Chats production E2E` from GitHub Actions.
3. Enter that deployment URL and type `PRODUCTION`.
4. Approve the protected environment run.

For local execution, set the same values without committing them and run:

```bash
pnpm test:e2e:prod
```
