export function safeGrantUrl(raw: unknown): string | null {
  if (raw == null || raw === '') return null
  if (typeof raw !== 'string') throw new Error('Invalid grant application link.')
  const value = raw.trim()
  if (!value) return null
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Grant links must use HTTP or HTTPS.')
  return url.href
}
