export type MemberRole = 'Core Member' | 'Ex-Core Member' | 'Board Member' | 'Guest';

export type MemberStatus = 'Active' | 'Honorary' | 'Alumni' | 'Advisor' | 'Passive' | 'Kicked out' | 'Left';

export type Department = 
  | 'Industry'
  | 'Web3 Talents'
  | 'Legal & Finance'
  | 'External Relations'
  | 'Research'
  | 'Marketing'
  | 'IT & Development'
  | 'IT&Dev';

export type MerchSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

export type MemberPicture =
  | string
  | {
      data?: number[]
    }
  | null

export interface Member {
  id: number;
  created_at: string;
  Name: string | null;
  Role: MemberRole | string | null;
  Status: MemberStatus | string | null;
  Department: string | null;
  'Project/Task': string | null;
  'Area of Expertise': string | null;
  Picture: MemberPicture;
  Uni: string | null;
  'Semester Joined': string | null;
  Degree: string | null;
  Phone: string | null;
  'Private Email': string | null;
  'TBC Email': string | null;
  Linkedin: string | null;
  Telegram: string | null;
  Discord: string | null;
  Instagram: string | null;
  Twitter: string | null;
  'Size Merch': MerchSize | string | null;
  Batch?: string | number | null;
  'Bachelor/Master'?: string | null;
  UUID?: string | null;
  degree_at_uni?: string | null;
  highlight?: string | null;
  nft_avatar?: string | null;
  nft_consent?: boolean | null;
  nickname?: string | null;
}

export interface NewsletterProject {
  id: string
  name: string
  subject: string | null
  from_name: string | null
  from_email: string | null
  to_address: string | null
  html: string | null
  gjs_data: Record<string, unknown> | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface NewsletterDelivery {
  id: string
  project_id: string | null
  delivery_type: 'test' | 'campaign'
  status: 'sent' | 'delivered' | 'failed'
  subject: string
  from_name: string | null
  from_email: string
  recipient: string
  mailgun_message_id: string | null
  mailgun_message: string | null
  last_event: string | null
  last_event_at: string | null
  event_summary: Record<string, number>
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface NewsletterDeliveryEvent {
  id: string
  delivery_id: string
  event: string
  recipient: string
  event_timestamp: string
  raw_payload: Record<string, unknown>
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      members_main: {
        Row: Member
        Insert: Omit<Member, 'id' | 'created_at'>
        Update: Partial<Omit<Member, 'id' | 'created_at'>>
        Relationships: []
      }
      newsletter_projects: {
        Row: NewsletterProject
        Insert: Partial<Pick<NewsletterProject, 'id' | 'created_at' | 'updated_at'>> &
          Pick<NewsletterProject, 'name'> &
          Partial<Omit<NewsletterProject, 'id' | 'name' | 'created_at' | 'updated_at'>>
        Update: Partial<Omit<NewsletterProject, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      newsletter_deliveries: {
        Row: NewsletterDelivery
        Insert: Partial<Pick<NewsletterDelivery, 'id' | 'created_at' | 'updated_at' | 'delivery_type' | 'status' | 'event_summary'>> &
          Pick<NewsletterDelivery, 'subject' | 'from_email' | 'recipient'> &
          Partial<Omit<NewsletterDelivery, 'id' | 'subject' | 'from_email' | 'recipient' | 'created_at' | 'updated_at'>>
        Update: Partial<Omit<NewsletterDelivery, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      newsletter_delivery_events: {
        Row: NewsletterDeliveryEvent
        Insert: Partial<Pick<NewsletterDeliveryEvent, 'id' | 'created_at' | 'raw_payload'>> &
          Pick<NewsletterDeliveryEvent, 'delivery_id' | 'event' | 'recipient' | 'event_timestamp'>
        Update: Partial<Omit<NewsletterDeliveryEvent, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_email_can_manage_newsletter: {
        Args: { check_email: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
