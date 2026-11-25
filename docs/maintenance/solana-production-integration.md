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
minted yet.

On 2026-09-11, a synthetic member completed the application, private portrait
upload, board preview, mint, wallet claim, board confirmation, reconciliation,
Alumni update, and explicit burn through local authenticated-development
sessions backed by the production Supabase project and Solana devnet. The burn
made the Metaplex asset unavailable, deleted its hosted private and public
files, and the synthetic database rows were removed afterward.

That acceptance run also aligned the visible Batch field with
`members_main.Batch`, fixed board previews to show the submitted Member Flex,
made the guarded image route work for local member/admin sessions, and clears
pending claim fields after a confirmed transfer.

A separate mainnet signer is stored locally in an ignored mode-600 environment
file. Mainnet activation still requires funding that signer, selecting a
mainnet RPC, creating a distinct mainnet collection, and setting those values
in Vercel. A production cron probe returned `401 Unauthorized`, so the
deployed `CRON_SECRET` must also be aligned before production reconciliation
can be accepted.

## Production update merge (2026-11-25)

`feature/complete-nft-rollout` merged `origin/Prod` (dependency/security updates,
board-tool and newsletter permission fixes, Coffee Chats round administration,
attendance fix). NFT administration now accepts board members, Special Access and
central `nfts` assignments; the hardcoded member-ID allowlist was removed. The
Coffee Chats admin table links each month to the Production round detail page,
while the row's round dialog keeps deadline editing on the same round API.

A read-only inspection of the production database showed every SQL file this
branch needs is already applied: `nft_requests.sql` (central `nft_admins`
view), `nft_publication_consent.sql`, `admin_access.sql`, `event_grants.sql`,
`members_default_role.sql` and `attendance_secure_check_in.sql`. No migration is
pending for this release. Do not rerun `members_default_role.sql`: production's
`handle_new_user_members_main()` has a later conference-account guard that the
repository copy would overwrite. Because direct browser writes to `nft_requests`
and the legacy `cc_admins`/`nft_admins` tables were already retired, the older
Production code's member NFT submission/claim and Coffee Chat admin assignment
write paths cannot succeed until this branch is deployed.
