# Database Schema

This document is the canonical repo-level overview of the current Supabase schema for the membership management platform.

Last inspected against the live Supabase project: 2026-05-26.

## Source Of Truth

- Live database: Supabase project configured by `NEXT_PUBLIC_SUPABASE_URL`.
- Application clients:
  - Browser/client Supabase access: `lib/supabase.ts`
  - Server Supabase access: `lib/supabase/server.ts`
  - Service-role admin access: `lib/server/supabaseAdmin.ts`
- SQL files:
  - `supabase/events_external_metadata.sql`
  - `supabase/event_interest.sql`
  - `supabase/nft_requests.sql`
  - `supabase/newsletter_projects.sql`
  - `supabase/coffee_chats.sql`
- Import tooling:
  - `scripts/import-external-events-csv.mjs`

There is no active `mmp` schema and no current `supabase/schema.sql` in this repository. The app uses the `public` schema.

## Public Tables

### `public.members_main`

Primary member directory table. App code resolves the signed-in user by matching Supabase Auth `email` to `members_main."TBC Email"`.

Current live count: 139 rows.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | no | none | Primary key. |
| `created_at` | `timestamptz` | no | `now()` | Creation timestamp. |
| `Name` | `text` | no | none | Display name. |
| `Role` | `text` | yes | none | Examples include `Core Member`, `Board Member`, `Ex-Core Member`, `Guest`. |
| `Status` | `text` | yes | none | Examples include `Active`, `Passive`, `Left`, `Kicked out`. |
| `Department` | `text` | yes | none | May contain comma-separated departments. |
| `Project/Task` | `text` | yes | none | Current project/task. |
| `Area of Expertise` | `text` | yes | none | Free-form expertise text. |
| `Picture` | `bytea` | yes | none | Legacy binary picture storage; newer flows may use public storage URLs. |
| `Batch` | `text` | yes | none | Batch/cohort metadata. |
| `Uni` | `text` | yes | none | University. |
| `Semester Joined` | `text` | yes | none | Joined semester. |
| `Bachelor/Master` | `text` | yes | none | Degree level. |
| `Phone` | `text` | yes | none | Phone number. |
| `Private Email` | `text` | yes | none | Personal email. |
| `TBC Email` | `text` | yes | none | Unique TBC email used for auth/member matching. |
| `Linkedin` | `text` | yes | none | LinkedIn URL or handle. |
| `Telegram` | `text` | yes | none | Telegram handle. |
| `Discord` | `text` | yes | none | Discord handle. |
| `Instagram` | `text` | yes | none | Instagram handle. |
| `Twitter` | `text` | yes | none | X/Twitter handle. |
| `Size Merch` | `text` | yes | none | Merchandise size. |
| `UUID` | `uuid` | yes | none | Optional UUID metadata. |
| `Degree` | `text` | yes | none | Degree program. |
| `degree_at_uni` | `text` | yes | none | Additional degree metadata. |
| `highlight` | `text` | yes | none | Profile highlight. |
| `nft_avatar` | `text` | yes | none | NFT avatar reference. |
| `nft_consent` | `boolean` | yes | `false` | Consent for NFT flows. |
| `nickname` | `text` | yes | none | Preferred nickname. |

Constraints and indexes:

- Primary key: `Members_TUM_pkey` on `id`.
- Unique index: `members_main_tbc_email_unique` on `"TBC Email"`.

### `public.events`

Shared table for club-organized internal events and imported external ecosystem events.

