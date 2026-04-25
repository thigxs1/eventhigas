ALTER TABLE public.guests REPLICA IDENTITY FULL;
ALTER TABLE public.checkins REPLICA IDENTITY FULL;
ALTER TABLE public.events REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;