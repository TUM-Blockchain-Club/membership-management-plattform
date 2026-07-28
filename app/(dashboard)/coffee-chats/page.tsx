import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CoffeeChatCurrentRound } from './CoffeeChatCurrentRound'
import { loadCoffeeChatHome } from '@/lib/coffee-chats/home'

export const metadata: Metadata = {
  title: 'Coffee Chats – TBC Member Portal',
  description: 'Monthly coffee chat matching for TUM Blockchain Club members',
}

export default async function CoffeeChatsPage() {
  const data = await loadCoffeeChatHome()
  if (!data) redirect('/signin')

  return <CoffeeChatCurrentRound initialData={data} />
}