Current live count: 29 rows.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | no | none | Primary key. |
| `created_at` | `timestamptz` | no | `now()` | Creation timestamp. |
| `title` | `varchar` | yes | none | Event title. |
| `description` | `varchar` | yes | none | Event description. |
| `start_at` | `timestamptz` | yes | none | Event start. Event display uses UTC formatting for hydration stability. |
| `end_at` | `timestamptz` | yes | none | Event end. |
| `location` | `varchar` | yes | none | Location display fallback. |
| `organizer_department` | `varchar` | yes | none | Internal organizer or external event type. |
| `capacity_total` | `integer` | yes | none | Internal event capacity. |
| `check_in_token` | `uuid` | yes | `gen_random_uuid()` | Token for check-in flows. |
| `check_in_enabled` | `boolean` | no | `false` | Enables event check-in. |
| `event_kind` | `text` | no | `internal` | `internal` or `external`. |
| `event_type` | `text` | yes | none | External type, e.g. `Conference`, `Hackathon`, or both. |
| `priority` | `text` | yes | none | External priority, e.g. `P1`, `P2`, `P3`, `P4`, `P5`. |
| `external_status` | `text` | yes | none | External status such as `Registration Open`, `Past`, `Canceled`. |
| `city` | `text` | yes | none | External city. |
| `format` | `text` | yes | none | External format such as `In-Person`, `Virtual`, `Hybrid`. |
| `is_hackathon` | `boolean` | no | `false` | Convenience flag for hackathons. |
| `attending_names` | `text[]` | no | `{}` | Imported free-form attending list. |
| `all_day` | `boolean` | no | `false` | External CSV imports are all-day events. |
| `image_url` | `text` | yes | none | Public image URL for event card display. |
| `event_link_url` | `text` | yes | none | Click-through target for the event image/card link. |
| `tally_url` | `text` | yes | none | Tally application form URL. When set, the event card shows an "Apply" button in addition to the interest controls. |
| `whatsapp_url` | `text` | yes | none | WhatsApp group URL. Shown alongside the "Apply" button when set. |

Constraints and indexes:

- Primary key: `events_pkey` on `id`.
- Check: `events_event_kind_check`, restricts `event_kind` to `internal` or `external`.
- Unique index: `events_check_in_token_idx` on `check_in_token`.

App behavior:

- Internal events use registration, participant count, capacity, organizer, and check-in flows.
- External events use structured metadata from CSV/admin edits.
- Events page defaults to P1/P2 priorities and hides events older than seven days unless `Past Events` is enabled.
- Full external CSV imports use `scripts/import-external-events-csv.mjs`.

### `public.event_interest`

N:M mapping table tracking which members have expressed interest in external events. Used by the "I'm Interested" button on event cards and by CSV interest backfills. This replaces the older idea of storing interested people as a free-form array on `events`.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | no | identity | Primary key. |
| `created_at` | `timestamptz` | no | `now()` | Row creation timestamp. |
| `event_id` | `bigint` | no | none | References `events.id`. Cascades delete. |
| `member_id` | `bigint` | no | none | References `members_main.id`. Cascades delete. |

Constraints and indexes:

- Primary key: `event_interest_pkey` on `id`.
- Unique index: `(event_id, member_id)` — one row per member per event.
- Index: `event_interest_event_id_idx` on `event_id`.
- Index: `event_interest_member_id_idx` on `member_id`.

Relationships:

- `event_id` -> `events.id`
- `member_id` -> `members_main.id`

### `public.event_registrations`

Registration table for internal event attendance intent.

Current live count: 5 rows.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `bigint` | no | none | Primary key. |
| `created_at` | `timestamptz` | no | `now()` | Registration timestamp. |
| `event_id` | `bigint` | yes | none | References `events.id`. |
| `member_id` | `bigint` | yes | none | References `members_main.id`. |

Relationships:

- `event_id` -> `events.id`
- `member_id` -> `members_main.id`

### `public.attendance`

Check-in table for event attendance.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | Primary key. |
| `member_id` | `integer` | no | none | References `members_main.id`. |
| `event_id` | `integer` | no | none | References `events.id`. |
| `checked_in_at` | `timestamptz` | no | `now()` | Check-in timestamp. |

Constraints and indexes:

- Primary key: `attendance_pkey` on `id`.
- Unique index: `attendance_member_id_event_id_key` on `(member_id, event_id)`.
- Index: `attendance_member_id_idx` on `member_id`.
- Index: `attendance_event_id_idx` on `event_id`.

Relationships:

- `member_id` -> `members_main.id`
- `event_id` -> `events.id`

### `public.nft_requests`

NFT image/profile request table.

