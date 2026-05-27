# Link Analytics Dashboard

## Summary

The dashboard has a board-only link analytics overview at `/link-analytics` and per-link detail pages at `/link-analytics/[year]/[slug]`.

Access is enforced in two places:

- The dashboard header only shows the tab for board members or special-access users.
- The page and metadata API route call `requireLinkAnalyticsAdmin()` server-side before reading or writing Supabase data.

The client receives aggregate analytics only. Raw click rows are loaded and aggregated server-side in `lib/server/linkAnalytics.ts`.

The overview page shows a table sorted by 60-day clicks with:

- clicks in the last 60 days
- clicks in the last 7 days
- average clicks per day
- peak hour

The overview includes debounced search, type filtering, and sort modes for engagement or alphabetical order.

The detail page contains the deeper charts, deployment metadata editor, optional link image upload, and QR generator. Daily trend rows are ranked by clicks descending so the strongest day appears first.

Weekday, daily, and hour-of-day charts are displayed in Munich local time (`Europe/Berlin`).

## Data Sources

The page reads:

- `public.link_redirect_definitions`
- `public.link_redirect_clicks`
- Supabase Storage bucket `link-redirect-images`

The current analytics window is 60 days.

## Metadata Editing

The page allows board users to edit these operational metadata fields:

- `deployment_region`
- `deployment_location`
- `deployment_notes`
- `deployed_at`
- `display_label`
- `image_path`
- `image_url`

The redirect project's `pnpm sync:links` script upserts only canonical link fields:

- `year`
- `slug`
- `label`
- `target_url`
- `origin`
- `campaign`
- `variant`
- `active`
- `updated_at`

It does not send `deployment_region`, `deployment_location`, `deployment_notes`, or `deployed_at`, so dashboard notes are not overwritten by sync.

It also does not send `display_label`, `image_path`, or `image_url`, so manual dashboard names and uploaded link images are not overwritten by sync.

## QR Generator

The detail view can generate PNG QR codes with:

- white background
- transparent background
- centered `/assets/tbc-logo.png`

`/assets/tbc-logo.png` is a 1024px PNG used for the QR center mark.

## Database Migration

Apply `supabase/link_redirect_assets.sql` before deploying the image upload UI. It adds the board-managed fields and creates the public `link-redirect-images` bucket.
