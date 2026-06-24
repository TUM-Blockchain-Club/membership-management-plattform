# Plausible Tracking

The production site `plattform.tum-blockchain.com` loads the self-hosted Plausible tracker from the shared TBC Plausible instance:

```tsx
<Script
  defer
  data-domain="plattform.tum-blockchain.com"
  src="https://plausible.rbg.tum-blockchain.com/js/script.js"
  strategy="afterInteractive"
/>
```

The script is installed in `app/layout.tsx` so it is present across the App Router tree, including dashboard routes.

Verify locally after a build by inspecting rendered HTML or by checking the deployed page source for `plausible.rbg.tum-blockchain.com/js/script.js`.