Current live count: 2 rows.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | Primary key. |
| `member_id` | `integer` | no | none | References `members_main.id`; one request per member. |
| `status` | `text` | no | `pending` | Request lifecycle status. |
| `display_name` | `text` | no | none | Display name for NFT. |
| `fun_facts` | `text` | yes | none | Optional prompt/profile facts. |
| `wallet_address` | `text` | yes | none | Optional wallet override. |
| `image_path` | `text` | no | none | Storage object path. |
| `image_url` | `text` | no | none | Public image URL. |
| `created_at` | `timestamptz` | no | `now()` | Creation timestamp. |
| `reviewed_at` | `timestamptz` | yes | none | Review timestamp. |
| `reviewed_by` | `uuid` | yes | none | References an auth user. |
| `review_note` | `text` | yes | none | Admin review note. |
| `mint_tx_hash` | `text` | yes | none | Mint transaction hash. |
| `burn_tx_hash` | `text` | yes | none | Burn transaction hash. |
| `update_tx_hash` | `text` | yes | none | Metadata/update transaction hash. |

Constraints and indexes:

- Primary key: `nft_requests_pkey` on `id`.
- Unique index: `nft_requests_one_per_member` on `member_id`.
- Unique indexes on `image_path` and `image_url`.
- Index: `nft_requests_status_created_at_idx` on `(status, created_at desc)`.
- Check constraints exist for `status`, wallet address, transaction hashes, and `fun_facts`.

Relationships:

- `member_id` -> `members_main.id`
- `reviewed_by` -> Supabase Auth user id.

### `public.link_redirect_definitions`

Canonical QR/link metadata mirrored from the `tbc-link-redirects` repository and editable deployment notes for the dashboard.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | Primary key. |
| `year` | `text` | no | none | URL year segment, e.g. `26`. |
| `slug` | `text` | no | none | URL slug, e.g. `fly-01`. |
| `label` | `text` | no | none | Human-readable link label. |
| `display_label` | `text` | yes | none | Board-editable display name shown in the analytics dashboard. |
| `target_url` | `text` | no | none | Redirect target URL. |
| `origin` | `text` | no | none | Campaign medium, e.g. `flyer` or `roll-up`. |
| `campaign` | `text` | no | none | Campaign group. |
| `variant` | `text` | no | none | Variant identifier. |
| `active` | `boolean` | no | `true` | Metadata status; hardcoded `/q` redirects do not currently read this field. |
| `redirect_source` | `text` | no | `'soft'` | `hardcoded` when synced from redirect code, otherwise `soft`. |
| `hardcoded_target_url` | `text` | yes | none | Last target URL synced from the hardcoded redirect config. |
| `hardcoded_synced_at` | `timestamptz` | yes | none | Last time hardcoded metadata was synced. |
| `image_path` | `text` | yes | none | Supabase Storage object path for a board-uploaded link image. |
| `image_url` | `text` | yes | none | Protected app proxy URL for the board-uploaded link image. |
| `deployment_region` | `text` | yes | none | Board-editable placement region. |
| `deployment_location` | `text` | yes | none | Board-editable placement location. |
| `deployment_notes` | `text` | yes | none | Board-editable placement notes. |
| `deployed_at` | `date` | yes | none | Board-editable deployment date. |
| `created_at` | `timestamptz` | no | `now()` | Creation timestamp. |
| `updated_at` | `timestamptz` | no | `now()` | Last metadata or sync timestamp. |

Constraints and indexes:

- Unique constraint on `(year, slug)`.
- Indexes on `(campaign, variant)` and `origin`.

### `public.link_redirect_clicks`

Privacy-preserving click events written by the `tbc-link-redirects` app after redirect responses.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | Primary key. |
| `year` | `text` | no | none | URL year segment. |
| `slug` | `text` | no | none | URL slug. |
| `status` | `text` | no | none | `redirected` or `not_found`. |
| `target_url` | `text` | yes | none | Sanitized target URL without query/hash. |
| `origin` | `text` | yes | none | Campaign medium copied from the redirect definition. |
| `campaign` | `text` | yes | none | Campaign group copied from the redirect definition. |
| `variant` | `text` | yes | none | Variant copied from the redirect definition. |
| `label` | `text` | yes | none | Label copied from the redirect definition. |
| `referrer_domain` | `text` | yes | none | Referrer host only, not the full URL. |
| `device_type` | `text` | yes | none | Derived category such as `mobile`, `tablet`, or `desktop`. |
| `browser_family` | `text` | yes | none | Derived browser family. |
| `country` | `text` | yes | none | Vercel country header. |
| `query` | `jsonb` | no | `{}` | Selected UTM parameters. |
| `request_path` | `text` | no | none | Requested redirect path. |
| `clicked_at_hour` | `timestamptz` | no | none | Timestamp rounded to the hour. |

