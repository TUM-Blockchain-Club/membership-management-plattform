import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { YearbookPage } from '@/app/dashboard/tabs/yearbook/YearbookPage'
import { YearbookUnavailable } from '@/app/dashboard/tabs/yearbook/YearbookUnavailable'
import { loadYearbookHome, YearbookSetupError } from '@/lib/server/yearbook'

export const metadata: Metadata = {
  title: 'Yearbook – TBC Member Portal',
  description: 'Write yearbook messages for TUM Blockchain Club members',
}

export default async function Page() {
  let data
  try {
    data = await loadYearbookHome()
  } catch (error) {
    if (error instanceof YearbookSetupError) return <YearbookUnavailable message={error.message} />
    throw error
  }
  if (!data) redirect('/signin')

  return <YearbookPage data={data} />
}
