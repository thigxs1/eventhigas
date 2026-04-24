
-- Eventos
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  location TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','finished','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Convidados (1 linha por convidado por evento)
CREATE TABLE public.guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  ticket_quantity INTEGER NOT NULL DEFAULT 1 CHECK (ticket_quantity > 0),
  ticket_type TEXT NOT NULL DEFAULT 'pista',
  notes TEXT,
  checked_in_count INTEGER NOT NULL DEFAULT 0 CHECK (checked_in_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_guests_event ON public.guests(event_id);
CREATE INDEX idx_guests_name ON public.guests(event_id, full_name);
CREATE INDEX idx_guests_cpf ON public.guests(cpf);
CREATE INDEX idx_guests_phone ON public.guests(phone);

-- Check-ins (histórico — uma linha por entrada efetiva)
CREATE TABLE public.checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  people_count INTEGER NOT NULL DEFAULT 1 CHECK (people_count > 0),
  operator TEXT,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checkins_event_time ON public.checkins(event_id, checked_in_at DESC);

-- Histórico de importação
CREATE TABLE public.import_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_guests_updated BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Manter checked_in_count sincronizado
CREATE OR REPLACE FUNCTION public.sync_guest_checkin_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE target UUID;
BEGIN
  target := COALESCE(NEW.guest_id, OLD.guest_id);
  UPDATE public.guests
     SET checked_in_count = COALESCE((SELECT SUM(people_count) FROM public.checkins WHERE guest_id = target), 0)
   WHERE id = target;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_checkins_sync
AFTER INSERT OR UPDATE OR DELETE ON public.checkins
FOR EACH ROW EXECUTE FUNCTION public.sync_guest_checkin_count();

-- RLS habilitado, políticas abertas (operação local sem login por enquanto)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_all_events" ON public.events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all_guests" ON public.guests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all_checkins" ON public.checkins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all_import" ON public.import_history FOR ALL USING (true) WITH CHECK (true);
