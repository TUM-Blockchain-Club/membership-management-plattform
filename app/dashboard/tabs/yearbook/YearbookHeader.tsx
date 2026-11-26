'use client'

import { use } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookHeartIcon, Settings2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { getDashboardTabForPathname } from '@/app/dashboard/lib/routes'
import { cn } from '@/lib/utils'

export function YearbookHeader() {
  const pathname = usePathname()
  const dashboard = use(DashboardContext)
  const isAdmin = getDashboardTabForPathname(pathname) === 'yearbook-admin'
  const items = [
    { href: '/yearbook', label: 'Yearbook', icon: BookHeartIcon, active: !isAdmin },
    ...(dashboard?.showYearbookAdminTab
      ? [{ href: '/yearbook/admin', label: 'Manage', icon: Settings2Icon, active: isAdmin }]
      : []),
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex max-w-3xl flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {isAdmin ? 'Yearbook Admin' : 'Yearbook'}
        </h2>
        <p className="text-sm text-muted-foreground sm:text-base">
          {isAdmin
            ? 'Open and close the yearbook, moderate messages and export everything for print.'
            : 'Sign each other’s yearbook: write messages about members, add photos and get your own page in print.'}
        </p>
      </div>
      {items.length > 1 && (
        <nav aria-label="Yearbook" className="flex flex-wrap gap-2">
          {items.map(({ href, label, icon: Icon, active }) => (
            <Button key={href} variant={active ? 'secondary' : 'ghost'} size="sm" asChild className={cn(!active && 'text-muted-foreground')}>
              <Link href={href} aria-current={active ? 'page' : undefined}>
                <Icon data-icon="inline-start" />
                {label}
              </Link>
            </Button>
          ))}
        </nav>
      )}
    </div>
  )
}
