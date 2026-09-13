# Event grants

Event cards show interest actions above a separate grant action. `events.grant_url` selects the application mode: an external HTTP(S) form opens in a new tab, otherwise a member submits one internal application. Members can withdraw an internal application. Event registration links (`tally_url`) keep their existing purpose and are not repurposed as grant forms.

`/event-grants` and its administration API require Board membership or the central `grants` role. The sidebar hides this area in Normal Member View. Only Board Members can delegate the role through Admin Access. Applicants can read their own application state; they cannot access other applicants or an aggregate applicant count. RLS independently enforces these boundaries for direct Supabase access.

The new migration extends the existing central scope constraints/functions and creates the grant table. Apply `supabase/event_grants.sql` after `supabase/admin_access.sql`, before deploying code that selects `grant_url`. Do not rerun the older admin bootstrap migration over the extended scope model. Reapplying the grant migration preserves applications and assignments.

No external form webhook is configured: opening a form is not proof of submission. Applications submitted there remain in the external provider. This first version is an application register, not an approval or payment workflow.

Verification: `node tests/admin-access-database.mjs` runs disposable PostgreSQL tests for applicant privacy, ownership, closed events, external links, delegated admin reads and revocation. `pnpm test` includes safe-link and existing authorization tests.
