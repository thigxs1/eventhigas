import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarPlus, MapPin, Plus } from "lucide-react";
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

function EventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

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

  return (
    <div className="px-5 md:px-8 py-7 md:py-9 max-w-[1400px] mx-auto">
      <PageHeader
        title="Eventos"
        subtitle="Cada evento tem sua própria lista de convidados e check-ins."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
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

      {loading ? (
        <div className="text-center text-muted-foreground py-20">Carregando…</div>
      ) : events.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((e) => (
            <Link
              key={e.id}
              to="/eventos/$eventId"
              params={{ eventId: e.id }}
              className="group rounded-2xl border border-border bg-[image:var(--gradient-surface)] p-5 transition-[var(--transition-smooth)] hover:border-primary/50 hover:shadow-[var(--shadow-glow)]"
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
              <h3 className="font-display font-bold text-xl mb-2 group-hover:text-primary transition-colors">
                {e.name}
              </h3>
              {e.location && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" />
                  <span className="truncate">{e.location}</span>
                </div>
              )}
              {e.description && (
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                  {e.description}
                </p>
              )}
            </Link>
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
    const { error: upErr } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
    
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
              <img src={flyerUrl} alt="Preview" className="size-20 rounded-lg object-cover border border-border" />
            ) : (
              <div className="size-20 rounded-lg bg-surface border border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground text-center px-2">
                Sem imagem
              </div>
            )}
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm font-medium cursor-pointer hover:bg-accent transition-colors">
              <Plus className="size-4" /> {uploading ? "Enviando..." : flyerUrl ? "Trocar" : "Selecionar"}
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
