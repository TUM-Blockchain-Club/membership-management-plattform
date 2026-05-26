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
- `event_link_url`
- `is_hackathon`
- `attending_names`
- `all_day`

It also backfills the 19 imported CSV rows as `external` and preserves existing sample/club events as `internal`.

## UI Notes

- Internal event cards keep registration actions and participant access.
- External event cards show structured conference/hackathon metadata, imported attending names, and relational member interest counts.
- External event cards display `image_url` when present. P1/P2 priorities are visual card frames instead of visible priority badges.
- Only special-access admins can create and edit external event metadata from the events page. Image uploads go through the guarded `/api/events/[eventId]/image` route into the public `event-images` Supabase Storage bucket.
- The event editor keeps Interested and Attending read-only by leaving those lists out of edit/create forms.
- Status is a fixed shadcn `Select`; Type and Format are shadcn checkbox multi-choice groups that can be left empty.
- The visible external events list uses a members-page-style shadcn filter toolbar with search, Type, multi-choice Priority, and Clear controls.
- P1 and P2 are selected in the Priority filter by default, keeping lower-priority P3/P4 events hidden until explicitly selected.
- The visible external events list hides events older than seven days by default; the "Past Events" toggle reveals older history without changing the stored data.
- Full CSV imports should use `scripts/import-external-events-csv.mjs`. The latest import was run with a one-month age cutoff, skipping CSV events whose end date was before April 25, 2026.
- Event date labels and the seven-day cutoff use UTC math so server-rendered and client-rendered event dates do not drift across timezones during hydration.
- `event_link_url` is used as the click-through target when an event image is present.
- Event images use a compact 1:1 muted frame with `object-contain`; image URLs are managed through upload/storage and are not shown as editable form fields.
- `tally_url` and `whatsapp_url` add application/WhatsApp actions without replacing the "I'm Interested" controls.
- The page uses shadcn primitives (`Card`, `Badge`, `Button`, `Separator`, `Dialog`, `Empty`) and avoids the previous rainbow gradient event cards.
- The dashboard header order now places Events before Statistics.
- As of the latest UI pass, the internal "Our Events" section is hidden behind the local `showInternalEvents` flag in `EventsPage`. The internal card implementation remains in place for later re-enabling.
