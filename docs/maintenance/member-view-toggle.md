# Member View Toggle

## Current Behavior

- The `Normal Member View` toggle lives in the global dashboard header.
- It is available for members with special access or dashboard-admin role privileges.
- When enabled, `forceMemberView` disables effective special access and board-member admin behavior in the dashboard controller.
- The NFT approvals tab is hidden while normal member view is enabled.
- If the user is already on `nft-approvals` when normal member view is enabled, the dashboard controller redirects to `nft-status` because approvals are no longer accessible in that mode.

## Change

- Removed the forced profile navigation from the toggle click handler.
- The toggle now applies globally without moving the user back to the Profile page.
