# Board tool permissions

Event administration accepts board members and special-access users in both the
dashboard and the server API, using the trusted member row rather than editable
authentication metadata.

NFT administration uses `canManageNftRequests` from `lib/member-permissions.ts` in
both dashboard initialization and every guarded NFT administration API route.
Board members and special-access users are accepted, and existing explicit NFT
administrators retain access. NFT data and storage operations already run through
the server-only service-role client after this authorization check. No database
migration or additional direct database grants are required.

The dashboard exposes one effective board-tool permission. Attendance controls,
member creation, event editing, and event participant controls consume it instead
of deriving privileges from the raw member role. Normal Member View disables
these controls, alongside the existing newsletter, analytics and NFT visibility
rules. It previews the member interface; it does not revoke the user's real
server permissions.

`tests/board-permissions.test.ts` renders the actual routes and exercises the
actual event/NFT API guards with mocked authentication and database I/O. It covers
board access without special access, ordinary and unauthenticated users, special
access, legacy NFT administrators, access-check failures, and member-view mode.
Tests do not create events, review requests, or execute blockchain transactions.
