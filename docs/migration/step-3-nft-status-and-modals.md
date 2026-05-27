# Step 3: NFT Status Page and Modal Migration

## Goal

Refactor the large NFT status page and modal implementations into smaller composed components using shadcn/ui.

## Priority Files

- `app/dashboard/tabs/nft-status/NftStatusPage.tsx`
- `app/dashboard/tabs/nft-status/useNftStatus.ts`
- `app/components/dashboard/MemberEditorModal.tsx`
- `app/dashboard/tabs/RejectModal.tsx`
- `app/dashboard/tabs/MintPreviewModal.tsx`

## Proposed Component Split

- `NftStatusHero`
- `NftPreviewCard`
- `NftRequestSummary`
- `NftApplicationForm`
- `NftGenerationKit`
- `NftConsentField`
- `NftRequestActions`

## shadcn Targets

- `Dialog` for all modals.
- `AlertDialog` if destructive confirmations are separated later.
- `Card` for summary and form sections.
- `Field`, `FieldGroup`, `Input`, `Textarea`, `Checkbox` for forms.
- `Alert` for status/error/copy feedback.
- `Button` with composed spinner state.

## Acceptance Criteria

- NFT status behavior is unchanged.
- Modal accessibility improves through shadcn Dialog titles and composition.
- `NftStatusPage.tsx` is substantially shorter and easier to scan.
- `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build` pass.

## Execution Notes

- Migrated `MemberEditorModal`, `RejectModal`, and `MintPreviewModal` to shadcn `Dialog` composition with explicit titles/descriptions and existing submit/cancel behavior preserved.
- Kept modal loading actions composed from shadcn `Button` and `Spinner`.
- Reduced `NftStatusPage.tsx` to a thin container that calls `useNftStatus` and renders the status hero plus request panel.
- Added `app/dashboard/tabs/nft-status/components/` for the Step 3 UI split:
  - `nft-status-hero.tsx` owns the hero copy and NFT preview frame.
  - `nft-request-panel.tsx` owns the panel shell, status alerts, and loading skeleton.
  - `nft-request-summary.tsx` owns the submitted/minted request summary.
  - `nft-application-form.tsx` owns the application form, generation kit, consent field, and submit state.
  - `nft-status-actions.tsx` owns reusable on-chain and delete actions.
- Replaced native Step 3 target primitives with shadcn `Button`, `Input`, `Textarea`, `Checkbox`, `Field`, `Card`, `Alert`, `Skeleton`, `Badge`, and `Spinner`.
- Added `NftStatusController` as the exported return type for `useNftStatus`, so the split components can share the hook contract without duplicating state types.

## Verification

- `rg -n "<button|<input|<select|<textarea|animate-pulse|space-y-|space-x-|role=\"dialog|aria-modal" app/dashboard/tabs/nft-status app/components/dashboard/MemberEditorModal.tsx app/dashboard/tabs/RejectModal.tsx app/dashboard/tabs/MintPreviewModal.tsx` returned no matches.
- `pnpm exec tsc --noEmit` passed.
- `pnpm lint` passed.
- `pnpm build` passed.
