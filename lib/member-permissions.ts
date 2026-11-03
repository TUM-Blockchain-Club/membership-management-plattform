type MemberPermissions = { id: number; Role?: string | null }

export const canManageBoardTools = (
  member: MemberPermissions | null,
  hasSpecialAccess: boolean,
) => hasSpecialAccess || member?.Role?.trim() === 'Board Member'

// Preserve existing explicit NFT administrators alongside board access.
const NFT_ADMIN_MEMBER_IDS = new Set([0, 99, 107, 26, 126])

export const canManageNftRequests = (
  member: MemberPermissions | null,
  hasSpecialAccess: boolean,
) => canManageBoardTools(member, hasSpecialAccess) || Boolean(member && NFT_ADMIN_MEMBER_IDS.has(member.id))
