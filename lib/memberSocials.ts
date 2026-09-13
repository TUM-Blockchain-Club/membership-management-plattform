export const SOCIAL_PLATFORMS = ['Linkedin', 'Discord', 'Telegram', 'Instagram', 'Twitter'] as const
export type SocialPlatform = typeof SOCIAL_PLATFORMS[number]

export function memberSocialLink(platform: SocialPlatform, raw: string | null | undefined): string | null {
  const value = raw?.trim()
  if (!value) return null
  const hosts: Record<SocialPlatform, string[]> = {
    Linkedin: ['linkedin.com'], Discord: ['discord.com', 'discord.gg'], Telegram: ['t.me', 'telegram.me'], Instagram: ['instagram.com'], Twitter: ['twitter.com', 'x.com'],
  }
  if (/^(https?:\/\/|www\.)/i.test(value) || hosts[platform].some(host => value.startsWith(host + '/'))) {
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
      if (url.username || url.password || !hosts[platform].some(host => url.hostname === host || url.hostname === `www.${host}`)) return null
      url.protocol = 'https:'
      return url.href
    } catch { return null }
  }
  const handle = value.replace(/^@/, '')
  if (platform === 'Discord') return /^\d{17,20}$/.test(handle) ? `https://discord.com/users/${handle}` : null
  if (!/^[a-zA-Z0-9_.-]+$/.test(handle)) return null
  const prefix = { Linkedin: 'https://www.linkedin.com/in/', Telegram: 'https://t.me/', Instagram: 'https://www.instagram.com/', Twitter: 'https://x.com/' }
  return prefix[platform] + encodeURIComponent(handle)
}
