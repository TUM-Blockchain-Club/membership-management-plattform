import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { YearbookHeader } from '@/app/dashboard/tabs/yearbook/YearbookHeader'
import { getRequestMember } from '@/lib/server/requestMember'

export default async function YearbookLayout({ children }: { children: ReactNode }) {
  // Only the sign-in check lives here: errors in this layout would bypass the
  // yearbook error boundary, so data loading stays in the pages.
  const { member } = await getRequestMember()
  if (!member) redirect('/signin')

  return (
    <section className="flex w-full flex-col gap-6">
      <YearbookHeader />
      {children}
    </section>
  )
}
