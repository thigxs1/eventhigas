import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart3, CalendarPlus, MapPin, Plus, QrCode, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/eventos/")({
  head: () => ({
    meta: [
      { title: "Eventos — Casa de Eventos" },
      { name: "description", content: "Gerencie seus eventos, datas e listas de convidados." },
    ],
  }),
  component: EventsPage,
});

type EventRow = {
  id: string;
  name: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  description: string | null;
  status: "active" | "finished" | "cancelled";
};

type EventStatusFilter = "all" | "active" | "finished" | "cancelled";

function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<EventStatusFilter>("all");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: false });
    if (error) toast.error("Erro ao carregar eventos");
    else setEvents((data ?? []) as EventRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useRealtimeSync("events-list", ["events"], load);

  const filteredEvents = events.filter((e) =>
    statusFilter === "all" ? true : e.status === statusFilter,
  );

  const statusTabs: { id: EventStatusFilter; label: string; title: string; count: number }[] = [
    { id: "all", label: "Todos", title: "Mostrar todos os eventos", count: events.length },
    {
      id: "active",
      label: "Ativos",
      title: "Mostrar apenas eventos ativos",
      count: events.filter((e) => e.status === "active").length,
    },
    {
      id: "finished",
      label: "Finalizados",
      title: "Mostrar apenas eventos finalizados",
      count: events.filter((e) => e.status === "finished").length,
    },
    {
      id: "cancelled",
      label: "Cancelados",
      title: "Mostrar apenas eventos cancelados",
      count: events.filter((e) => e.status === "cancelled").length,
    },
  ];

  return (
    <div className="px-5 md:px-8 py-7 md:py-9 max-w-[1400px] mx-auto">
      <PageHeader
        title="Eventos & Relatórios"
        subtitle="Gerencie listas de convidados, acesse a portaria ou visualize o relatório de lotação de cada evento."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button title="Cadastrar um novo evento">
                <Plus className="size-4" />
                Novo evento
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <NewEventForm
                onCreated={() => {
                  setOpen(false);
                  load();
                }}
              />
            </DialogContent>
          </Dialog>
        }
      />

      {events.length > 0 && (
        <div
          role="tablist"
          aria-label="Filtrar eventos por status"
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.08] mb-6"
        >
          {statusTabs.map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                title={tab.title}
                onClick={() => setStatusFilter(tab.id)}
                className={
                  "px-3.5 h-8 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap " +
                  (active
                    ? "bg-[#FF6B00] text-white shadow-[0_0_16px_rgba(255,107,0,0.35)]"
                    : "text-white/60 hover:text-white hover:bg-white/[0.04]")
                }
              >
                {tab.label} <span className="opacity-75 ml-1">({tab.count})</span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="text-center text-muted-foreground py-20">Carregando…</div>
      ) : filteredEvents.length === 0 ? (
        events.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="glass-card p-12 text-center text-sm text-white/55">
            Nenhum evento encontrado neste filtro de status.
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((e) => (
            <div
              key={e.id}
              className="group glass-card flex flex-col justify-between p-5 transition-all duration-200 hover:border-[#FF6B00]/45 hover:shadow-[0_0_28px_rgba(255,107,0,0.16)]"
            >
              <Link
                to="/eventos/$eventId"
                params={{ eventId: e.id }}
                title="Abrir gestão de lista e configurações deste evento"
                className="block flex-1"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <Badge
                    variant="secondary"
                    className={
                      e.status === "active"
                        ? "bg-success/15 text-success border-0"
                        : e.status === "finished"
                          ? "bg-muted text-muted-foreground border-0"
                          : "bg-destructive/15 text-destructive border-0"
                    }
                  >
                    {e.status === "active"
                      ? "Ativo"
                      : e.status === "finished"
                        ? "Finalizado"
                        : "Cancelado"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(e.event_date + "T00:00:00"), "dd MMM yyyy", { locale: ptBR })}
                    {e.event_time ? ` · ${e.event_time.slice(0, 5)}` : ""}
                  </span>
                </div>
                <h3 className="font-display font-bold text-xl mb-2 group-hover:text-[#FF6B00] transition-colors">
                  {e.name}
                </h3>
                {e.location && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{e.location}</span>
                  </div>
                )}
                {e.description && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{e.description}</p>
                )}
              </Link>

              <div className="mt-5 pt-4 border-t border-white/[0.06] grid grid-cols-3 gap-2">
                <Link
                  to="/eventos/$eventId"
                  params={{ eventId: e.id }}
                  title="Gerenciar convidados, importações e aprovações"
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-white/85 transition-colors"
                >
                  <Users className="size-3.5 text-white/65 shrink-0" aria-hidden="true" />
                  <span className="truncate">Lista</span>
                </Link>
                <Link
                  to="/eventos/$eventId/dashboard"
                  params={{ eventId: e.id }}
                  title="Abrir relatório completo de lotação e ranking"
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-2 rounded-xl bg-[#FF6B00]/12 hover:bg-[#FF6B00]/22 border border-[#FF6B00]/30 text-xs font-medium text-[#FF8C38] transition-colors"
                >
                  <BarChart3 className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">Lotação</span>
                </Link>
                <Link
                  to="/checkin"
                  search={{ eventId: e.id }}
                  title="Abrir painel operacional de check-in deste evento"
                  className="inline-flex items-center justify-center gap-1.5 h-9 px-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-white/85 transition-colors"
                >
                  <QrCode className="size-3.5 text-white/65 shrink-0" aria-hidden="true" />
                  <span className="truncate">Portaria</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="size-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
        <CalendarPlus className="size-7 text-primary" />
      </div>
      <h3 className="font-display font-semibold text-lg">Nenhum evento ainda</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        Crie seu primeiro evento para começar a importar listas e fazer check-in dos convidados.
      </p>
    </div>
  );
}

function NewEventForm({ onCreated }: { onCreated: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "finished" | "cancelled">("active");
  const [flyerUrl, setFlyerUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFlyerUpload(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `flyer-temp-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("branding")
      .upload(path, file, { upsert: true });

    if (upErr) {
      toast.error(upErr.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    setFlyerUrl(data.publicUrl);
    setUploading(false);
    toast.success("Flyer carregado");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !date) {
      toast.error("Nome e data são obrigatórios");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("events").insert({
      name: name.trim(),
      event_date: date,
      event_time: time || null,
      location: location.trim() || null,
      description: description.trim() || null,
      status,
      flyer_url: flyerUrl,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao criar evento");
      return;
    }
    toast.success("Evento criado!");
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Novo evento</DialogTitle>
        <DialogDescription>
          Cada evento mantém sua própria lista de convidados e histórico de check-ins.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-5 max-h-[70vh] overflow-y-auto px-1">
        <div className="grid gap-2">
          <Label htmlFor="name">Nome *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="Ex: Festa de Aniversário 2026"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="date">Data *</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="time">Horário</Label>
            <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="location">Local</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={200}
            placeholder="Ex: Salão Principal, Av. Paulista 1000"
          />
        </div>
        <div className="grid gap-2">
          <Label>Flyer / Imagem do Evento</Label>
          <div className="flex items-center gap-4">
            {flyerUrl ? (
              <img
                src={flyerUrl}
                alt="Preview"
                className="size-20 rounded-lg object-cover border border-border"
              />
            ) : (
              <div className="size-20 rounded-lg bg-surface border border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground text-center px-2">
                Sem imagem
              </div>
            )}
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
              <Plus className="size-4" />{" "}
              {uploading ? "Enviando..." : flyerUrl ? "Trocar" : "Selecionar"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFlyerUpload(f);
                }}
              />
            </label>
            {flyerUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setFlyerUrl(null)}>
                Remover
              </Button>
            )}
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="finished">Finalizado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={2}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Criando…" : "Criar evento"}
        </Button>
      </DialogFooter>
    </form>
  );
}
