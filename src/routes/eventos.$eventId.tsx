import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  ArrowUpDown,
  CalendarClock,
  CheckCircle2,
  Download,
  FileDown,
  MapPin,
  MoreVertical,
  Pencil,
  RotateCcw,
  ScanLine,
  Trash2,
  Upload,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/StatCard";
import { formatCPF, formatPhone } from "@/lib/format";
import { parseGuestFile, type ParsedRow } from "@/lib/import-parser";

export const Route = createFileRoute("/eventos/$eventId")({
  head: () => ({
    meta: [{ title: "Detalhes do evento — Casa de Eventos" }],
  }),
  component: EventDetailPage,
});

type EventRow = {
  id: string;
  name: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  description: string | null;
  status: string;
};
type Guest = {
  id: string;
  full_name: string;
  cpf: string | null;
  phone: string | null;
  ticket_quantity: number;
  ticket_type: string;
  notes: string | null;
  checked_in_count: number;
  created_at: string;
};

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("lista");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Shift + P → abrir aba "Adicionar manual" e o diálogo de novo convidado
      if (e.shiftKey && (e.key === "P" || e.key === "p")) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        const isTyping =
          tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable;
        if (isTyping) return;
        e.preventDefault();
        setActiveTab("adicionar");
        toast.info("Adicionar pessoa", { description: "Atalho Shift + P" });
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("open-manual-guest"));
        }, 60);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: ev }, { data: gs }] = await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).single(),
      supabase
        .from("guests")
        .select("*")
        .eq("event_id", eventId)
        .order("full_name", { ascending: true }),
    ]);
    setEvent((ev as EventRow) ?? null);
    setGuests((gs ?? []) as Guest[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [eventId]);

  const stats = useMemo(() => {
    const total = guests.reduce((s, g) => s + g.ticket_quantity, 0);
    const present = guests.reduce((s, g) => s + g.checked_in_count, 0);
    return { total, present, pending: total - present, count: guests.length };
  }, [guests]);

  async function deleteEvent() {
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) {
      toast.error("Erro ao excluir evento");
      return;
    }
    toast.success("Evento excluído");
    navigate({ to: "/eventos" });
  }

  async function changeStatus(newStatus: "active" | "finished" | "cancelled") {
    const { error } = await supabase
      .from("events")
      .update({ status: newStatus })
      .eq("id", eventId);
    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    const labels = { active: "reaberto", finished: "finalizado", cancelled: "cancelado" };
    toast.success(`Evento ${labels[newStatus]}`);
    load();
  }

  if (loading) {
    return <div className="p-10 text-center text-muted-foreground">Carregando…</div>;
  }
  if (!event) {
    return (
      <div className="p-10 text-center">
        <p className="text-muted-foreground mb-4">Evento não encontrado.</p>
        <Link to="/eventos">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-5 md:px-8 py-7 md:py-9 max-w-[1400px] mx-auto">
      <Link
        to="/eventos"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" /> Voltar para eventos
      </Link>

      <div className="rounded-2xl border border-border bg-[image:var(--gradient-surface)] p-6 mb-7">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <Badge
              className={
                event.status === "active"
                  ? "bg-success/15 text-success border-0 mb-2"
                  : event.status === "finished"
                  ? "bg-muted text-muted-foreground border-0 mb-2"
                  : "bg-destructive/15 text-destructive border-0 mb-2"
              }
            >
              {event.status === "active"
                ? "Ativo"
                : event.status === "finished"
                ? "Finalizado"
                : "Cancelado"}
            </Badge>
            <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
              {event.name}
            </h1>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="size-4" />
                {format(new Date(event.event_date + "T00:00:00"), "EEE, dd 'de' MMMM yyyy", {
                  locale: ptBR,
                })}
                {event.event_time ? ` · ${event.event_time.slice(0, 5)}` : ""}
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" /> {event.location}
                </span>
              )}
            </div>
            {event.description && (
              <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
                {event.description}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Link to="/checkin" search={{ eventId }}>
              <Button>
                <ScanLine className="size-4" /> Check-in
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Mais ações">
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Status do evento</DropdownMenuLabel>
                {event.status !== "finished" && (
                  <DropdownMenuItem onClick={() => changeStatus("finished")}>
                    <CheckCircle2 className="size-4" /> Finalizar evento
                  </DropdownMenuItem>
                )}
                {event.status !== "active" && (
                  <DropdownMenuItem onClick={() => changeStatus("active")}>
                    <RotateCcw className="size-4" /> Reabrir evento
                  </DropdownMenuItem>
                )}
                {event.status !== "cancelled" && (
                  <DropdownMenuItem onClick={() => changeStatus("cancelled")}>
                    <XCircle className="size-4" /> Cancelar evento
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-4" /> Excluir evento
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir este evento?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Todos os convidados e check-ins deste evento também serão removidos. Essa ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={deleteEvent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard label="Convidados" value={stats.count} icon={Users} accent="primary" />
        <StatCard label="Ingressos" value={stats.total} icon={CalendarClock} accent="primary" />
        <StatCard label="Presentes" value={stats.present} icon={ScanLine} accent="success" />
        <StatCard label="Pendentes" value={stats.pending} icon={Users} accent="warning" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-surface">
          <TabsTrigger value="lista">Lista de convidados</TabsTrigger>
          <TabsTrigger value="importar">Importar planilha</TabsTrigger>
          <TabsTrigger value="adicionar">
            Adicionar manual
            <kbd className="ml-2 hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              ⇧P
            </kbd>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-4">
          <GuestsTable guests={guests} onChanged={load} eventName={event.name} />
        </TabsContent>

        <TabsContent value="importar" className="mt-4">
          <ImportPanel eventId={eventId} onImported={load} />
        </TabsContent>

        <TabsContent value="adicionar" className="mt-4">
          <ManualGuestForm eventId={eventId} onCreated={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type SortMode = "az" | "za" | "recent" | "old";

function GuestsTable({
  guests,
  onChanged,
  eventName,
}: {
  guests: Guest[];
  onChanged: () => void;
  eventName: string;
}) {
  const [sort, setSort] = useState<SortMode>("az");

  async function deleteGuest(id: string) {
    const { error } = await supabase.from("guests").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else {
      toast.success("Convidado removido");
      onChanged();
    }
  }

  const sortedGuests = useMemo(() => {
    const arr = [...guests];
    arr.sort((a, b) => {
      switch (sort) {
        case "az":
          return a.full_name.localeCompare(b.full_name, "pt-BR", { sensitivity: "base" });
        case "za":
          return b.full_name.localeCompare(a.full_name, "pt-BR", { sensitivity: "base" });
        case "recent":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "old":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
    });
    return arr;
  }, [guests, sort]);

  function exportCSV() {
    if (guests.length === 0) {
      toast.error("Nenhum convidado para exportar");
      return;
    }
    const header = ["Nome", "CPF", "Telefone", "Tipo", "Quantidade", "Presentes", "Observacoes"];
    const escape = (v: string | number | null | undefined) => {
      const s = v == null ? "" : String(v);
      if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [header.join(",")];
    for (const g of sortedGuests) {
      lines.push(
        [
          g.full_name,
          g.cpf ?? "",
          g.phone ?? "",
          g.ticket_type,
          g.ticket_quantity,
          g.checked_in_count,
          g.notes ?? "",
        ]
          .map(escape)
          .join(","),
      );
    }
    // BOM para Excel reconhecer UTF-8 e acentos
    const csv = "\uFEFF" + lines.join("\n");
    const slug = eventName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "evento";
    const today = new Date().toISOString().slice(0, 10);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `convidados-${slug}-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${guests.length} convidados exportados`);
  }

  if (guests.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
        Nenhum convidado ainda. Importe uma planilha ou adicione manualmente.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="size-4 text-muted-foreground" />
          <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
            <SelectTrigger className="h-9 w-[180px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="az">Nome (A → Z)</SelectItem>
              <SelectItem value="za">Nome (Z → A)</SelectItem>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="old">Mais antigos</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {guests.length} {guests.length === 1 ? "convidado" : "convidados"}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <FileDown className="size-4" /> Exportar CSV
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Nome</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">CPF</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Telefone</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-center px-4 py-3">Presença</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sortedGuests.map((g) => (
                <tr key={g.id} className="border-t border-border hover:bg-surface/50">
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      <EditGuestDialog guest={g} onSaved={onChanged} />
                      <span className="truncate">{g.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {formatCPF(g.cpf)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {formatPhone(g.phone)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-0 capitalize">
                      {g.ticket_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      className={
                        g.checked_in_count >= g.ticket_quantity
                          ? "bg-success/15 text-success border-0"
                          : g.checked_in_count > 0
                          ? "bg-warning/15 text-warning border-0"
                          : "bg-muted text-muted-foreground border-0"
                      }
                    >
                      {g.checked_in_count}/{g.ticket_quantity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <Trash2 className="size-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover {g.full_name}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Os check-ins deste convidado também serão excluídos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteGuest(g.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ImportPanel({ eventId, onImported }: { eventId: string; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedRow[] | null>(null);
  const [errors, setErrors] = useState<{ line: number; reason: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  async function handleFile(f: File) {
    setFile(f);
    setLoading(true);
    setPreview(null);
    setErrors([]);
    try {
      const result = await parseGuestFile(f);
      setPreview(result.rows);
      setErrors(result.errors);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível ler o arquivo");
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!preview || preview.length === 0) return;
    setImporting(true);
    const payload = preview.map((r) => ({ ...r, event_id: eventId }));
    const { error } = await supabase.from("guests").insert(payload);
    if (error) {
      toast.error("Erro ao importar: " + error.message);
      setImporting(false);
      return;
    }
    await supabase.from("import_history").insert({
      event_id: eventId,
      filename: file?.name ?? "arquivo",
      total_rows: preview.length + errors.length,
      imported_rows: preview.length,
      skipped_rows: errors.length,
      errors: errors.length > 0 ? errors : null,
    });
    toast.success(`${preview.length} convidados importados!`);
    setFile(null);
    setPreview(null);
    setErrors([]);
    setImporting(false);
    onImported();
  }

  function downloadTemplate() {
    const csv = "Nome,CPF,Telefone,Quantidade,Tipo,Observacoes\nMaria Silva,12345678900,11999998888,2,VIP,Aniversariante\nJoão Souza,,,1,Pista,";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-lista-convidados.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="font-display font-semibold text-lg">Importar lista</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Aceita CSV e Excel (.xlsx). Colunas reconhecidas: Nome, CPF, Telefone, Quantidade, Tipo, Observações.
            </p>
          </div>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="size-4" /> Modelo
          </Button>
        </div>

        <label
          htmlFor="file-upload"
          className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl py-10 cursor-pointer hover:border-primary/50 hover:bg-surface/50 transition-colors"
        >
          <Upload className="size-7 text-primary mb-2" />
          <span className="font-medium">
            {file ? file.name : "Clique para selecionar um arquivo"}
          </span>
          <span className="text-xs text-muted-foreground mt-1">CSV ou XLSX</span>
          <input
            id="file-upload"
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>

        {loading && <p className="text-sm text-muted-foreground mt-4">Lendo arquivo…</p>}
      </div>

      {preview && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-semibold">Pré-visualização</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {preview.length} linhas válidas · {errors.length} com erros
              </p>
            </div>
            <Button onClick={confirm} disabled={importing || preview.length === 0}>
              {importing ? "Importando…" : `Confirmar (${preview.length})`}
            </Button>
          </div>

          {errors.length > 0 && (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs">
              <div className="font-semibold text-destructive mb-1">
                {errors.length} linha(s) ignorada(s):
              </div>
              <ul className="space-y-0.5 max-h-32 overflow-auto">
                {errors.slice(0, 10).map((e, i) => (
                  <li key={i} className="text-destructive/80">
                    Linha {e.line}: {e.reason}
                  </li>
                ))}
                {errors.length > 10 && (
                  <li className="text-muted-foreground">+{errors.length - 10} outros…</li>
                )}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-surface uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Nome</th>
                  <th className="text-left px-3 py-2">CPF</th>
                  <th className="text-left px-3 py-2">Telefone</th>
                  <th className="text-center px-3 py-2">Qtd</th>
                  <th className="text-left px-3 py-2">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2">{r.full_name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatCPF(r.cpf)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatPhone(r.phone)}</td>
                    <td className="px-3 py-2 text-center">{r.ticket_quantity}</td>
                    <td className="px-3 py-2">{r.ticket_type}</td>
                  </tr>
                ))}
                {preview.length > 50 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted-foreground py-2">
                      +{preview.length - 50} linhas a mais…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ManualGuestForm({ eventId, onCreated }: { eventId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [qty, setQty] = useState("1");
  const [type, setType] = useState("pista");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    function open() {
      setOpen(true);
    }
    window.addEventListener("open-manual-guest", open);
    return () => window.removeEventListener("open-manual-guest", open);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome obrigatório");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("guests").insert({
      event_id: eventId,
      full_name: name.trim().slice(0, 200),
      cpf: cpf.replace(/\D/g, "").slice(0, 11) || null,
      phone: phone.replace(/\D/g, "").slice(0, 15) || null,
      ticket_quantity: Math.max(1, Math.min(999, Number(qty) || 1)),
      ticket_type: type.trim().slice(0, 40) || "pista",
      notes: notes.trim().slice(0, 500) || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao adicionar");
      return;
    }
    toast.success("Convidado adicionado!");
    setName("");
    setCpf("");
    setPhone("");
    setQty("1");
    setType("pista");
    setNotes("");
    setOpen(false);
    onCreated();
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-lg">Adicionar convidado</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Para casos pontuais — sem precisar de planilha.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="size-4" /> Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={submit}>
              <DialogHeader>
                <DialogTitle>Novo convidado</DialogTitle>
                <DialogDescription>Adicione manualmente à lista deste evento.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Nome completo *</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>CPF</Label>
                    <Input value={cpf} onChange={(e) => setCpf(e.target.value)} maxLength={14} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Telefone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={15} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Quantidade</Label>
                    <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tipo</Label>
                    <Input value={type} onChange={(e) => setType(e.target.value)} maxLength={40} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Observações</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Salvando…" : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function EditGuestDialog({ guest, onSaved }: { guest: Guest; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(guest.full_name);
  const [cpf, setCpf] = useState(guest.cpf ?? "");
  const [phone, setPhone] = useState(guest.phone ?? "");
  const [qty, setQty] = useState(String(guest.ticket_quantity));
  const [type, setType] = useState(guest.ticket_type);
  const [notes, setNotes] = useState(guest.notes ?? "");

  useEffect(() => {
    if (open) {
      setName(guest.full_name);
      setCpf(guest.cpf ?? "");
      setPhone(guest.phone ?? "");
      setQty(String(guest.ticket_quantity));
      setType(guest.ticket_type);
      setNotes(guest.notes ?? "");
    }
  }, [open, guest]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome obrigatório");
      return;
    }
    const newQty = Math.max(1, Math.min(999, Number(qty) || 1));
    if (newQty < guest.checked_in_count) {
      toast.error(
        `Quantidade não pode ser menor que ${guest.checked_in_count} (já feitos check-ins)`,
      );
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("guests")
      .update({
        full_name: name.trim().slice(0, 200),
        cpf: cpf.replace(/\D/g, "").slice(0, 11) || null,
        phone: phone.replace(/\D/g, "").slice(0, 15) || null,
        ticket_quantity: newQty,
        ticket_type: type.trim().slice(0, 40) || "pista",
        notes: notes.trim().slice(0, 500) || null,
      })
      .eq("id", guest.id);
    setSubmitting(false);
    if (error) {
      toast.error("Erro ao salvar");
      return;
    }
    toast.success("Convidado atualizado");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground hover:text-primary"
          aria-label={`Editar ${guest.full_name}`}
        >
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Editar convidado</DialogTitle>
            <DialogDescription>Atualize os dados deste convidado.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nome completo *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>CPF</Label>
                <Input value={cpf} onChange={(e) => setCpf(e.target.value)} maxLength={14} />
              </div>
              <div className="grid gap-2">
                <Label>Telefone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={15} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={Math.max(1, guest.checked_in_count)}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
                {guest.checked_in_count > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    {guest.checked_in_count} já fizeram check-in
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Input value={type} onChange={(e) => setType(e.target.value)} maxLength={40} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Observações</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
