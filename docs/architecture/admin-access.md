# Scoped administration

`/admin-access` is the sole role-management page. Only current Board Members can
open it or change assignments. Their rights in Coffee Chats, NFTs and Mail are
inherited from `members_main.Role`; they are not editable switches. Other active
members can receive each scope independently. Delegates cannot grant rights.
Normal Member View hides the entry and redirects away from this workspace.

## Authority and audit

`admin_assignments` is the single source for delegated scopes: `coffee_chats`,
`nfts`, `newsletter`. The database's existing feature-access functions delegate
to `check_email_has_admin_scope`. Newsletter API/RLS and its sidebar/page now use
the same effective permission. The general Special Access mechanism still serves
unrelated features, but is no longer an ongoing source of these three scopes.

The server checks the authenticated user and `can_manage_admin_access`. Changes
call `set_admin_access` using the user's session, never the service role. That
security-definer RPC independently checks the current Board Member role, locks
the actor/target rows, changes only the selected scope, and inserts an audit row
in the same transaction. Actor identifiers and timestamps are not client inputs.
Direct writes to assignments, audit and legacy views are revoked, including for
the service role. Board users can read all assignments and the audit; other
members can read only their own assignments. No-change requests produce no audit
noise. Inactive members can lose existing grants but cannot receive new ones.

The private `admin_access_audit` stores target member ID, scope, action, actor
member/auth IDs and time. It preserves IDs after membership deletion; the UI uses
a former-member label when the corresponding member is gone. Retention requires
an operator policy; the application does not silently delete audit history.

API authorization is checked on every operation. Existing open browser sessions
may need a reload to refresh sidebar visibility after another administrator
changes their rights; stale UI cannot bypass the API/database checks.

## Migration and rollout

Apply `supabase/admin_access.sql` after the legacy Coffee Chats, NFT and newsletter
setup scripts. Run it before deploying the central administration code.
It migrates existing explicit assignments and snapshots non-board Special Access
members' Coffee Chats/Mail privileges as explicit grants. Existing Board Members
retain automatic rights. Imported rows receive a `migrated` audit event.

The old `cc_admins` and `nft_admins` tables become read-only security-invoker views
of the central table. Existing operational access readers keep working; old role
editors cannot mutate these views. The old role API endpoints return 410 in the
new release, directing callers to Admin Access. Deploy the new UI in the same
release window as this migration: older deployments may still display retired
role controls. No email or NFT chain action is part of migration or testing.

The import only runs while legacy tables exist, so reapplying the migration never
regrants revoked permissions. Do not rerun legacy bootstrap files over the new
views; future role-schema changes must migrate the central model instead.

## Verification

- `pnpm test:admin-access`: server gate, payload validation and retired endpoints.
- `pnpm test:coffee-chats`: effective admin visibility and dashboard routing.
- `pnpm exec node tests/admin-access-database.mjs`: disposable PostgreSQL 17
  container with no network or published ports; checks migration preservation,
  RLS, role boundaries, audit, concurrent idempotence and repeatability.
- Browser checks use synthetic members and mocked API responses. They do not send
  campaigns, create real assignments or mutate membership records.

## Member list visibility

The default list includes active members, Board Members with automatic access, and anyone with an existing scoped assignment so access can still be revoked. Show inactive members reveals the remaining members; search respects this filter. Board scopes display Automatic instead of disabled switches. Inactive rows explain that existing grants can be removed but new grants require active membership. This is a presentation filter; API and database permission rules are unchanged.
