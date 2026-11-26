import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { YearbookHeader } from '@/app/dashboard/tabs/yearbook/YearbookHeader'
import { getYearbookViewer } from '@/lib/server/yearbook'

export default async function YearbookLayout({ children }: { children: ReactNode }) {
  const viewer = await getYearbookViewer()
  if (!viewer) redirect('/signin')

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <YearbookHeader />
      {children}
    </section>
  )
}
