import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCPF, formatPhone, normalizeText, onlyDigits } from "@/lib/format";

export const Route = createFileRoute("/convidados")({
  head: () => ({
    meta: [
      { title: "Convidados — Casa de Eventos" },
      { name: "description", content: "Busca global em todos os convidados de todos os eventos." },
    ],
  }),
  component: GuestsPage,
});

type Row = {
  id: string;
  full_name: string;
  cpf: string | null;
  phone: string | null;
  ticket_quantity: number;
  ticket_type: string;
  checked_in_count: number;
  event_id: string;
  event: { name: string; event_date: string } | null;
};

function GuestsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  async function load() {
    const { data } = await supabase
      .from("guests")
      .select(
        "id,full_name,cpf,phone,ticket_quantity,ticket_type,checked_in_count,event_id,event:events(name,event_date)",
      )
      .order("full_name", { ascending: true })
      .limit(2000);
    setRows((data ?? []) as unknown as Row[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Sincronismo entre dispositivos
  useRealtimeSync("convidados-global", ["guests", "checkins"], load);


  const filtered = useMemo(() => {
    if (!query.trim()) return rows.slice(0, 200);
    const qN = normalizeText(query);
    const qD = onlyDigits(query);
    return rows
      .filter((r) => {
        if (normalizeText(r.full_name).includes(qN)) return true;
        if (qD.length >= 3 && r.cpf?.includes(qD)) return true;
        if (qD.length >= 3 && r.phone?.includes(qD)) return true;
        return false;
      })
      .slice(0, 200);
  }, [rows, query]);

  return (
    <div className="px-5 md:px-8 py-7 md:py-9 max-w-[1400px] mx-auto">
      <PageHeader
        title="Convidados"
        subtitle="Busca global em todos os eventos."
      />

      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome, CPF ou telefone…"
          className="pl-12 h-12 bg-card"
          autoComplete="off"
        />
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-10">Carregando…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Users className="size-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {query ? "Nenhum convidado encontrado." : "Nenhum convidado ainda."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Nome</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">CPF</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Telefone</th>
                  <th className="text-left px-4 py-3">Evento</th>
                  <th className="text-center px-4 py-3">Presença</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-surface/50">
                    <td className="px-4 py-3 font-medium">{r.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {formatCPF(r.cpf)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {formatPhone(r.phone)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to="/eventos/$eventId"
                        params={{ eventId: r.event_id }}
                        className="text-primary hover:underline text-xs"
                      >
                        {r.event?.name ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        className={
                          r.checked_in_count >= r.ticket_quantity
                            ? "bg-success/15 text-success border-0"
                            : r.checked_in_count > 0
                            ? "bg-warning/15 text-warning border-0"
                            : "bg-muted text-muted-foreground border-0"
                        }
                      >
                        {r.checked_in_count}/{r.ticket_quantity}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
