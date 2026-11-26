import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { YearbookPage } from '@/app/dashboard/tabs/yearbook/YearbookPage'
import { loadYearbookHome } from '@/lib/server/yearbook'

export const metadata: Metadata = {
  title: 'Yearbook – TBC Member Portal',
  description: 'Write yearbook messages for TUM Blockchain Club members',
}

export default async function Page() {
  const data = await loadYearbookHome()
  if (!data) redirect('/signin')

  return <YearbookPage data={data} />
}
