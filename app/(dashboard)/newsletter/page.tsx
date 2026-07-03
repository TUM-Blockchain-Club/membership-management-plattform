'use client'

import { use } from 'react'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { NewsletterPage } from '@/app/dashboard/tabs/newsletter/NewsletterPage'

export default function Page() {
  const d = use(DashboardContext)!
  return (
    <NewsletterPage
      effectiveHasSpecialAccess={d.effectiveHasSpecialAccess}
    />
  )
}
