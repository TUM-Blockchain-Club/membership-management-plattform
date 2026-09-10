# Solana membership integration

The Solana membership changes are integrated on the current `Prod` baseline,
including the completed Coffee Chats release. Only the two Solana feature/test
commits are carried forward from the older feature branch; its earlier dashboard
and Coffee Chats history is not replayed.

Conflict resolutions preserve the production dependency versions and test commands.
The NFT preview route uses the Solana implementation with admin authorization and
a lazily acquired data client. The lockfile is regenerated from the combined
manifest, retaining production dependency overrides.

`pnpm test` runs both the Node NFT lifecycle tests and the Playwright unit suite.
The Playwright unit configuration excludes the Node test file to avoid loading
its top-level await through Playwright's CommonJS loader.

This integration targets `Prod`. The separately diverged `main` branch is not
merged here. Database deployment and on-chain acceptance remain separate steps;
local tests and a production build do not prove the authenticated minting flow.

Validation: 5 Node NFT tests and 30 Playwright unit tests pass. Typecheck,
lint, and the production build pass. Coffee Chats application, API, library,
and SQL files are unchanged from the production baseline.
