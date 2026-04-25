import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type TableName = "guests" | "checkins" | "events" | "import_history";

/**
 * Sincroniza automaticamente uma tela com mudanças nas tabelas indicadas,
 * recarregando os dados via callback. Permite ter várias abas/dispositivos
 * conectados ao mesmo evento sem precisar atualizar manualmente.
 */
export function useRealtimeSync(
  channelName: string,
  tables: TableName[],
  onChange: () => void,
  filter?: { column: string; value: string },
) {
  // Mantém a referência mais recente do callback sem recriar o canal.
  const cbRef = useRef(onChange);
  useEffect(() => {
    cbRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cbRef.current(), 250);
    };

    let channel = supabase.channel(channelName);
    for (const table of tables) {
      const cfg: {
        event: "*";
        schema: string;
        table: TableName;
        filter?: string;
      } = { event: "*", schema: "public", table };
      if (filter) cfg.filter = `${filter.column}=eq.${filter.value}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      channel = channel.on("postgres_changes" as any, cfg, trigger);
    }
    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, tables.join(","), filter?.column, filter?.value]);
}
