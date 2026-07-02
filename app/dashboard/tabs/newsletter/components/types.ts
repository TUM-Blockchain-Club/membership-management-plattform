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

export type MailingList = {
  address: string
  name: string
  description: string
  membersCount: number
}

export type NewsletterAsset = {
  name: string
  path: string
  src: string
  size?: number
  updatedAt?: string | null
}

export type NewsletterDelivery = {
  id: string
  project_id: string | null
  delivery_type: 'test' | 'campaign'
  status: 'sent' | 'delivered' | 'failed'
  subject: string
  recipient: string
  mailgun_message_id: string | null
  mailgun_message: string | null
  last_event: string | null
  last_event_at: string | null
  event_summary: Record<string, number>
  created_at: string
  updated_at: string
}