This table intentionally does not store IP addresses, full user agents, full referrer URLs, city-level geo fields, or exact timestamps.

### `public.newsletter_projects`

Stores GrapesJS newsletter campaigns for the guarded newsletter builder.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | Primary key. |
| `name` | `text` | no | `Untitled` | Campaign name shown in the dashboard. |
| `subject` | `text` | yes | none | Mail subject draft. |
| `from_name` | `text` | yes | none | Sender display name draft. |
| `from_email` | `text` | yes | none | Sender email draft. |
| `to_address` | `text` | yes | none | Mailing list address draft. |
| `html` | `text` | yes | none | Inlined email HTML snapshot. |
| `gjs_data` | `jsonb` | yes | none | GrapesJS project data. |
| `created_by` | `uuid` | yes | none | References `auth.users(id)` for audit. |
| `created_at` | `timestamptz` | no | `now()` | Creation timestamp. |
| `updated_at` | `timestamptz` | no | `now()` | Maintained by `set_newsletter_projects_updated_at`. |

Constraints and indexes:

- Primary key on `id`.
- Indexes on `created_by` and `updated_at desc`.

### `public.newsletter_deliveries`

Stores Mailgun send records created by the guarded newsletter builder. Test and campaign sends are both tracked so the dashboard can show recent delivery state.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | Primary key. |
| `project_id` | `uuid` | yes | none | References `newsletter_projects(id)`; set null when a project is deleted. |
| `delivery_type` | `text` | no | `campaign` | Check-constrained to `test` or `campaign`. |
| `status` | `text` | no | `sent` | Check-constrained to `sent`, `delivered`, or `failed`. |
| `subject` | `text` | no | none | Subject sent to Mailgun. |
| `from_name` | `text` | yes | none | Sender display name. |
| `from_email` | `text` | no | none | Sender email. |
| `recipient` | `text` | no | none | Test recipient or mailing list address. |
| `mailgun_message_id` | `text` | yes | none | Mailgun message id without angle brackets. |
| `mailgun_message` | `text` | yes | none | Mailgun API response message. |
| `last_event` | `text` | yes | none | Most recent synced Mailgun event. |
| `last_event_at` | `timestamptz` | yes | none | Timestamp of the most recent synced event. |
| `event_summary` | `jsonb` | no | `{}` | Event counts keyed by Mailgun event name. |
| `created_by` | `uuid` | yes | none | References `auth.users(id)` for audit. |
| `created_at` | `timestamptz` | no | `now()` | Creation timestamp. |
| `updated_at` | `timestamptz` | no | `now()` | Maintained by `set_newsletter_deliveries_updated_at`. |

Constraints and indexes:

- Primary key on `id`.
- Foreign keys on `project_id` and `created_by`.
- Check constraints on `delivery_type` and `status`.
- Unique partial index on `mailgun_message_id where mailgun_message_id is not null`.
- Indexes on `project_id`, `created_by`, and `created_at desc`.

### `public.newsletter_delivery_events`

Stores Mailgun delivery events synced on demand from the delivery tracking panel.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | no | `gen_random_uuid()` | Primary key. |
| `delivery_id` | `uuid` | no | none | References `newsletter_deliveries(id)` and cascades delete. |
| `event` | `text` | no | none | Mailgun event name such as `delivered`, `opened`, `clicked`, or `failed`. |
| `recipient` | `text` | no | none | Recipient reported by Mailgun. |
| `event_timestamp` | `timestamptz` | no | none | Mailgun event timestamp. |
| `raw_payload` | `jsonb` | no | `{}` | Raw Mailgun event payload for later debugging. |
| `created_at` | `timestamptz` | no | `now()` | Sync timestamp. |

Constraints and indexes:

- Primary key on `id`.
- Foreign key on `delivery_id`.
- Unique index on `(delivery_id, event, recipient, event_timestamp)`.
- Indexes on `delivery_id` and `event_timestamp desc`.

## Functions

