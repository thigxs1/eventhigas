import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  CalendarDays,
  Clock,
  PartyPopper,
  TicketCheck,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Casa de Eventos" },
      { name: "description", content: "Visão geral em tempo real dos eventos e check-ins." },
    ],
  }),
  component: DashboardPage,
});

type Stats = {
  events: { id: string; name: string; event_date: string; event_time: string | null; status: string }[];
  totalGuests: number;
  totalTickets: number;
  totalCheckedIn: number;
  recentCheckins: { id: string; checked_in_at: string; people_count: number; guest_name: string; event_name: string }[];
  byTicketType: { type: string; total: number; presentes: number }[];
};

function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: events }, { data: guests }, { data: checkins }] = await Promise.all([
        supabase
          .from("events")
          .select("id,name,event_date,event_time,status")
          .gte("event_date", today)
          .order("event_date", { ascending: true })
          .limit(5),
        supabase
          .from("guests")
          .select("id,event_id,ticket_quantity,ticket_type,checked_in_count"),
        supabase
          .from("checkins")
          .select("id,checked_in_at,people_count,guest:guests(full_name),event:events(name)")
          .order("checked_in_at", { ascending: false })
          .limit(8),
      ]);

      if (cancelled) return;

      const totalGuests = guests?.length ?? 0;
      const totalTickets =
        guests?.reduce((s, g) => s + (g.ticket_quantity ?? 0), 0) ?? 0;
      const totalCheckedIn =
        guests?.reduce((s, g) => s + (g.checked_in_count ?? 0), 0) ?? 0;

      const typeMap = new Map<string, { total: number; presentes: number }>();
      for (const g of guests ?? []) {
        const cur = typeMap.get(g.ticket_type) ?? { total: 0, presentes: 0 };
        cur.total += g.ticket_quantity ?? 0;
        cur.presentes += g.checked_in_count ?? 0;
        typeMap.set(g.ticket_type, cur);
      }

      setStats({
        events: events ?? [],
        totalGuests,
        totalTickets,
        totalCheckedIn,
        recentCheckins:
          checkins?.map((c) => ({
            id: c.id,
            checked_in_at: c.checked_in_at,
            people_count: c.people_count,
            // @ts-expect-error nested join
            guest_name: c.guest?.full_name ?? "—",
            // @ts-expect-error nested join
            event_name: c.event?.name ?? "—",
          })) ?? [],
        byTicketType: Array.from(typeMap.entries()).map(([type, v]) => ({
          type,
          ...v,
        })),
      });
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const occupation =
    stats && stats.totalTickets > 0
      ? Math.round((stats.totalCheckedIn / stats.totalTickets) * 100)
      : 0;
  const pendentes = stats ? stats.totalTickets - stats.totalCheckedIn : 0;

  const pieData = [
    { name: "Presentes", value: stats?.totalCheckedIn ?? 0 },
    { name: "Pendentes", value: Math.max(pendentes, 0) },
  ];
  const PIE_COLORS = ["oklch(0.7 0.18 155)", "oklch(0.28 0.05 270)"];

  return (
    <div className="px-5 md:px-8 py-7 md:py-9 max-w-[1400px] mx-auto">
      <PageHeader
        title="Visão geral"
        subtitle={`Hoje, ${format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}`}
        action={
          <Link to="/eventos">
            <Button>
              <CalendarDays className="size-4" />
              Ver eventos
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Convidados"
          value={loading ? "…" : stats?.totalGuests ?? 0}
          icon={Users}
          accent="primary"
        />
        <StatCard
          label="Ingressos vendidos"
          value={loading ? "…" : stats?.totalTickets ?? 0}
          icon={TicketCheck}
          accent="primary"
        />
        <StatCard
          label="Presentes"
          value={loading ? "…" : stats?.totalCheckedIn ?? 0}
          hint={`${occupation}% de ocupação`}
          icon={PartyPopper}
          accent="success"
        />
        <StatCard
          label="Pendentes"
          value={loading ? "…" : pendentes}
          icon={Clock}
          accent="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg">Ingressos por tipo</h2>
            <span className="text-xs text-muted-foreground">Vendidos vs presentes</span>
          </div>
          <div className="h-[260px]">
            {stats && stats.byTicketType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byTicketType}>
                  <XAxis
                    dataKey="type"
                    tick={{ fill: "oklch(0.68 0.04 270)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "oklch(0.68 0.04 270)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "oklch(0.22 0.05 270 / 0.5)" }}
                    contentStyle={{
                      background: "oklch(0.17 0.05 270)",
                      border: "1px solid oklch(0.28 0.05 270 / 0.6)",
                      borderRadius: 12,
                      color: "oklch(0.97 0.01 270)",
                    }}
                  />
                  <Bar dataKey="total" name="Vendidos" fill="oklch(0.62 0.22 275)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="presentes" name="Presentes" fill="oklch(0.7 0.18 155)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyHint text="Sem dados ainda — importe uma lista de convidados para começar." />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg">Ocupação</h2>
            <Badge variant="secondary" className="bg-primary/15 text-primary border-0">
              {occupation}%
            </Badge>
          </div>
          <div className="h-[260px]">
            {stats && stats.totalTickets > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.17 0.05 270)",
                      border: "1px solid oklch(0.28 0.05 270 / 0.6)",
                      borderRadius: 12,
                      color: "oklch(0.97 0.01 270)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyHint text="Sem ingressos cadastrados." />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg">Próximos eventos</h2>
            <Link to="/eventos" className="text-xs text-primary hover:underline">
              Ver todos →
            </Link>
          </div>
          {stats && stats.events.length > 0 ? (
            <ul className="space-y-2">
              {stats.events.map((e) => (
                <li key={e.id}>
                  <Link
                    to="/eventos/$eventId"
                    params={{ eventId: e.id }}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface hover:bg-surface-elevated transition-colors group"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{e.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(e.event_date + "T00:00:00"), "dd 'de' MMM", { locale: ptBR })}
                        {e.event_time ? ` · ${e.event_time.slice(0, 5)}` : ""}
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                      {statusLabel(e.status)}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHint text="Nenhum evento futuro. Crie seu primeiro evento." />
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2">
              <Activity className="size-4 text-primary" /> Últimos check-ins
            </h2>
          </div>
          {stats && stats.recentCheckins.length > 0 ? (
            <ul className="space-y-2">
              {stats.recentCheckins.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.guest_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {c.event_name}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <Badge className="bg-success/15 text-success border-0">
                      +{c.people_count}
                    </Badge>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(c.checked_in_at), "HH:mm")}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyHint text="Nenhum check-in registrado ainda." />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground text-center px-4">
      {text}
    </div>
  );
}

function statusLabel(s: string) {
  switch (s) {
    case "active":
      return "Ativo";
    case "finished":
      return "Finalizado";
    case "cancelled":
      return "Cancelado";
    default:
      return s;
  }
}
