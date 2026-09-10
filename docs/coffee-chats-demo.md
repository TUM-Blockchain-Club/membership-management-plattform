# Coffee Chats Demo Deployment

The Coffee Chats feature can be reviewed without club infrastructure by enabling its isolated demo mode.

## Personal Vercel Preview

1. Import `TUM-Blockchain-Club/membership-management-plattform` into a personal Vercel account.
2. Select the `feature/coffee-chats` branch.
3. Add `NEXT_PUBLIC_COFFEE_CHATS_DEMO=true` to the Preview environment.
4. Deploy and open `/home`. The root URL also redirects to the member home in demo mode.

Demo mode uses static fake members, rounds, matches, and gallery entries. Profile saves, signups, meeting logs, round creation, and pairing actions are simulated in the browser. It skips Supabase authentication and must never be enabled on the production platform deployment.
