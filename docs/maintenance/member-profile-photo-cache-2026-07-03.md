# Member Profile Photo Cache

## 2026-07-03

- Changed Supabase Storage cache control for uploads to the `member-pictures` bucket from 1 hour to 2 weeks.
- The upload flow still appends a timestamp query parameter to the returned public URL, so newly uploaded or replaced profile photos continue to bypass stale cached URLs in the app.
- NFT, event, link redirect, and newsletter image cache settings were not changed.
