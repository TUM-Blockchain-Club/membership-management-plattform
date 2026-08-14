import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { CoffeeChatsNavigation } from './CoffeeChatsNavigation'
import { getCoffeeChatViewer } from '@/lib/coffee-chats/viewer'
import { coffeeChatsDemoEnabled } from '@/lib/coffee-chats/demo'

export default async function CoffeeChatsLayout({ children }: { children: ReactNode }) {
  if (!coffeeChatsDemoEnabled) {
    const viewer = await getCoffeeChatViewer()
    if (!viewer) redirect('/signin')
  }

  return (
    <section
      className="mx-auto flex w-full max-w-5xl flex-col gap-6"
      data-coffee-chats-demo={coffeeChatsDemoEnabled ? 'true' : 'false'}
    >
      <div className="flex flex-col gap-4">
        <div className="flex max-w-3xl flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Coffee Chats
          </h2>
          {coffeeChatsDemoEnabled && (
            <p className="text-xs font-medium text-amber-400">Demo mode · fake review data</p>
          )}
          <p className="text-sm text-muted-foreground sm:text-base">
            Meet one member each month, get useful conversation starters, and keep the club connected.
          </p>
        </div>
        <CoffeeChatsNavigation />
      </div>

      {children}
    </section>
  )
}
