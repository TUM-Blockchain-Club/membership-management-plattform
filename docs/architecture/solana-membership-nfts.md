# Solana Membership NFTs

## Decision

The membership platform issues one mutable Metaplex Core asset per approved
member. The implementation is independent from other credential projects.

- New assets are created on Solana, starting on devnet.
- During the request, the member chooses direct minting to their Solana wallet
  or initial custody in the club wallet.
- Members request a claim or wallet recovery through the authenticated platform.
- Assets remain frozen between platform-controlled transfers.
- The club remains the permanent update, transfer, freeze, and burn authority.
- Profile changes require board review.
- Alumni keep the same asset with updated artwork and metadata.
- `Left`, `Kicked out`, and manual revocation burn the asset and delete hosted
  personal media.

## Domain terms

- **NFT request**: A member's submitted portrait and approved public profile fields.
- **Membership asset**: The Metaplex Core asset created from an approved request.
- **Requested destination**: Before review, the member chooses the club wallet
  or supplies a personal Solana wallet for direct minting.
- **Club custody**: The shared club wallet currently owns the asset.
- **Claim**: A board-approved transfer from club custody to a member wallet.
- **Recovery**: A board-approved transfer from a previous member wallet to a new one.
- **Active**: The member currently participates in the club.
- **Alumni**: The member completed their club time and keeps the asset.
- **Revoked**: The board burns the asset and removes hosted personal media.
- **Reconciliation**: Comparison of stored owner/URI data with the Solana account.

All members with the `Board Member` role can administer NFT requests.
Board members can also assign additional active members through the NFT
administration page; those assignments live in `nft_admins`.

## Data and privacy

Source portraits are stored in the private `nft-request-images` Supabase bucket.
Only guarded server routes return them. Rendered PNGs and metadata JSON are
versioned in the public `nft-public-assets` bucket because wallets and explorers
must fetch them without an authenticated session.

On burn, the app deletes the source portrait and all public files and redacts
the request row. Solana transaction history and third-party caches cannot be
deleted; user-facing consent must state this limitation.

No email address, internal member ID, credential ID, or full legal name is
written into NFT metadata. Public fields are display name, portrait, department,
batch/club period, member flex, and membership status.

The batch displayed in the request form is read-only and comes from
`members_main.Batch`. This keeps the member form, board preview, rendered
artwork, and on-chain metadata on the same authoritative value. Public
`/terms` and `/privacy` routes explain the publication and retention model
before consent is submitted.

## Signing and authority

The Next.js server reads the club signer from Vercel environment variables. The
private key is never exposed to client code, logs, database rows, or committed
files. `SOLANA_WALLET_PUBLIC_KEY` is checked against the derived key at runtime.

Required variables:

```env
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=
SOLANA_WALLET_PRIVATE_KEY=
SOLANA_WALLET_PUBLIC_KEY=
SOLANA_COLLECTION_ADDRESS=
CRON_SECRET=
```

`SOLANA_WALLET_PRIVATE_KEY` accepts Base58 or a JSON byte array. Configure the
same values for the intended Vercel preview environment before testing minting.

## Deployment sequence

1. Apply `supabase/nft_requests.sql`, then `supabase/nft_publication_consent.sql` to the platform Supabase project.
2. Configure the signer, RPC, `CRON_SECRET`, and existing Supabase variables locally.
3. Fund the signer with devnet SOL.
4. Run `pnpm solana:create-collection` once and save the printed collection address.
5. Set `SOLANA_COLLECTION_ADDRESS` locally and in the Vercel preview environment.
6. Test mint, profile update, alumni update, claim/recovery, burn, and reconciliation.
7. Repeat with separate mainnet authority/configuration only after devnet acceptance.

Devnet and mainnet must use different signer keypairs, RPC configuration, and
collection addresses. Keep each private key only in the matching local or
Vercel environment.

The collection creation command uploads collection metadata to
`nft-public-assets`. It prints public addresses and a transaction signature only.

Run the disposable on-chain lifecycle test with:

```bash
pnpm solana:test-lifecycle
```

It uses public prototype metadata, verifies mint/update/claim/burn on the
configured network, and removes the temporary hosted files afterward.

## Failure recovery

Every blockchain action creates a row in `nft_chain_operations` before signing.
Confirmed signatures and asset addresses are stored there before the main request
row is updated. Daily Vercel reconciliation and the board's manual reconcile
action compare the stored owner and metadata URI with Solana.

## In-app artwork previews

Home and NFT Status share `components/nft-preview.tsx`. Before minting, the
club-branded collectible is explicitly labeled as a preview; it does not imply
approval or ownership. NFT Status replaces it with the minted artwork when
available and retains a readable fallback if the image fails. The presentation
uses the official website purple (`#672EB3`) with lilac foil highlights and
a component-scoped CSS module so its styles ship with the preview. Pointer
position controls perspective and foil lighting; click, touch or keyboard activation
turns the card over. Idle motion pauses outside the viewport, in hidden tabs, or
via the pause control. Reduced-motion preferences disable idle motion and tilt. It does not change the artwork minted on-chain.

## Publication consent

`lib/nftLegal.ts` is the shared source for the displayed terms, privacy notice and
explicit publication statement. Every wording change requires a new immutable
version. The request API requires literal `true` and the current version; it
derives the actor from the authenticated session (local auth bypass cannot consent).
The service-only RPC atomically saves a private receipt with complete legal text,
server timestamp, actor, member, request and submitted/approved profile references.
Do not infer evidence from the legacy `members_main.nft_consent` flag.

Existing requests display a separate renewal form, preserving their review state.
The common public renderer checks current evidence before any upload, covering
minting, profile updates and alumni updates; wallet transfers check it too. Burn
and private review remain available without consent. Withdrawal is handled via
the published contact and admin revocation; consent records alone never override
a burned state. Receipt retention requires operator review under applicable legal
requirements; no automatic indefinite-retention policy or legal approval is implied.
Legal review of blockchain permanence and provider transfer safeguards remains
necessary before a real personal-data mainnet rollout.

Run `pnpm test:nft` for route/publication-gate regressions and
`pnpm exec node tests/nft-consent-database.mjs` for disposable PostgreSQL security
and atomicity checks (Docker with the `postgres:17` image required).

## Brand source assets

NFT previews use the supplied official vector mark. Rendered NFTs rasterize the
vector wordmark at output resolution above the portrait. The source black SVG
was recolored white; unlike the supplied white wordmark SVG, it contains paths
instead of an embedded bitmap. Existing minted artwork is not regenerated by
this visual change; normal reviewed updates use the new renderer.
