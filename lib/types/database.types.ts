export type MemberRole = 'Core Member' | 'Ex-Core Member' | 'Board Member';

export type MemberStatus = 'Active' | 'Alumni' | 'Advisor' | 'Passive' | 'Kicked out' | 'Left';

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

// Updated to match actual members_main table structure
export interface Member {
  id: number;
  created_at: string;
  Name: string;
  Role: string;
  Status: string;
  Department: string | null;
  'Project/Task': string | null;
  'Area of Expertise': string | null;
  Picture: any;  // Buffer/URL
  'Active Semesters': number | null;
  Uni: string | null;
  'Semester Joined': string | null;
  Degree: string | null;
  Phone: string | null;
  'Private Email': string | null;
  'TBC Email': string;
  Linkedin: string | null;
  Telegram: string | null;
  Discord: string | null;
  Instagram: string | null;
  Twitter: string | null;
  'Size Merch': string | null;
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
