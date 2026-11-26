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
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <YearbookHeader />
      {children}
    </section>
  )
}
