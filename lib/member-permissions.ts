type MemberPermissions = { id: number; Role?: string | null }

export const canManageBoardTools = (
  member: MemberPermissions | null,
  hasSpecialAccess: boolean,
) => hasSpecialAccess || member?.Role?.trim() === 'Board Member'

// Explicit NFT administrators are central `nfts` admin assignments (the `nft_admins` view).
export const canManageNftRequests = (
  member: MemberPermissions | null,
  hasSpecialAccess: boolean,
  hasNftAssignment: boolean,
) => canManageBoardTools(member, hasSpecialAccess) || Boolean(member && hasNftAssignment)
