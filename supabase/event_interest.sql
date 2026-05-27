-- event_interest: n:m table tracking which members are interested in external events.
-- Also adds tally_url (Tally application form link) and whatsapp_url (WhatsApp group link)
-- to the events table.
--
-- Apply this migration before deploying the updated event card UI.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend events with external-event action link columns
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS tally_url    text,
  ADD COLUMN IF NOT EXISTS whatsapp_url text;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Create event_interest table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.event_interest (
  id         bigint      generated always as identity primary key,
  created_at timestamptz not null default now(),
  event_id   bigint      not null references public.events(id) on delete cascade,
  member_id  bigint      not null references public.members_main(id) on delete cascade,
  unique (event_id, member_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS event_interest_event_id_idx  ON public.event_interest(event_id);
CREATE INDEX IF NOT EXISTS event_interest_member_id_idx ON public.event_interest(member_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.event_interest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated users can read event_interest" ON public.event_interest;
DROP POLICY IF EXISTS "members can insert own interest" ON public.event_interest;
DROP POLICY IF EXISTS "members can delete own interest" ON public.event_interest;

-- Authenticated users can read all interest rows (for counts and member lists)
CREATE POLICY "authenticated users can read event_interest"
  ON public.event_interest
  FOR SELECT
  TO authenticated
  USING (true);

-- Members can express interest for themselves only
CREATE POLICY "members can insert own interest"
  ON public.event_interest
  FOR INSERT
  TO authenticated
  WITH CHECK (member_id = current_member_id());

-- Members can remove their own interest
CREATE POLICY "members can delete own interest"
  ON public.event_interest
  FOR DELETE
  TO authenticated
  USING (member_id = current_member_id());
