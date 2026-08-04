# Solana Membership NFTs

## Decision

The membership platform issues one mutable Metaplex Core asset per approved
member. The implementation is independent from other credential projects.

- New assets are created on Solana, starting on devnet.
- The club wallet initially owns every asset.
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
- **Club custody**: The shared club wallet currently owns the asset.
- **Claim**: A board-approved transfer from club custody to a member wallet.
- **Recovery**: A board-approved transfer from a previous member wallet to a new one.
- **Active**: The member currently participates in the club.
- **Alumni**: The member completed their club time and keeps the asset.
- **Revoked**: The board burns the asset and removes hosted personal media.
- **Reconciliation**: Comparison of stored owner/URI data with the Solana account.

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

1. Apply `supabase/nft_requests.sql` to the platform Supabase project.
2. Configure the signer, RPC, `CRON_SECRET`, and existing Supabase variables locally.
3. Fund the signer with devnet SOL.
4. Run `pnpm solana:create-collection` once and save the printed collection address.
5. Set `SOLANA_COLLECTION_ADDRESS` locally and in the Vercel preview environment.
6. Test mint, profile update, alumni update, claim/recovery, burn, and reconciliation.
7. Repeat with separate mainnet authority/configuration only after devnet acceptance.

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
