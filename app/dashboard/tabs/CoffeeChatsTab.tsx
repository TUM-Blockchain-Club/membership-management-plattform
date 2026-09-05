import type { CoffeeChatHomeData } from '@/lib/coffee-chats'
import { CoffeeChatsPage } from './coffee-chats/CoffeeChatsPage'

export function CoffeeChatsTab({
  initialData,
  demoMode = false,
}: {
  initialData: CoffeeChatHomeData
  demoMode?: boolean
}) {
  return <CoffeeChatsPage initialData={initialData} demoMode={demoMode} />
}
