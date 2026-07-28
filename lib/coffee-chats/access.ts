export type CoffeeChatAdminViewInput = {
  forceMemberView: boolean
  hasSpecialAccess: boolean
  isBoardMember: boolean
}

export function canShowCoffeeChatAdmin(input: CoffeeChatAdminViewInput): boolean {
  if (input.forceMemberView) return false
  return input.hasSpecialAccess || input.isBoardMember
}
