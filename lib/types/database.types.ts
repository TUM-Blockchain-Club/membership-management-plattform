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

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

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
  cc_interests?: string[] | null;
  cc_study_programme?: string | null;
  cc_already_know?: number[] | null;
  cc_favourite_coffee?: string | null;
  cc_favourite_spots?: string[] | null;
  cc_fun_fact?: string | null;
  cc_active?: boolean | null;
}

export interface CoffeeChatRound {
  id: string
  month: string
  status: 'open' | 'paired' | 'closed'
  signup_deadline: string | null
  meet_deadline: string | null
  created_at: string
}

export interface CoffeeChatAdmin {
  member_id: number
  assigned_by: number | null
  created_at: string
}

export interface CoffeeChatSignup {
  id: string
  round_id: string
  member_id: number
  signed_up_at: string
}

export interface CoffeeChatPair {
  id: string
  round_id: string
  person1_id: number
  person2_id: number
  person3_id: number | null
  icebreaker_q1?: string | null
  icebreaker_q2?: string | null
  icebreaker_q3?: string | null
  status: 'pending' | 'met' | 'skipped'
  selfie_path: string | null
  drive_url?: string | null
  date_met: string | null
  person1_signed_off: boolean
  person2_signed_off: boolean
  person3_signed_off: boolean
  rating?: number | null
  highlight_note: string | null
  created_at: string
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
        Row: Member & Record<string, unknown>
        Insert: Omit<Member, 'id' | 'created_at'>
        Update: Partial<Omit<Member, 'id' | 'created_at'>>
        Relationships: []
      }
      cc_admins: {
        Row: CoffeeChatAdmin & Record<string, unknown>
        Insert: CoffeeChatAdmin
        Update: Partial<CoffeeChatAdmin>
        Relationships: [
          {
            foreignKeyName: 'cc_admins_member_id_fkey'
            columns: ['member_id']
            isOneToOne: true
            referencedRelation: 'members_main'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cc_admins_assigned_by_fkey'
            columns: ['assigned_by']
            isOneToOne: false
            referencedRelation: 'members_main'
            referencedColumns: ['id']
          },
        ]
      }
      cc_rounds: {
        Row: CoffeeChatRound & Record<string, unknown>
        Insert: Pick<CoffeeChatRound, 'month'> &
          Partial<Omit<CoffeeChatRound, 'month'>>
        Update: Partial<Omit<CoffeeChatRound, 'id' | 'created_at'>>
        Relationships: []
      }
      cc_signups: {
        Row: CoffeeChatSignup & Record<string, unknown>
        Insert: Pick<CoffeeChatSignup, 'round_id' | 'member_id'> &
          Partial<Omit<CoffeeChatSignup, 'round_id' | 'member_id'>>
        Update: Partial<Omit<CoffeeChatSignup, 'id' | 'signed_up_at'>>
        Relationships: [
          {
            foreignKeyName: 'cc_signups_round_id_fkey'
            columns: ['round_id']
            isOneToOne: false
            referencedRelation: 'cc_rounds'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cc_signups_member_id_fkey'
            columns: ['member_id']
            isOneToOne: false
            referencedRelation: 'members_main'
            referencedColumns: ['id']
          },
        ]
      }
      cc_pairs: {
        Row: CoffeeChatPair & Record<string, unknown>
        Insert: Pick<CoffeeChatPair, 'round_id' | 'person1_id' | 'person2_id'> &
          Partial<Omit<CoffeeChatPair, 'round_id' | 'person1_id' | 'person2_id'>>
        Update: Partial<Omit<CoffeeChatPair, 'id' | 'round_id' | 'created_at'>>
        Relationships: [
          {
            foreignKeyName: 'cc_pairs_round_id_fkey'
            columns: ['round_id']
            isOneToOne: false
            referencedRelation: 'cc_rounds'
            referencedColumns: ['id']
          },
        ]
      }
      newsletter_projects: {
        Row: NewsletterProject & Record<string, unknown>
        Insert: Partial<Pick<NewsletterProject, 'id' | 'created_at' | 'updated_at'>> &
          Pick<NewsletterProject, 'name'> &
          Partial<Omit<NewsletterProject, 'id' | 'name' | 'created_at' | 'updated_at'>>
        Update: Partial<Omit<NewsletterProject, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      newsletter_deliveries: {
        Row: NewsletterDelivery & Record<string, unknown>
        Insert: Partial<Pick<NewsletterDelivery, 'id' | 'created_at' | 'updated_at' | 'delivery_type' | 'status' | 'event_summary'>> &
          Pick<NewsletterDelivery, 'subject' | 'from_email' | 'recipient'> &
          Partial<Omit<NewsletterDelivery, 'id' | 'subject' | 'from_email' | 'recipient' | 'created_at' | 'updated_at'>>
        Update: Partial<Omit<NewsletterDelivery, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      newsletter_delivery_events: {
        Row: NewsletterDeliveryEvent & Record<string, unknown>
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
      check_email_can_manage_coffee_chats: {
        Args: { check_email: string }
        Returns: boolean
      }
      check_email_can_manage_newsletter: {
        Args: { check_email: string }
        Returns: boolean
      }
      commit_coffee_chat_pairing: {
        Args: { target_round_id: string; pair_rows: Json }
        Returns: number
      }
      has_special_access: {
        Args: never
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
