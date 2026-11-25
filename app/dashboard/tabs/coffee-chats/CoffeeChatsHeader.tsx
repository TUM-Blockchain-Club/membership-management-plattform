'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ImagesIcon, Settings2Icon, SparklesIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getDashboardTabForPathname } from '@/app/dashboard/lib/routes'
import { cn } from '@/lib/utils'

const MEMBER_ITEMS = [
  { href: '/coffee-chats', label: 'Current round', icon: SparklesIcon },
  { href: '/coffee-chats/setup', label: 'Preferences', icon: Settings2Icon },
  { href: '/coffee-chats/gallery', label: 'Gallery', icon: ImagesIcon },
] as const

export function CoffeeChatsHeader({ demoMode }: { demoMode: boolean }) {
  const pathname = usePathname()
  const isAdmin = getDashboardTabForPathname(pathname) === 'coffee-chats-admin'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-w-3xl flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {isAdmin ? 'Coffee Chats Admin' : 'Coffee Chats'}
        </h2>
        {demoMode && <p className="text-xs font-medium text-amber-400">Demo mode · fake review data</p>}
        <p className="text-sm text-muted-foreground sm:text-base">
          {isAdmin ? 'Manage rounds, pairings, and administrators.' : 'Meet one member each month over coffee and keep the club connected.'}
        </p>
      </div>
      {!isAdmin && (
        <nav aria-label="Coffee Chats" className="flex flex-wrap gap-2">
          {MEMBER_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/coffee-chats'
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
      )}
    </div>
  )
}
