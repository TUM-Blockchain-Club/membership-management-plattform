/** Preserve local deep links without accepting external redirect targets. */
export function safeAuthRedirect(value: string | null | undefined): string {
  if (!value?.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return '/home'
  const base = new URL('https://local.invalid')
  try {
    const url = new URL(value, base)
    return url.origin === base.origin ? `${url.pathname}${url.search}${url.hash}` : '/home'
  } catch {
    return '/home'
  }
}
