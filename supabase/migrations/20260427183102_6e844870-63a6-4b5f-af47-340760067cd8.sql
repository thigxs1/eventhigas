-- 1. Add public signup fields to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS public_signup_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_signup_requires_approval boolean NOT NULL DEFAULT true;

-- 2. Add status and source to guests
DO $$ BEGIN
  CREATE TYPE public.guest_status AS ENUM ('approved', 'pending', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.guest_source AS ENUM ('manual', 'import', 'public_form');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS status public.guest_status NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS source public.guest_source NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS email text;

-- 3. Public (anonymous) read access to events that opened public signup
DROP POLICY IF EXISTS events_public_signup_read ON public.events;
CREATE POLICY events_public_signup_read
  ON public.events
  FOR SELECT
  TO anon
  USING (public_signup_enabled = true);

-- 4. Public (anonymous) insert into guests for events with public signup on
DROP POLICY IF EXISTS guests_public_signup_insert ON public.guests;
CREATE POLICY guests_public_signup_insert
  ON public.guests
  FOR INSERT
  TO anon
  WITH CHECK (
    source = 'public_form'
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = guests.event_id
        AND e.public_signup_enabled = true
        AND (
          (e.public_signup_requires_approval = true  AND guests.status = 'pending')
          OR
          (e.public_signup_requires_approval = false AND guests.status = 'approved')
        )
    )
  );

-- 5. Prevent check-in on non-approved guests
CREATE OR REPLACE FUNCTION public.guard_checkin_only_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.guests g WHERE g.id = NEW.guest_id AND g.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Convidado não aprovado para check-in';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_checkin_only_approved ON public.checkins;
CREATE TRIGGER trg_guard_checkin_only_approved
  BEFORE INSERT ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.guard_checkin_only_approved();