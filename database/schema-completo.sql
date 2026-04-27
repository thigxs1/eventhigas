-- =============================================================
-- CASA DE EVENTOS — Schema completo do banco de dados
-- =============================================================
-- Este arquivo cria TODA a estrutura necessária para rodar o
-- sistema do zero em uma instância Supabase / Postgres limpa.
--
-- Como usar:
--   1. Crie um projeto Supabase novo (ou um Postgres limpo).
--   2. Rode este script inteiro no SQL Editor.
--   3. Habilite a extensão "Realtime" para as tabelas listadas
--      no final do arquivo (Database > Replication).
--   4. Crie o primeiro usuário em Authentication > Users —
--      ele recebe automaticamente o papel 'admin'.
-- =============================================================

-- ----------------------------------------------------------------
-- 0. Extensões
-- ----------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------
-- 1. ENUMs
-- ----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'operator');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.guest_status AS ENUM ('approved', 'pending', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.guest_source AS ENUM ('manual', 'import', 'public_form');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------
-- 2. Função utilitária: atualiza updated_at
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

-- ----------------------------------------------------------------
-- 3. Tabela: profiles  (perfil do usuário autenticado)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid PRIMARY KEY,
  display_name text,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- 4. Tabela: user_roles  (papéis: admin / operator)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  role       public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função: verifica papel sem disparar recursão de RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ----------------------------------------------------------------
-- 5. Tabela: events  (eventos)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                            text NOT NULL,
  description                     text,
  event_date                      date NOT NULL,
  event_time                      time,
  location                        text,
  status                          text NOT NULL DEFAULT 'active',  -- active | finished | cancelled
  public_signup_enabled           boolean NOT NULL DEFAULT false,
  public_signup_requires_approval boolean NOT NULL DEFAULT true,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_events_touch
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ----------------------------------------------------------------
-- 6. Tabela: guests  (convidados)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id           uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  full_name          text NOT NULL,
  cpf                text,
  phone              text,
  email              text,
  ticket_quantity    integer NOT NULL DEFAULT 1,
  ticket_type        text NOT NULL DEFAULT 'pista',  -- pista | vip | camarote | backstage
  notes              text,
  checked_in_count   integer NOT NULL DEFAULT 0,
  status             public.guest_status NOT NULL DEFAULT 'approved',
  source             public.guest_source NOT NULL DEFAULT 'manual',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guests_event_id ON public.guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_status   ON public.guests(status);

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_guests_touch
  BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ----------------------------------------------------------------
-- 7. Tabela: checkins  (registros de presença)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.checkins (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id       uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  people_count   integer NOT NULL DEFAULT 1,
  operator       text,
  checked_in_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkins_event_id ON public.checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_checkins_guest_id ON public.checkins(guest_id);

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- Mantém guests.checked_in_count sincronizado
CREATE OR REPLACE FUNCTION public.sync_guest_checkin_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE target uuid;
BEGIN
  target := COALESCE(NEW.guest_id, OLD.guest_id);
  UPDATE public.guests
     SET checked_in_count = COALESCE(
       (SELECT SUM(people_count) FROM public.checkins WHERE guest_id = target), 0)
   WHERE id = target;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_checkins_sync_count
  AFTER INSERT OR UPDATE OR DELETE ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.sync_guest_checkin_count();

-- Bloqueia check-in para convidados não aprovados
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

CREATE TRIGGER trg_guard_checkin_only_approved
  BEFORE INSERT ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.guard_checkin_only_approved();

-- ----------------------------------------------------------------
-- 8. Tabela: import_history  (histórico de importações de planilha)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.import_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  filename       text NOT NULL,
  total_rows     integer NOT NULL DEFAULT 0,
  imported_rows  integer NOT NULL DEFAULT 0,
  skipped_rows   integer NOT NULL DEFAULT 0,
  errors         jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- 9. Tabela: system_settings  (branding e tema — singleton)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_settings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton    boolean NOT NULL DEFAULT true UNIQUE,
  system_name  text NOT NULL DEFAULT 'Casa de Eventos',
  logo_url     text,
  theme        text NOT NULL DEFAULT 'midnight-indigo',
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Garante a linha única
INSERT INTO public.system_settings (singleton)
VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

CREATE TRIGGER trg_system_settings_touch
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ----------------------------------------------------------------
-- 10. Bootstrap: cria perfil + concede admin ao primeiro usuário
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.bootstrap_first_admin();

-- ================================================================
-- 11. ROW LEVEL SECURITY
-- ================================================================

-- profiles: leitura para autenticados; criar/editar/excluir = próprio dono ou admin
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_authenticated ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS profiles_insert_admin ON public.profiles;
CREATE POLICY profiles_insert_admin ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS profiles_update_own_or_admin ON public.profiles;
CREATE POLICY profiles_update_own_or_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS profiles_delete_admin ON public.profiles;
CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- user_roles: leitura para todos autenticados; gerenciar apenas admin
DROP POLICY IF EXISTS user_roles_select_authenticated ON public.user_roles;
CREATE POLICY user_roles_select_authenticated ON public.user_roles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS user_roles_insert_admin ON public.user_roles;
CREATE POLICY user_roles_insert_admin ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS user_roles_update_admin ON public.user_roles;
CREATE POLICY user_roles_update_admin ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS user_roles_delete_admin ON public.user_roles;
CREATE POLICY user_roles_delete_admin ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- events: acesso total para autenticados; SELECT público para eventos com inscrição pública
DROP POLICY IF EXISTS events_all_authenticated ON public.events;
CREATE POLICY events_all_authenticated ON public.events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS events_public_signup_read ON public.events;
CREATE POLICY events_public_signup_read ON public.events
  FOR SELECT TO anon USING (public_signup_enabled = true);

-- guests: acesso total para autenticados; INSERT público controlado por evento
DROP POLICY IF EXISTS guests_all_authenticated ON public.guests;
CREATE POLICY guests_all_authenticated ON public.guests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS guests_public_signup_insert ON public.guests;
CREATE POLICY guests_public_signup_insert ON public.guests
  FOR INSERT TO anon
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

-- checkins: acesso total para autenticados
DROP POLICY IF EXISTS checkins_all_authenticated ON public.checkins;
CREATE POLICY checkins_all_authenticated ON public.checkins
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- import_history: acesso total para autenticados
DROP POLICY IF EXISTS import_all_authenticated ON public.import_history;
CREATE POLICY import_all_authenticated ON public.import_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- system_settings: leitura para autenticados; alterar somente admin
DROP POLICY IF EXISTS settings_select_authenticated ON public.system_settings;
CREATE POLICY settings_select_authenticated ON public.system_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS settings_insert_admin ON public.system_settings;
CREATE POLICY settings_insert_admin ON public.system_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS settings_update_admin ON public.system_settings;
CREATE POLICY settings_update_admin ON public.system_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ================================================================
-- 12. STORAGE — bucket "branding" (logo do sistema)
-- ================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS branding_public_read ON storage.objects;
CREATE POLICY branding_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'branding');

DROP POLICY IF EXISTS branding_admin_write ON storage.objects;
CREATE POLICY branding_admin_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS branding_admin_update ON storage.objects;
CREATE POLICY branding_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS branding_admin_delete ON storage.objects;
CREATE POLICY branding_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

-- ================================================================
-- 13. REALTIME — habilita sincronização entre dispositivos
-- ================================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.guests;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.checkins;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.events   REPLICA IDENTITY FULL;
ALTER TABLE public.guests   REPLICA IDENTITY FULL;
ALTER TABLE public.checkins REPLICA IDENTITY FULL;

-- =============================================================
-- FIM. Ao terminar, crie o primeiro usuário em
-- Authentication > Users — ele já entra como Administrador.
-- =============================================================
