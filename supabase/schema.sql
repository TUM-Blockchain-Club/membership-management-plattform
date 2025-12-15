CREATE SCHEMA IF NOT EXISTS mmp;

CREATE TYPE mmp.member_role AS ENUM (
  'Core Member',
  'Ex-Core Member',
  'Board Member'
);

CREATE TYPE mmp.member_status AS ENUM (
  'Active',
  'Alumni',
  'Advisor',
  'Passive',
  'Kicked out',
  'Left'
);

CREATE TYPE mmp.department AS ENUM (
  'Industry',
  'Web3 Talents',
  'Legal & Finance',
  'External Relations',
  'Research',
  'Marketing',
  'IT&Dev'
);

CREATE TYPE mmp.merch_size AS ENUM (
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL'
);

CREATE TABLE mmp.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role mmp.member_role NOT NULL DEFAULT 'Core Member',
  status mmp.member_status NOT NULL DEFAULT 'Active',
  department mmp.department,
  current_project_task TEXT,
  area_of_expertise TEXT[],
  picture_url TEXT,
  university VARCHAR(200),
  degree VARCHAR(200),
  semester_joined VARCHAR(50),
  active_semesters INTEGER DEFAULT 0,
  phone VARCHAR(50),
  private_email VARCHAR(255),
  tbc_email VARCHAR(255) UNIQUE,
  linkedin_url TEXT,
  telegram_username VARCHAR(100),
  discord_username VARCHAR(100),
  instagram_username VARCHAR(100),
  twitter_username VARCHAR(100),
  merch_size mmp.merch_size,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_tbc_email CHECK (tbc_email ~* '^[A-Za-z0-9._%+-]+@tum-blockchain\.com$')
);

CREATE INDEX idx_members_user_id ON mmp.members(user_id);
CREATE INDEX idx_members_status ON mmp.members(status);
CREATE INDEX idx_members_department ON mmp.members(department);
CREATE INDEX idx_members_role ON mmp.members(role);
CREATE INDEX idx_members_tbc_email ON mmp.members(tbc_email);

ALTER TABLE mmp.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view all members"
  ON mmp.members
  FOR SELECT
  USING (true);

CREATE POLICY "Members can update own profile"
  ON mmp.members
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can insert members"
  ON mmp.members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mmp.members
      WHERE user_id = auth.uid()
      AND role = 'Board Member'
    )
  );

CREATE POLICY "Admins can delete members"
  ON mmp.members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM mmp.members
      WHERE user_id = auth.uid()
      AND role = 'Board Member'
    )
  );

CREATE OR REPLACE FUNCTION mmp.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON mmp.members
  FOR EACH ROW
  EXECUTE FUNCTION mmp.update_updated_at_column();

CREATE OR REPLACE FUNCTION mmp.get_member_by_user_id(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  first_name VARCHAR,
  last_name VARCHAR,
  role mmp.member_role,
  status mmp.member_status,
  department mmp.department,
  tbc_email VARCHAR,
  picture_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.first_name,
    m.last_name,
    m.role,
    m.status,
    m.department,
    m.tbc_email,
    m.picture_url
  FROM mmp.members m
  WHERE m.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mmp.get_active_members_by_department(p_department mmp.department)
RETURNS SETOF mmp.members AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM mmp.members
  WHERE department = p_department
  AND status = 'Active'
  ORDER BY first_name, last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

INSERT INTO storage.buckets (id, name, public)
VALUES ('mmp-member-photos', 'mmp-member-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access to Member Photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'mmp-member-photos');

CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'mmp-member-photos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update own photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'mmp-member-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'mmp-member-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

INSERT INTO mmp.members (
  first_name,
  last_name,
  role,
  status,
  department,
  tbc_email,
  university,
  degree,
  semester_joined,
  active_semesters
) VALUES
  ('John', 'Doe', 'Board Member', 'Active', 'IT&Dev', 'john.doe@tum-blockchain.com', 'TUM', 'Computer Science', 'WS2023', 2),
  ('Jane', 'Smith', 'Core Member', 'Active', 'Marketing', 'jane.smith@tum-blockchain.com', 'TUM', 'Business Administration', 'SS2024', 1);
