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

export interface Database {
  public: {
    Tables: {
      members_main: {
        Row: Member
        Insert: Omit<Member, 'id' | 'created_at'>
        Update: Partial<Omit<Member, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
