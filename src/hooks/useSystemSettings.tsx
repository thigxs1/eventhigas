import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { applyTheme } from "@/lib/themes";

export type SystemSettings = {
  id: string;
  system_name: string;
  logo_url: string | null;
  theme: string;
  ticket_types: string[];
};

type Ctx = {
  settings: SystemSettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const SettingsContext = createContext<Ctx | undefined>(undefined);

export function SystemSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data } = await supabase
      .from("system_settings")
      .select("id,system_name,logo_url,theme,ticket_types")
      .limit(1)
      .maybeSingle();
    if (data) {
      setSettings(data as SystemSettings);
      applyTheme(data.theme);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("system_settings_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "system_settings" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh: load }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSystemSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSystemSettings must be used within SystemSettingsProvider");
  return ctx;
}
