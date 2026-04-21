export const isLocalDevelopmentHost = (hostname: string | null | undefined) => {
  if (!hostname) return false

  const normalizedHostname = hostname.trim().toLowerCase()
  return normalizedHostname === 'localhost' || normalizedHostname === '127.0.0.1'
}

export const isLocalDevBypassEnabled = (hostname: string | null | undefined) =>
  process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true' && isLocalDevelopmentHost(hostname)
