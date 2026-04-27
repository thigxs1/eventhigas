-- 1) Enum de papéis
CREATE TYPE public.app_role AS ENUM ('admin', 'operator');

-- 2) Tabela profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3) Tabela user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4) Função has_role (security definer, evita recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5) Configurações do sistema (linha única)
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_name TEXT NOT NULL DEFAULT 'Casa de Eventos',
  logo_url TEXT,
  theme TEXT NOT NULL DEFAULT 'midnight-indigo',
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.system_settings (system_name, theme) VALUES ('Casa de Eventos', 'midnight-indigo');

-- 6) Trigger updated_at em profiles e system_settings
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 7) Trigger handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8) RLS profiles
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own_or_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 9) RLS user_roles
CREATE POLICY "user_roles_select_authenticated" ON public.user_roles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_insert_admin" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_update_admin" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_delete_admin" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 10) RLS system_settings
CREATE POLICY "settings_select_authenticated" ON public.system_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_update_admin" ON public.system_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "settings_insert_admin" ON public.system_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 11) Atualizar RLS das tabelas existentes para exigir autenticação
DROP POLICY IF EXISTS open_all_events ON public.events;
DROP POLICY IF EXISTS open_all_guests ON public.guests;
DROP POLICY IF EXISTS open_all_checkins ON public.checkins;
DROP POLICY IF EXISTS open_all_import ON public.import_history;

CREATE POLICY "events_all_authenticated" ON public.events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "guests_all_authenticated" ON public.guests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "checkins_all_authenticated" ON public.checkins
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "import_all_authenticated" ON public.import_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 12) Bucket de branding
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "branding_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'branding');
CREATE POLICY "branding_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "branding_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "branding_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

-- 13) Realtime para system_settings
ALTER TABLE public.system_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings;