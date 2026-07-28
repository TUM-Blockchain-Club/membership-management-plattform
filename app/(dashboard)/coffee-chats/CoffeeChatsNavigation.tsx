'use client'

import Link from 'next/link'
import { useContext } from 'react'
import { usePathname } from 'next/navigation'
import { ImagesIcon, Settings2Icon, ShieldIcon, SparklesIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { cn } from '@/lib/utils'

const MEMBER_ITEMS = [
  { href: '/coffee-chats', label: 'Current round', icon: SparklesIcon },
  { href: '/coffee-chats/setup', label: 'Preferences', icon: Settings2Icon },
  { href: '/coffee-chats/gallery', label: 'Gallery', icon: ImagesIcon },
] as const

export function CoffeeChatsNavigation() {
  const pathname = usePathname()
  const dashboard = useContext(DashboardContext)
  const canManageCoffeeChats = Boolean(
    dashboard?.effectiveHasSpecialAccess || dashboard?.member?.Role === 'Board Member',
  )
  const items = canManageCoffeeChats
    ? [...MEMBER_ITEMS, { href: '/coffee-chats/admin', label: 'Admin', icon: ShieldIcon }]
    : MEMBER_ITEMS

  return (
    <nav aria-label="Coffee Chats" className="flex flex-wrap gap-2">
      {items.map(({ href, label, icon: Icon }) => {
        const isActive = href === '/coffee-chats'
          ? pathname === href || pathname === '/coffee-chats/join' || pathname === '/coffee-chats/my-match'
          : pathname === href

        return (
          <Button
            key={href}
            variant={isActive ? 'secondary' : 'ghost'}
            size="sm"
            asChild
            className={cn(!isActive && 'text-muted-foreground')}
          >
            <Link href={href} aria-current={isActive ? 'page' : undefined}>
              <Icon data-icon="inline-start" />
              {label}
            </Link>
          </Button>
        )
      })}
    </nav>
  )
}

