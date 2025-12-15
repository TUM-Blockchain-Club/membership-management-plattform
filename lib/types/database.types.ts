export type MemberRole = 'Core Member' | 'Ex-Core Member' | 'Board Member';

export type MemberStatus = 'Active' | 'Alumni' | 'Advisor' | 'Passive' | 'Kicked out' | 'Left';

export type Department = 
  | 'Industry'
  | 'Web3 Talents'
  | 'Legal & Finance'
  | 'External Relations'
  | 'Research'
  | 'Marketing'
  | 'IT&Dev';

export type MerchSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

export interface Member {
  id: string;
  user_id?: string;
  
  first_name: string;
  last_name: string;
  
  role: MemberRole;
  status: MemberStatus;
  department?: Department;
  
  current_project_task?: string;
  area_of_expertise?: string[];
  
  picture_url?: string;
  
  university?: string;
  degree?: string;
  semester_joined?: string;
  active_semesters?: number;
  
  phone?: string;
  private_email?: string;
  tbc_email?: string;
  
  linkedin_url?: string;
  telegram_username?: string;
  discord_username?: string;
  instagram_username?: string;
  twitter_username?: string;
  
  merch_size?: MerchSize;
  
  created_at?: string;
  updated_at?: string;
}

export interface Database {
  mmp: {
    Tables: {
      members: {
        Row: Member;
        Insert: Omit<Member, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Member, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}
