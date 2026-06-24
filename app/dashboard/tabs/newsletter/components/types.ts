export type NewsletterProject = {
  id: string
  name: string
  subject: string | null
  from_name: string | null
  from_email: string | null
  to_address: string | null
  html: string | null
  gjs_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type CompatIssue = {
  id: string
  level: 'high' | 'medium' | 'low'
  icon: string
  title: string
  desc: string
  invert?: boolean
  fix?: string
}

export type LogEntry = {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  timestamp: number
}

export type Asset = {
  name: string
  src: string
}

export type MailingList = {
  address: string
  name: string
  description: string
  membersCount: number
}

export type DeliveryEvent = {
  event: string
  recipient: string
  timestamp: number
}
