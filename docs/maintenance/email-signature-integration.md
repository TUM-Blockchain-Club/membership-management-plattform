# Native Gmail signature integration

## Purpose

The dashboard exposes AMBER's signature workflow as the `Email Signature`
item in the sidebar's Platform group at `/email-signature`, visible to every
member. Members can edit profile-derived signature
details, preview the result, authorize Gmail, and install the signature without
leaving the membership platform.

The standalone Apps Script deployment remains available during rollout. The
native workflow does not call or embed it.

## Request flow

1. The member connects Gmail before editing the form. The existing Supabase
   Google OAuth flow requests
   `https://www.googleapis.com/auth/gmail.settings.basic`.
2. The auth callback asks Google's tokeninfo endpoint (token in the POST body)
   which scopes the fresh provider token carries. If Google answers and
   `gmail.settings.basic` is missing, the callback stores no token and redirects
   to `/email-signature?gmail=missing_scope`, where the page asks the member to
   authorize again and tick the Gmail settings checkbox. Otherwise it keeps the
   token in an HttpOnly cookie restricted to `/api/email-signature` for at most
   five minutes.
3. After the redirect, the form is prefilled from the authenticated member's
   `members_main` row and unlocked. No form fields are persisted across OAuth.
4. `/api/email-signature` authenticates the Supabase user, checks that a member
   profile exists, and requires a Gmail send-as address matching the user's
   platform email.
5. The route renders escaped signature HTML, updates that exact Gmail send-as
   address, and immediately deletes the provider-token cookie.

Google access tokens and refresh tokens are not written to Supabase or any
application table. Signature form data remains only in React state on the
current page.

LinkedIn and mobile number are optional. The renderer omits the LinkedIn link
and icon or the complete mobile row when the corresponding field is empty.

## Google Cloud setup

Use the Google OAuth client already configured under Supabase Authentication →
Providers → Google: "TBC Membership Platform – Supabase" in the Google Cloud
project `tbc-membership-oauth-2026` (audience Internal). In that project:

1. Enable the Gmail API.
2. Keep the OAuth consent app internal to `tum-blockchain.com`.
3. Add the Gmail settings scope
   `https://www.googleapis.com/auth/gmail.settings.basic` to the consent
   configuration.
4. Keep the existing Supabase OAuth callback URI. No additional client secret,
   redirect URI, or application environment variable is required by this
   feature.

5. In the Workspace Admin console (Security → Access and data control → API
   controls → App Access Control), configure that client ID as Trusted for the
   top-level organizational unit. Trust is per client ID; AMBER's Apps Script
   client being trusted does not cover this one.

Google controls granular-consent checkboxes. Applications cannot preselect
them. A member must approve the scope the first time; later requests can reuse
the grant through incremental authorization. Because the request always
includes the sign-in scopes (`openid`, `email`, `profile`), the Gmail checkbox
is optional on Google's consent screen. AMBER avoided this by requesting only
`gmail.settings.basic`; the platform cannot, so it checks the grant in the
callback instead.

Tradeoff: when tokeninfo cannot be reached or returns an error, the callback
treats the grant as unknown and still stores the token. The Gmail call in
`/api/email-signature` then reports a missing or expired grant itself, so the
member never sees a false "missing permission" message caused by a Google
outage.

## Troubleshooting

Gmail failures are logged server-side as `Gmail settings request failed` with
the step, HTTP status, classified kind and Google's reason codes (never the
token). The member sees a message per kind:

- `api_disabled` (`SERVICE_DISABLED` / `accessNotConfigured`): the Gmail API is
  off in the Google Cloud project that owns the OAuth client Supabase uses.
  Reauthorizing cannot fix it; enable the Gmail API in that project.
- `insufficient_scope`: the token lacks `gmail.settings.basic`.
- `unauthenticated`: the token expired or was revoked.

To see which OAuth client Supabase really sends, read the `client_id` from
`curl -s -o /dev/null -w '%{redirect_url}' 'https://<project-ref>.supabase.co/auth/v1/authorize?provider=google'`.
Production uses the Internal client "TBC Membership Platform – Supabase"
(`339852176226-923l…`) in `tbc-membership-oauth-2026`. Because the consent app
is Internal, only `tum-blockchain.com` Google accounts can sign in.

Until 2026-11-26 Supabase sent `1028219151396-i0a3…` ("Membership"), a
third-party, unverified client outside `tum-blockchain.com`. Requesting the
Gmail scope with it failed with "has not completed the Google verification
process" and later `admin_policy_enforced`, so Supabase's Google provider was
switched to the Internal client. Its Workspace Admin trust rule can be removed.
If `admin_policy_enforced` reappears, check that the client ID Supabase sends is
Trusted under API controls → Manage Third-Party App Access.

## Maintenance

- The signature renderer and trust-boundary validation live in
  `lib/email-signature/signature.ts`.
- Gmail API access and the tokeninfo scope check live in
  `lib/email-signature/gmail.ts` and must remain server-only. The pure
  tokeninfo parsing in `lib/email-signature/scopes.ts` and Gmail error
  classification in `lib/email-signature/gmailErrors.ts` are shared with tests.
- Keep the matching send-as check. Never fall back to the primary or first Gmail
  alias because the authorized Google account must match the platform account.
- The legal and board text is currently the same static content as the AMBER
  template. Update it in the renderer when club representation changes.
- Run `pnpm test:email-signature` after changing validation, rendered markup or
  the scope check. `pnpm test` also runs this file through
  `playwright.unit.config.ts`.

## History

- 2026-07-14: PR #27 opened by Nikolas Hack.
- 2026-11-26: rebased onto main. The tab moved from the removed
  `DashboardHeader` to `DashboardSidebar`, the callback adopted main's
  `safeAuthRedirect`, `test:email-signature` now uses the unit Playwright config,
  and the callback-time scope check was added after AMBER's July 2026 granular
  consent failures. Supabase's Google provider was switched from the
  third-party "Membership" client to the Internal client, and the Gmail
  signature flow was verified on the preview.
