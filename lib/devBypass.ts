export const isLocalDevelopmentHost = (hostname: string | null | undefined) => {
  if (!hostname) return false

  const normalizedHostname = hostname.trim().toLowerCase()
  return normalizedHostname === 'localhost' || normalizedHostname === '127.0.0.1'
}

const isEnabled = (value: string | undefined) => value?.trim().toLowerCase() === 'true'

export const isLocalDevBypassEnabled = (hostname: string | null | undefined) =>
  (isEnabled(process.env.DEV_AUTH_BYPASS) || isEnabled(process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS)) &&
  isLocalDevelopmentHost(hostname)

export const getLocalDevBypassMemberId = () => {
  const rawMemberId = process.env.DEV_AUTH_BYPASS_MEMBER_ID?.trim() || '0'
  const memberId = Number(rawMemberId)

  return Number.isInteger(memberId) && memberId >= 0 ? memberId : 0
}

export const hasLocalDevBypassSpecialAccess = () =>
  isEnabled(process.env.DEV_AUTH_BYPASS_SPECIAL_ACCESS)
