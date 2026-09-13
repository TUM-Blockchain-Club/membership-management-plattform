import type { Metadata } from 'next'
import { MemberHomePage } from '@/app/dashboard/tabs/home/MemberHomePage'
import { loadHomeEvents } from '@/lib/server/dashboardData'
import { loadCoffeeChatHome } from '@/lib/server/coffeeChats'

export const metadata: Metadata = {
  title: 'Home – TBC Member Portal',
  description: 'Your TUM Blockchain Club member overview',
}

export default async function HomePage() {
  const [coffeeChatData, upcomingEvents] = await Promise.all([loadCoffeeChatHome(), loadHomeEvents()])

  return (
    <MemberHomePage
      coffeeChatData={coffeeChatData}
      upcomingEvents={upcomingEvents}
    />
  )
}
