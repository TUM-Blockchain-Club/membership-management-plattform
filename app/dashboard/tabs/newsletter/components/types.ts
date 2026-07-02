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
