import type { Metadata } from 'next'
import { MemberHomePage } from '@/app/dashboard/tabs/home/MemberHomePage'
import { loadCoffeeChatHome } from '@/lib/server/coffeeChats'

export const metadata: Metadata = {
  title: 'Home – TBC Member Portal',
  description: 'Your TUM Blockchain Club member overview',
}

export default async function HomePage() {
  const coffeeChatData = await loadCoffeeChatHome()

  return (
    <MemberHomePage
      coffeeChatData={coffeeChatData}
      currentTime={new Date().toISOString()}
    />
  )
}
