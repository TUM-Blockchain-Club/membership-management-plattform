# Attendance QR check-in

Board members start a lecture. The database issues a 48-bit random QR secret,
shared by all open admin displays. Row locking serializes issuance: repeated
start/rotation calls reuse the current code until 15 seconds have elapsed.
The previous code remains valid until 30 seconds after its original issuance.
Start is idempotent while the lecture is active; stop closes check-in immediately.

Members scan within Attendance or use their phone camera. Google OAuth preserves
the local check-in return URL. If login takes longer than the QR validity window,
the member must scan a fresh code; an expired URL never extends authorization.

`attendance_check_in` obtains the member identity from the session, locks the
lecture against simultaneous stop/rotation, validates the three-hour window and
code, and inserts once. Direct member inserts are denied. Calendar access excludes
secret columns; board-only issuance returns the QR through the guarded RPC route.
QR sharing within the validity window remains possible; this proves possession of
a short-lived code, not physical location.

The display fetches immediately on mount and resumes after visibility/network
changes. Failed requests retry after three seconds. Server-relative timestamps
control expiry despite client clock skew; expired QR images are hidden.

## Migration and verification

For an existing lectures installation apply `supabase/attendance_secure_check_in.sql`
before deploying this code. This transaction is repeatable and preserves records.
Never rerun `supabase/lectures.sql` on a populated installation: it is a legacy
conversion that deletes the former attendance table.

- `pnpm test`: token and safe login redirect regressions, plus the existing suite.
- `pnpm exec node tests/attendance-database.mjs`: isolated PostgreSQL integration
  tests for permissions, check-in, expiry, duplicate scans and concurrent displays.
  Requires local PostgreSQL server binaries (`PG_BIN` can override their directory),
  or `PG_TEST_DOCKER=true` to use an isolated `postgres:17` Docker container.
- Browser verification should cover two displays, interrupted network, expiry,
  return from a hidden tab, and a fresh scan after OAuth expiry.
