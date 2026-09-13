'use client'
import { LinkIcon, CameraIcon, SendIcon, MessageCircleIcon, CopyIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { memberSocialLink, SOCIAL_PLATFORMS } from '@/lib/memberSocials'
import type { DashboardMember } from './types'
const icons = { Linkedin: LinkIcon, Discord: MessageCircleIcon, Telegram: SendIcon, Instagram: CameraIcon, Twitter: CopyIcon }
export function MemberSocialLinks({ member }: { member: DashboardMember }) {
  if (!SOCIAL_PLATFORMS.some(platform => member[platform]?.trim())) return null
  return <div className="flex flex-wrap items-center gap-1" aria-label="Social profiles">
    {SOCIAL_PLATFORMS.map(platform => {
      const raw = member[platform]?.trim()
      if (!raw) return null
      const href = memberSocialLink(platform, raw)
      const Icon = icons[platform]
      const label = platform === 'Linkedin' ? 'LinkedIn' : platform === 'Twitter' ? 'X / Twitter' : platform
      const mark = platform === 'Linkedin' ? <span aria-hidden="true" className="font-bold">in</span> : platform === 'Twitter' ? <span aria-hidden="true" className="font-semibold">𝕏</span> : <Icon aria-hidden="true" />
      return href ? <Button key={platform} asChild variant="outline" size="icon-sm" title={label}>
        <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${member.Name || 'Member'} on ${label}`}>{mark}</a>
      </Button> : <Button key={platform} variant="outline" size="icon-sm" title={`Copy ${label} username`} aria-label={`Copy ${label} username`} onClick={async () => {
        try { await navigator.clipboard.writeText(raw); toast.success(`${label} copied`) } catch { toast.error('Could not copy username') }
      }}>{mark}</Button>
    })}
  </div>
}
