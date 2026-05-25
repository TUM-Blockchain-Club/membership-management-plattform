# Step 2: Replace Raw UI Primitives

## Goal

Replace hand-built buttons, inputs, selects, textareas, checkboxes, alerts, badges, cards, skeletons, avatars, and separators with shadcn/ui components.

## Priority Files

- `app/signin/page.tsx`
- `app/components/dashboard/DashboardHeader.tsx`
- `app/components/dashboard/EditableProfileForm.tsx`
- `app/components/dashboard/ProfileDisplay.tsx`
- `app/components/dashboard/MemberCard.tsx`
- `app/components/dashboard/StatCard.tsx`
- `app/components/dashboard/Breakdowns.tsx`
- `app/components/dashboard/Separators.tsx`
- `app/dashboard/DashboardFrame.tsx`
- `app/dashboard/DashboardLoading.tsx`
- `app/dashboard/tabs/members/MembersPage.tsx`
- `app/dashboard/tabs/NftRequestCard.tsx`
- `app/dashboard/tabs/nft-approvals/NftApprovalsPage.tsx`

## shadcn Rules to Recheck

- Use `Button` variants before custom color classes.
- Use `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter`.
- Use `Badge` for statuses and roles.
- Use `Alert` for success/error/info callouts.
- Use `Skeleton`, not custom `animate-pulse` placeholder boxes.
- Use `Avatar` with `AvatarFallback`.
- Use `Separator`, not hand-built border dividers.
- Prefer semantic tokens over raw color classes.

## Acceptance Criteria

- Raw primitive usage is meaningfully reduced.
- Existing behavior is preserved.
- `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build` pass.
