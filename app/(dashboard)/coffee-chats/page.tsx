import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { CoffeeChatsPage } from '@/app/dashboard/tabs/coffee-chats/CoffeeChatsPage'
import { coffeeChatsDemoEnabled } from '@/lib/coffee-chats'
import { loadCoffeeChatHome } from '@/lib/server/coffeeChats'

export const metadata: Metadata = {
  title: 'Coffee Chats – TBC Member Portal',
  description: 'Monthly coffee chat matching for TUM Blockchain Club members',
}

export default async function Page() {
  const data = await loadCoffeeChatHome()
  if (!data) redirect('/signin')

  return <CoffeeChatsPage initialData={data} demoMode={coffeeChatsDemoEnabled} />
}