| Function | Returns | Purpose |
| --- | --- | --- |
| `current_member_id()` | `integer` | Resolves current authenticated user to `members_main.id`. |
| `has_special_access()` | `boolean` | Checks whether the current user has special admin access. |
| `check_email_has_special_access(check_email text)` | `boolean` | Checks special access for a supplied email. |
| `check_email_can_manage_newsletter(check_email text)` | `boolean` | Checks newsletter manager access for board members or special-access users. |
| `check_email_can_manage_coffee_chats(check_email text)` | `boolean` | Checks Coffee Chat administrator access for board members or special-access users. |
| `commit_coffee_chat_pairing(target_round_id uuid, pair_rows jsonb)` | `integer` | Locks an open round, validates participants, inserts all pairs, and advances the round atomically. Service-role only. |
| `can_manage_nft_requests()` | `boolean` | Checks NFT admin permissions. |
| `allow_only_test_domain()` | `trigger` | Auth-related domain guard. |
| `block_guest_core_updates_email()` | `trigger` | Prevents restricted email updates. |
| `handle_new_user_members_main()` | `trigger` | Auth/member sync helper. |
| `handle_new_user_test()` | `trigger` | Test/new-user helper. |

## Row Level Security And Policies

This section summarizes the active policies. For exact SQL, inspect Supabase or the live database.

### Members

- Authenticated users can read `members_main`.
- Users can update their own row where `"TBC Email"` matches their auth email.
- Board members can insert members.
- Board members can update members across all departments.
- Special-access emails can insert members and update all members.

Special-access emails are currently encoded in DB policies and app-side admin checks. Keep them synchronized if changing authorization behavior.

### Newsletter

- Newsletter projects, assets, deliveries, and delivery events are managed by newsletter managers.
- Newsletter managers are members with `Role = 'Board Member'` or users accepted by `check_email_has_special_access(check_email text)`.
- API routes verify the same access through `check_email_can_manage_newsletter(check_email text)` before calling Mailgun or mutating newsletter data.

### Events And Registration

- `events` is publicly readable.
- Board members can update `events` through RLS.
- Event admin create/update API routes additionally guard writes with server-side special access checks and use the service-role client when available.
- `event_registrations` is publicly readable.
- Authenticated users can insert registrations.
- Authenticated users can delete their own registration rows.
- `event_interest` is readable by authenticated users.
- Authenticated users can insert their own interest rows (`member_id = current_member_id()`).
- Authenticated users can delete their own interest rows.
- `attendance` rows can be inserted by the checked-in member, viewed by the owner, and viewed by board members.

### NFT Requests

- Members can insert their own NFT request.
- Members can view their own request.
- NFT admins can view all, update, and delete requests.

### Link Redirect Analytics

- `link_redirect_definitions` and `link_redirect_clicks` are protected by RLS for service-role access.
- The membership dashboard reads aggregate analytics server-side for board members and special-access users.
- Board members and special-access users can update deployment metadata through the server-side API route.

### Newsletter Projects

- Authenticated special-access users can read, insert, update, and delete newsletter projects.
- Inserts require `created_by = auth.uid()` in normal authenticated sessions.
- Updates and deletes are shared across special-access users; `created_by` is audit metadata, not ownership enforcement.

### Newsletter Deliveries

- Authenticated special-access users can read, insert, update, and delete newsletter delivery rows.
- Inserts require `created_by = auth.uid()` in normal authenticated sessions.
- Authenticated special-access users can read, insert, and delete synced newsletter delivery events.

### Storage

- `member-pictures`: authenticated users can view; users can upload/update their own object path.
- `event-images`: public read access.
- `event-qr-codes`: public read access; board members can upload/update.
- `newsletter-assets`: public read access; authenticated special-access users can upload, update, and delete objects.
- `nft-images-picks`: open policy for anon/authenticated users named `dev_open_nft_images`; review this before production hardening.

## Storage Buckets

| Bucket | Public | Purpose |
| --- | --- | --- |
| `member-pictures` | yes | Member profile pictures. |
| `event-images` | yes | External event card images. |
| `event-qr-codes` | yes | Event check-in QR codes. |
| `link-redirect-images` | no | Private board-uploaded visual references for QR/link placements. |
| `newsletter-assets` | yes | Public reusable images inserted into Mailgun newsletter campaigns. |
| `coffee-chat-selfies` | no | Private Coffee Chat meeting photos served with short-lived signed URLs. |
| `nft-images-picks` | yes | NFT request image uploads/picks. |

