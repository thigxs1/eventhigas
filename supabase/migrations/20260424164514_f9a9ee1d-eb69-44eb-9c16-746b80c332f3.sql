
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.sync_guest_checkin_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target UUID;
BEGIN
  target := COALESCE(NEW.guest_id, OLD.guest_id);
  UPDATE public.guests
     SET checked_in_count = COALESCE((SELECT SUM(people_count) FROM public.checkins WHERE guest_id = target), 0)
   WHERE id = target;
  RETURN NULL;
END $$;
