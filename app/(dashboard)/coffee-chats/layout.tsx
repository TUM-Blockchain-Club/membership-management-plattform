import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { CoffeeChatsHeader } from '@/app/dashboard/tabs/coffee-chats/CoffeeChatsHeader'
import { coffeeChatsDemoEnabled } from '@/lib/coffee-chats'
import { getCoffeeChatViewer } from '@/lib/server/coffeeChats'

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
      <CoffeeChatsHeader demoMode={coffeeChatsDemoEnabled} />

      {children}
    </section>
  )
}
