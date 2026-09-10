'use client'

import { CoffeeChatCurrentRound } from './CoffeeChatCurrentRound'
import type { CoffeeChatHomeData } from '@/lib/coffee-chats'

export function CoffeeChatsPage({
  initialData,
  demoMode = false,
}: {
  initialData: CoffeeChatHomeData
  demoMode?: boolean
}) {
  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      <CoffeeChatCurrentRound initialData={initialData} demoMode={demoMode} />
    </div>
  )
}
