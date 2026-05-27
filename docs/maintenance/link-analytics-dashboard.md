# Link Analytics Dashboard

## Summary

The dashboard has a board-only link analytics page at `/link-analytics`.

Access is enforced in two places:

- The dashboard header only shows the tab for board members or special-access users.
- The page and metadata API route call `requireLinkAnalyticsAdmin()` server-side before reading or writing Supabase data.

The client receives aggregate analytics only. Raw click rows are loaded and aggregated server-side in `lib/server/linkAnalytics.ts`.

## Data Sources

The page reads:

- `public.link_redirect_definitions`
- `public.link_redirect_clicks`

The current analytics window is 60 days.

## Metadata Editing

The page allows board users to edit these operational metadata fields:

- `deployment_region`
- `deployment_location`
- `deployment_notes`
- `deployed_at`

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

## QR Generator

The detail view can generate PNG QR codes with:

- white background
- transparent background
- centered `/assets/tbc-logo.png`

If the club provides a different PNG later, replace that public asset or update the image path in `LinkAnalyticsDashboard.tsx`.