## Coffee Chats Tables (`supabase/coffee_chats.sql`)

Applies coffee-chat columns to `members_main` and creates three new tables.

### `public.members_main` coffee-chat columns

| Column | Type | Notes |
| --- | --- | --- |
| `cc_interests` | `text[]` | Selected interest tags. |
| `cc_study_programme` | `text` | Free-form study programme string. |
| `cc_already_know` | `bigint[]` | Member IDs the person already knows well (used for exclusion). |
| `cc_favourite_coffee` | `text` | Favourite coffee drink. |
| `cc_favourite_spots` | `text[]` | Favourite Munich coffee spots / meeting place recommendation. |
| `cc_fun_fact` | `text` | Optional profile note. |
| `cc_active` | `boolean` | Whether the member opted in by saving preferences. Default `false`. |

### `public.cc_admins`

Stores designated Coffee Chat administrators assigned by Board Members.

| Column | Type | Notes |
| --- | --- | --- |
| `member_id` | `bigint` | Primary key. References `members_main(id)`. Cascades delete. |
| `assigned_by` | `bigint` | Member ID of the board member who assigned this admin. |
| `created_at` | `timestamptz` | Assignment timestamp. |

RLS: all authenticated users can read; board members and explicit special-access users can insert/delete.

### `public.cc_rounds`

One row per monthly coffee-chat cycle.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `month` | `text` | Human-readable month string, e.g. `2026-07`. |
| `status` | `text` | `open`, `paired`, or `closed`. |
| `signup_deadline` | `timestamptz` | Optional deadline shown to members. |
| `meet_deadline` | `timestamptz` | Optional meeting deadline. |
| `created_at` | `timestamptz` | Creation timestamp. |

Only one round can be open at a time, month values are unique `YYYY-MM` strings,
and the signup deadline cannot be later than the meeting deadline. RLS allows all
authenticated users to read; board members and explicit special-access users can write.

### `public.cc_signups`

Member opt-ins for a round.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `round_id` | `uuid` | References `cc_rounds(id)`. Cascades delete. |
| `member_id` | `bigint` | References `members_main(id)`. |
| `signed_up_at` | `timestamptz` | Signup timestamp. |

Unique constraint on `(round_id, member_id)`.
RLS: members manage their own rows via `current_member_id()`; admins manage all.

### `public.cc_pairs`

Matched pairs or trios for a round.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key. |
| `round_id` | `uuid` | References `cc_rounds(id)`. |
| `person1_id` | `bigint` | First member. |
| `person2_id` | `bigint` | Second member. |
| `person3_id` | `bigint` | Optional third member (trio for odd counts). |
| `icebreaker_q1/q2/q3` | `text` | Auto-generated ice-breaker questions. |
| `status` | `text` | `pending`, `met`, or `skipped`. |
| `selfie_path` | `text` | Private Supabase Storage object path (`coffee-chat-selfies`). APIs issue short-lived signed URLs. |
| `date_met` | `date` | Date the pair met. |
| `person1/2/3_signed_off` | `boolean` | Individual sign-off flags. |
| `highlight_note` | `text` | Short highlight note. |
| `created_at` | `timestamptz` | Creation timestamp. |

RLS: each member can see pairs they belong to; board members and explicit
special-access users manage all. Pair rows and the round status are committed
atomically by `commit_coffee_chat_pairing(uuid, jsonb)`.

### Storage Bucket `coffee-chat-selfies`

Private bucket. Uploads go through the authenticated Coffee Chat API, which
verifies pair membership, permits JPEG/PNG/WebP images up to 5 MB, and uses the
service-role client. Reads use one-hour signed URLs.

## Known Documentation And Type Gaps

- `lib/types/database.types.ts` is a hand-written partial Supabase type map for member, newsletter, and Coffee Chat tables. It is not a full generated schema.
- `events`, `event_registrations`, `attendance`, `nft_requests`, and link redirect analytics tables are modeled locally in feature files where needed.
- If you regenerate Supabase types, include all `public` tables and update imports that currently rely on hand-written interfaces.

## Maintenance Commands

Import recent external events from a CSV:

```bash
pnpm exec node scripts/import-external-events-csv.mjs --file=/absolute/path/events.csv --months-back=1
```

Run checks after schema-sensitive UI/API changes:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```
