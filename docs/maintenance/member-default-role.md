# Default membership role

Apply `supabase/members_default_role.sql` to set the database and auth-provisioning default to `Core Member`. The migration changes existing case-insensitive Guest and empty roles only; it does not change status, department, Board Member or Ex-Core Member assignments.

The auth trigger now uses the column default, preserving explicit existing roles when an auth identity links to a pre-existing membership record. This does not change the allowed email domain or authentication provider.

The legacy protected-field trigger now runs as security invoker and permits trusted database roles to perform provisioning/migrations. Under security definer, a current-user bypass would incorrectly authorize every caller. Authenticated members still cannot promote themselves or alter the legacy protected fields.

Verify in an isolated container with `pnpm exec node tests/member-default-role-database.mjs`. The test covers signup, defaults, existing account linking, role/status preservation, self-promotion denial and repeat application. It uses no production data or exposed ports and removes the container afterward.
