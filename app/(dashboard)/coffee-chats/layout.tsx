import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { CoffeeChatsNavigation } from './CoffeeChatsNavigation'
import { getCoffeeChatViewer } from '@/lib/coffee-chats/viewer'

export default async function CoffeeChatsLayout({ children }: { children: ReactNode }) {
  const viewer = await getCoffeeChatViewer()
  if (!viewer) redirect('/signin')

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex max-w-3xl flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Coffee Chats
          </h2>
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
