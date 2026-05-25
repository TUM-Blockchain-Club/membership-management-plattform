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
