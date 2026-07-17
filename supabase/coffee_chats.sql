-- Coffee Chats schema.
--
-- Extends members_main with coffee-chat profile columns and adds
-- round / signup / pair tables for the monthly coffee-chat programme.
--
-- Adapted from the standalone tbc_coffechats app.
-- Uses members_main.id (bigint) and current_member_id() RLS helper,
-- matching the convention established in event_interest.sql.
--
-- Apply this file to the live Supabase project before deploying the
-- /coffee-chats routes.  After applying run:
--   pnpm exec tsc --noEmit && pnpm lint && pnpm build

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend members_main with coffee-chat profile columns
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.members_main ADD COLUMN IF NOT EXISTS cc_interests      text[];
ALTER TABLE public.members_main ADD COLUMN IF NOT EXISTS cc_study_programme text;
ALTER TABLE public.members_main ADD COLUMN IF NOT EXISTS cc_already_know   bigint[];
ALTER TABLE public.members_main ADD COLUMN IF NOT EXISTS cc_favourite_coffee text;
ALTER TABLE public.members_main ADD COLUMN IF NOT EXISTS cc_favourite_spots text[];
ALTER TABLE public.members_main ADD COLUMN IF NOT EXISTS cc_fun_fact        text;
ALTER TABLE public.members_main ADD COLUMN IF NOT EXISTS cc_active          boolean DEFAULT false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. cc_rounds — one row per monthly coffee-chat cycle
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cc_rounds (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  month           text        NOT NULL,
  status          text        CHECK (status IN ('open', 'paired', 'closed')) DEFAULT 'open',
  signup_deadline timestamptz,
  meet_deadline   timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cc_rounds_status_idx ON public.cc_rounds (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. cc_signups — who opted in for a given round
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cc_signups (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id     uuid        REFERENCES public.cc_rounds(id) ON DELETE CASCADE,
  member_id    bigint      NOT NULL REFERENCES public.members_main(id) ON DELETE CASCADE,
  signed_up_at timestamptz DEFAULT now(),
  UNIQUE (round_id, member_id)
);

CREATE INDEX IF NOT EXISTS cc_signups_round_id_idx  ON public.cc_signups (round_id);
CREATE INDEX IF NOT EXISTS cc_signups_member_id_idx ON public.cc_signups (member_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. cc_pairs — matched pairs/trios for a round
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cc_pairs (
  id                   uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id             uuid    REFERENCES public.cc_rounds(id) ON DELETE CASCADE,
  person1_id           bigint  REFERENCES public.members_main(id),
  person2_id           bigint  REFERENCES public.members_main(id),
  person3_id           bigint  REFERENCES public.members_main(id),
  icebreaker_q1        text,
  icebreaker_q2        text,
  icebreaker_q3        text,
  status               text    CHECK (status IN ('pending', 'met', 'skipped')) DEFAULT 'pending',
  selfie_url           text,
  drive_url            text,
  date_met             date,
  person1_signed_off   boolean DEFAULT false,
  person2_signed_off   boolean DEFAULT false,
  person3_signed_off   boolean DEFAULT false,
  rating               int     CHECK (rating BETWEEN 1 AND 5),
  highlight_note       text,
  created_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cc_pairs_round_id_idx   ON public.cc_pairs (round_id);
CREATE INDEX IF NOT EXISTS cc_pairs_person1_id_idx ON public.cc_pairs (person1_id);
CREATE INDEX IF NOT EXISTS cc_pairs_person2_id_idx ON public.cc_pairs (person2_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.cc_rounds  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cc_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cc_pairs   ENABLE ROW LEVEL SECURITY;

-- cc_rounds: any authenticated member can read; only admins can write
DROP POLICY IF EXISTS "cc authenticated read rounds" ON public.cc_rounds;
CREATE POLICY "cc authenticated read rounds"
  ON public.cc_rounds FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "cc admin manage rounds" ON public.cc_rounds;
CREATE POLICY "cc admin manage rounds"
  ON public.cc_rounds FOR ALL TO authenticated
  USING (public.has_special_access())
  WITH CHECK (public.has_special_access());

-- cc_signups: members manage their own signups
DROP POLICY IF EXISTS "cc own signups select" ON public.cc_signups;
CREATE POLICY "cc own signups select"
  ON public.cc_signups FOR SELECT TO authenticated
  USING (member_id = current_member_id());

DROP POLICY IF EXISTS "cc own signups insert" ON public.cc_signups;
CREATE POLICY "cc own signups insert"
  ON public.cc_signups FOR INSERT TO authenticated
  WITH CHECK (member_id = current_member_id());

DROP POLICY IF EXISTS "cc own signups delete" ON public.cc_signups;
CREATE POLICY "cc own signups delete"
  ON public.cc_signups FOR DELETE TO authenticated
  USING (member_id = current_member_id());

DROP POLICY IF EXISTS "cc admin signups" ON public.cc_signups;
CREATE POLICY "cc admin signups"
  ON public.cc_signups FOR ALL TO authenticated
  USING (public.has_special_access())
  WITH CHECK (public.has_special_access());

-- cc_pairs: members can see pairs they belong to; admins can manage all
DROP POLICY IF EXISTS "cc own pairs select" ON public.cc_pairs;
CREATE POLICY "cc own pairs select"
  ON public.cc_pairs FOR SELECT TO authenticated
  USING (
    person1_id = current_member_id()
    OR person2_id = current_member_id()
    OR person3_id = current_member_id()
  );

DROP POLICY IF EXISTS "cc admin pairs" ON public.cc_pairs;
CREATE POLICY "cc admin pairs"
  ON public.cc_pairs FOR ALL TO authenticated
  USING (public.has_special_access())
  WITH CHECK (public.has_special_access());

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Grants
-- ─────────────────────────────────────────────────────────────────────────────
GRANT SELECT                   ON public.cc_rounds  TO authenticated;
GRANT SELECT, INSERT, DELETE   ON public.cc_signups TO authenticated;
GRANT SELECT, UPDATE           ON public.cc_pairs   TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Storage bucket for coffee-chat selfies
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('coffee-chat-selfies', 'coffee-chat-selfies', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "cc selfies public read" ON storage.objects;
CREATE POLICY "cc selfies public read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'coffee-chat-selfies');

DROP POLICY IF EXISTS "cc selfies authenticated upload" ON storage.objects;
CREATE POLICY "cc selfies authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'coffee-chat-selfies');
