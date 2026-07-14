'use client'

import { use } from 'react'
import { DashboardContext } from '@/app/dashboard/DashboardContext'
import { EmailSignaturePage } from '@/app/dashboard/tabs/email-signature/EmailSignaturePage'

export default function Page() {
  const dashboard = use(DashboardContext)!
  return <EmailSignaturePage member={dashboard.member} />
}
