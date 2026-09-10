# Solana membership integration

As of 2026-09-10, the Solana membership changes are integrated and deployed on
both `Prod` and `main`. The integration retains the Coffee Chats, member home,
sidebar, attendance, newsletter, and profile-upload changes from each baseline.

Conflict resolutions preserve the production dependency versions and test commands.
The NFT preview route uses the Solana implementation with admin authorization and
a lazily acquired data client. The lockfile is regenerated from the combined
manifest, retaining production dependency overrides.

`pnpm test` runs both the Node NFT lifecycle tests and the Playwright unit suite.
The Playwright unit configuration excludes the Node test file to avoid loading
its top-level await through Playwright's CommonJS loader.

The production Supabase schema is already migrated: `nft_requests` uses
`claim_wallet_address`, `asset_address`, ownership, custody, lifecycle, and
reconciliation fields and no longer contains the legacy `wallet_address` field.
The private `nft-request-images` and public `nft-public-assets` buckets exist.

Validation: 5 Node NFT tests and 30 Playwright unit tests pass. Typecheck,
lint, production build, CI, CodeQL, and Vercel deployments pass. A disposable
Solana devnet run completed mint, metadata update, claim, and burn, verified the
owner after claim and verified that the asset was unavailable after burn. The
prototype's hosted files were removed afterward.

The configured devnet collection and funded signer are ready. One existing
membership request is still unminted, and no real membership asset has been
minted yet. The remaining acceptance work is to exercise application, board
approval, mint, claim, membership-status update, and reconciliation through
authenticated production UI sessions before preparing separate mainnet keys,
funding, RPC, and collection configuration.
