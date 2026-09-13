'use client'
import { MailIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { memberSocialLink, SOCIAL_PLATFORMS } from '@/lib/memberSocials'
import type { DashboardMember } from './types'
import { SocialBrandIcon } from './SocialBrandIcon'
export function MemberSocialLinks({ member }: { member: DashboardMember }) {
  const email = member['TBC Email']?.trim()
  if (!email && !SOCIAL_PLATFORMS.some(platform => member[platform]?.trim())) return null
  return <div className="flex flex-wrap items-center gap-1" aria-label="Contact and social profiles">
    {email && <Button asChild variant="outline" size="icon-sm" title={`Email ${email}`}>
      <a href={`mailto:${encodeURIComponent(email)}`} aria-label={`Email ${member.Name || 'Member'}: ${email}`}>
        <MailIcon aria-hidden="true" />
      </a>
    </Button>}
    {SOCIAL_PLATFORMS.map(platform => {
      const raw = member[platform]?.trim()
      if (!raw) return null
      const href = memberSocialLink(platform, raw)
      const label = platform === 'Linkedin' ? 'LinkedIn' : platform === 'Twitter' ? 'X / Twitter' : platform
      const mark = <SocialBrandIcon platform={platform} />
      return href ? <Button key={platform} asChild variant="outline" size="icon-sm" title={label}>
        <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${member.Name || 'Member'} on ${label}`}>{mark}</a>
      </Button> : <Button key={platform} variant="outline" size="icon-sm" title={`Copy ${label} username`} aria-label={`Copy ${label} username`} onClick={async () => {
        try { await navigator.clipboard.writeText(raw); toast.success(`${label} copied`) } catch { toast.error('Could not copy username') }
      }}>{mark}</Button>
    })}
  </div>
}
