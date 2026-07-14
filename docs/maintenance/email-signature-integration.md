# Native Gmail signature integration

## Purpose

The dashboard exposes AMBER's signature workflow as the `Email Signature`
header tab at `/email-signature`. Members can edit profile-derived signature
details, preview the result, authorize Gmail, and install the signature without
leaving the membership platform.

The standalone Apps Script deployment remains available during rollout. The
native workflow does not call or embed it.

## Request flow

1. The form is prefilled from the authenticated member's `members_main` row.
2. On submit, the validated form is held in browser `sessionStorage` while the
   existing Supabase Google OAuth flow requests
   `https://www.googleapis.com/auth/gmail.settings.basic`.
3. The auth callback keeps the fresh Google provider token in an HttpOnly,
   path-restricted cookie for at most five minutes.
4. `/api/email-signature` authenticates the Supabase user, checks that a member
   profile exists, and requires a Gmail send-as address matching the user's
   platform email.
5. The route renders escaped signature HTML, updates that exact Gmail send-as
   address, and immediately deletes the provider-token cookie.

Google access tokens and refresh tokens are not written to Supabase or any
application table. Signature form data is removed from `sessionStorage` after a
successful update.

## Google Cloud setup

Use the Google OAuth client already configured under Supabase Authentication →
Providers → Google. In the Google Cloud project that owns that client:

1. Enable the Gmail API.
2. Keep the OAuth consent app internal to `tum-blockchain.com`.
3. Add the Gmail settings scope
   `https://www.googleapis.com/auth/gmail.settings.basic` to the consent
   configuration.
4. Keep the existing Supabase OAuth callback URI. No additional client secret,
   redirect URI, or application environment variable is required by this
   feature.

Google controls granular-consent checkboxes. Applications cannot preselect
them. A member must approve the scope the first time; later requests can reuse
the grant through incremental authorization.

## Maintenance

- The signature renderer and trust-boundary validation live in
  `lib/email-signature/signature.ts`.
- Gmail API access lives in `lib/email-signature/gmail.ts` and must remain
  server-only.
- Keep the matching send-as check. Never fall back to the primary or first Gmail
  alias because the authorized Google account must match the platform account.
- The legal and board text is currently the same static content as the AMBER
  template. Update it in the renderer when club representation changes.
- Run `pnpm test:email-signature` after changing validation or rendered markup.
