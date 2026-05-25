# External Events Migration

## Summary

Events are now modeled as two display categories:

- `internal`: club-organized events using the existing registration, participant, capacity, and organizer flow.
- `external`: imported ecosystem events from the hackathons/conferences CSV.

The events page renders these categories in separate sections with different shadcn-composed cards.

## Supabase Migration

Apply `supabase/events_external_metadata.sql` before deploying this code. The local environment only has Supabase API keys, not a direct Postgres connection or SQL RPC, so the DDL could not be applied from this workspace.

The migration adds:

- `event_kind`
- `event_type`
- `priority`
- `external_status`
- `city`
- `format`
- `image_url`
- `is_hackathon`
- `interested_names`
- `attending_names`
- `all_day`

It also backfills the 19 imported CSV rows as `external` and preserves existing sample/club events as `internal`.

## UI Notes

- Internal event cards keep registration actions and participant access.
- External event cards show structured conference/hackathon metadata and member interest lists.
- External event cards display `image_url` when present. P1/P2 priorities are visual card frames instead of visible priority badges.
- The page uses shadcn primitives (`Card`, `Badge`, `Button`, `Separator`, `Dialog`, `Empty`) and avoids the previous rainbow gradient event cards.
- The dashboard header order now places Events before Statistics.
- As of the latest UI pass, the internal "Our Events" section is hidden behind the local `showInternalEvents` flag in `EventsPage`. The internal card implementation remains in place for later re-enabling.
