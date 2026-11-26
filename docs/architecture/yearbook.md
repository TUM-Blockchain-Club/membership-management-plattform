# Yearbook

A digital version of a school yearbook: members opt in, write messages about
each other, add photos, and the board exports everything for print.

## Member flow (`/yearbook`)

1. **Selector.** While an edition is open, a member first chooses "Yes, include
   me" or "Not this time". Only "yes" is stored (`yb_participants`); "not this
   time" saves nothing, so the member can still join later.
2. **Write messages.** Participants see every club member (except `Left` and
   `Kicked out`) with search and filters (in the yearbook, not written yet,
   written). Each author has one message per member, up to 600 characters with
   one optional photo, and can edit or delete it while the edition is open.
   Members who have not joined can still be written about; the dialog says the
   message is only printed if they join.
3. **My page.** Participants set an optional yearbook photo (falls back to the
   profile picture) and a quote (≤ 200 characters), with a preview. Leaving
   removes the page and portrait; written messages stay saved but are excluded
   from print until the member rejoins.
4. **About me.** Participants read messages written about them, so they can
   flag problems before print. Messages from non-participants are marked
   "Not printed".

After the deadline (`closes_at`) or when an admin closes the edition, everything
is read-only.

## Admin flow (`/yearbook/admin`)

Board members and members with the `yearbook` scope (granted on Admin Access)
can open one edition at a time, set or change the deadline, close and reopen it,
review participants (portrait, quote, messages received and written) and remove
messages. Exports:

- **Print view** (`/print/yearbook/[editionId]`): cover page plus one A4 page per
  participant with portrait, quote and messages, laid out for "Save as PDF".
- **CSV**: one row per printable message, plus one row per participant without
  messages. Cells are formula-escaped and UTF-8 with BOM.
- **JSON**: the same pages as structured data for a designer or layout tool.

Print rule: a page exists for every participant, and it contains messages whose
author is also a participant. Photo links in CSV/JSON are signed for 7 days.

## Security and privacy

- All yearbook tables are server-only (RLS on, no policies, no grants for
  `anon`/`authenticated`). `lib/server/yearbook.ts` resolves the member through
  `getRequestMember`, checks the admin scope with `check_email_has_admin_scope`,
  and uses the service role.
- Every mutation re-checks that the edition is open and before its deadline, and
  that the author is a participant. Authors can delete only their own messages;
  admins can remove any message at any time.
- Photos are downsized in the browser, then re-encoded with `sharp` on the
  server: EXIF rotation applied, metadata (including GPS) stripped, long edge
  ≤ 2400 px, JPEG. Objects live in the private `yearbook-photos` bucket and are
  only ever served through signed URLs. Replaced or removed photos are deleted.
- The member directory uses plain lazy `<img>` tags, not eager avatar
  preloading.

## Deployment

Apply `supabase/yearbook.sql` before deploying. It extends the central admin
scope constraints and functions (same pattern as `event_grants.sql`) and is safe
to re-run.

Applied to the production Supabase project on 2026-11-26. The server needs
`SUPABASE_SERVICE_ROLE_KEY` (a `sb_secret_…` key); without it, or without the
tables, the yearbook pages show a "not set up yet" state and log the reason.

## Not in this draft

- A ZIP download of original photos (exports contain signed links instead).
- Reactions/likes, comment threads, or per-subject hiding of messages.
- Email reminders before the deadline.
