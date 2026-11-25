export const ADMIN_SCOPES = [
  { key: 'coffee_chats', label: 'Coffee Chats' },
  { key: 'nfts', label: 'NFTs' },
  { key: 'grants', label: 'Event Grants' },
  { key: 'newsletter', label: 'Mail' },
] as const
export type AdminScope = typeof ADMIN_SCOPES[number]['key']
export type AdminAccessMember = { id: number; Name: string | null; Department: string | null; Role: string | null; Status: string | null }
export type AdminAssignment = { member_id: number; scope: AdminScope }
export type AdminAccessAudit = { id: number; member_id: number; scope: AdminScope; action: 'granted' | 'revoked' | 'migrated'; actor_member_id: number | null; created_at: string }
export type AdminAccessData = { members: AdminAccessMember[]; assignments: AdminAssignment[]; audit: AdminAccessAudit[] }
export function isAdminAccessChange(value: unknown): value is { memberId: number; scope: AdminScope; enabled: boolean } {
  if (!value || typeof value !== 'object') return false
  const payload = value as Record<string, unknown>
  return Number.isSafeInteger(payload.memberId) && Number(payload.memberId) >= 0 &&
    ADMIN_SCOPES.some(scope => scope.key === payload.scope) && typeof payload.enabled === 'boolean'
}
