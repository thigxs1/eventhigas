import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Activity, PartyPopper, TicketCheck, Users, Clock, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/eventos/$eventId/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard do Evento" }] }),
  component: EventDashboard,
});

type EventInfo = { id: string; name: string; event_date: string; event_time: string | null; location: string | null };
type GuestRow = { id: string; full_name: string; ticket_quantity: number; ticket_type: string; checked_in_count: number };
type CheckinRow = { id: string; checked_in_at: string; people_count: number; operator: string | null; guest_id: string };

function EventDashboard() {
  const { eventId } = Route.useParams();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [guests, setGuests] = useState<GuestRow[]>([]);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: ev }, { data: gs }, { data: cs }] = await Promise.all([
      supabase.from("events").select("id,name,event_date,event_time,location").eq("id", eventId).maybeSingle(),
      supabase.from("guests").select("id,full_name,ticket_quantity,ticket_type,checked_in_count").eq("event_id", eventId),
      supabase
        .from("checkins")
        .select("id,checked_in_at,people_count,operator,guest_id")
        .eq("event_id", eventId)
        .order("checked_in_at", { ascending: false }),
    ]);
    setEvent(ev as EventInfo | null);
    setGuests((gs ?? []) as GuestRow[]);
    setCheckins((cs ?? []) as CheckinRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [eventId]);

  useRealtimeSync({
    tables: [
      { table: "guests", filter: { column: "event_id", value: eventId } },
      { table: "checkins", filter: { column: "event_id", value: eventId } },
    ],
    onChange: load,
  });

  const totalGuests = guests.length;
  const totalTickets = guests.reduce((s, g) => s + (g.ticket_quantity ?? 0), 0);
  const totalCheckedIn = guests.reduce((s, g) => s + (g.checked_in_count ?? 0), 0);
  const pendentes = Math.max(totalTickets - totalCheckedIn, 0);
  const occupation = totalTickets > 0 ? Math.round((totalCheckedIn / totalTickets) * 100) : 0;

  const guestNameById = useMemo(() => new Map(guests.map((g) => [g.id, g.full_name])), [guests]);

  // Check-ins por hora
  const byHour = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of checkins) {
      const h = format(new Date(c.checked_in_at), "HH:00");
      map.set(h, (map.get(h) ?? 0) + c.people_count);
    }
    return Array.from(map.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }, [checkins]);

  // Por tipo de ingresso
  const byType = useMemo(() => {
    const map = new Map<string, { total: number; presentes: number }>();
    for (const g of guests) {
      const cur = map.get(g.ticket_type) ?? { total: 0, presentes: 0 };
      cur.total += g.ticket_quantity;
      cur.presentes += g.checked_in_count;
      map.set(g.ticket_type, cur);
    }
    return Array.from(map.entries()).map(([type, v]) => ({ type, ...v }));
  }, [guests]);

  // Ranking operadores
  const byOperator = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of checkins) {
      const op = c.operator?.trim() || "—";
      map.set(op, (map.get(op) ?? 0) + c.people_count);
    }
    return Array.from(map.entries())
      .map(([operator, total]) => ({ operator, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [checkins]);

  const pieData = [
    { name: "Presentes", value: totalCheckedIn },
    { name: "Pendentes", value: pendentes },
  ];

  function exportCsv() {
    const rows = [
      ["Hora", "Convidado", "Pessoas", "Operador"],
      ...checkins.map((c) => [
        format(new Date(c.checked_in_at), "dd/MM/yyyy HH:mm"),
        guestNameById.get(c.guest_id) ?? "—",
        String(c.people_count),
        c.operator ?? "—",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-${event?.name ?? "evento"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="px-8 py-10 text-muted-foreground">Carregando…</div>;
  }
  if (!event) {
    return <div className="px-8 py-10">Evento não encontrado.</div>;
  }

  return (
    <div className="px-5 md:px-8 py-7 md:py-9 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <Link to="/eventos/$eventId" params={{ eventId }} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
            <ArrowLeft className="size-3" /> Voltar ao evento
          </Link>
          <h1 className="font-display font-bold text-2xl md:text-3xl">{event.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(event.event_date + "T00:00:00"), "EEEE, d 'de' MMMM", { locale: ptBR })}
            {event.event_time ? ` · ${event.event_time.slice(0, 5)}` : ""}
            {event.location ? ` · ${event.location}` : ""}
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-7">
        <StatCard label="Convidados" value={totalGuests} icon={Users} accent="primary" />
        <StatCard label="Ingressos" value={totalTickets} icon={TicketCheck} accent="primary" />
        <StatCard label="Presentes" value={totalCheckedIn} icon={PartyPopper} accent="success" hint={`${occupation}%`} />
        <StatCard label="Pendentes" value={pendentes} icon={Clock} accent="warning" />
        <StatCard label="Check-ins" value={checkins.length} icon={Activity} accent="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-7">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" /> Check-ins por hora
            </h2>
          </div>
          <div className="h-[280px]">
            {byHour.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={byHour}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.05 270 / 0.3)" />
                  <XAxis dataKey="hour" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Empty text="Nenhum check-in ainda." />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg">Ocupação</h2>
            <Badge className="bg-primary/15 text-primary border-0">{occupation}%</Badge>
          </div>
          <div className="h-[280px]">
            {totalTickets > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                    <Cell fill="oklch(0.7 0.18 155)" />
                    <Cell fill="var(--muted)" />
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty text="Sem ingressos." />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-7">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display font-semibold text-lg mb-4">Por tipo de ingresso</h2>
          <div className="h-[260px]">
            {byType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byType}>
                  <XAxis dataKey="type" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Bar dataKey="total" name="Vendidos" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="presentes" name="Presentes" fill="oklch(0.7 0.18 155)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty text="Sem dados." />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display font-semibold text-lg mb-4">Ranking de operadores</h2>
          {byOperator.length > 0 ? (
            <ul className="space-y-2">
              {byOperator.map((op, i) => (
                <li key={op.operator} className="flex items-center justify-between p-3 rounded-xl bg-surface">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-primary/15 text-primary font-bold flex items-center justify-center text-sm">
                      {i + 1}
                    </div>
                    <div className="font-medium">{op.operator}</div>
                  </div>
                  <Badge className="bg-success/15 text-success border-0">{op.total} pessoas</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="Sem operadores ainda." />
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
          <Activity className="size-4 text-primary" /> Timeline em tempo real
        </h2>
        {checkins.length > 0 ? (
          <ul className="space-y-2 max-h-[480px] overflow-auto">
            {checkins.map((c) => (
              <li key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-2 rounded-full bg-success shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{guestNameById.get(c.guest_id) ?? "—"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(c.checked_in_at), "dd/MM HH:mm:ss")}
                      {c.operator ? ` · por ${c.operator}` : ""}
                    </div>
                  </div>
                </div>
                <Badge className="bg-success/15 text-success border-0 shrink-0">+{c.people_count}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="Aguardando primeiro check-in…" />
        )}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">{text}</div>;
}
