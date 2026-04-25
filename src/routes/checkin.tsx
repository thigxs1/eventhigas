import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Lock, MinusCircle, PlusCircle, RotateCcw, ScanLine, Search, Undo2, Unlock, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCPF, formatPhone, normalizeText, onlyDigits } from "@/lib/format";

const searchSchema = z.object({
  eventId: z.string().optional(),
});

export const Route = createFileRoute("/checkin")({
  head: () => ({
    meta: [
      { title: "Check-in — Casa de Eventos" },
      { name: "description", content: "Tela operacional de check-in rápido durante o evento." },
    ],
  }),
  validateSearch: searchSchema,
  component: CheckinPage,
});

type EventOpt = { id: string; name: string; event_date: string };
type Guest = {
  id: string;
  full_name: string;
  cpf: string | null;
  phone: string | null;
  ticket_quantity: number;
  ticket_type: string;
  checked_in_count: number;
  notes: string | null;
};
type RecentCheckin = {
  id: string;
  guest_name: string;
  people_count: number;
  checked_in_at: string;
};

function CheckinPage() {
  const { eventId: searchEventId } = Route.useSearch();
  const [events, setEvents] = useState<EventOpt[]>([]);
  const [eventId, setEventId] = useState<string | undefined>(searchEventId);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [recent, setRecent] = useState<RecentCheckin[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "presentes" | "pendentes">("todos");
  const [confirmGuest, setConfirmGuest] = useState<Guest | null>(null);
  const [confirmPeople, setConfirmPeople] = useState(1);
  const [undoTarget, setUndoTarget] = useState<{ guest: Guest } | null>(null);
  const [resetTarget, setResetTarget] = useState<Guest | null>(null);
  const [strictMode, setStrictMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem("checkin_strict_mode");
    return v === null ? true : v === "true";
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("checkin_strict_mode", String(strictMode));
    }
  }, [strictMode]);

  // Load events
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("events")
        .select("id,name,event_date")
        .eq("status", "active")
        .order("event_date", { ascending: false });
      const list = (data ?? []) as EventOpt[];
      setEvents(list);
      if (!eventId && list.length > 0) setEventId(list[0].id);
    })();
  }, []);

  async function reload() {
    if (!eventId) return;
    const [{ data: gs }, { data: cks }] = await Promise.all([
      supabase
        .from("guests")
        .select("*")
        .eq("event_id", eventId)
        .order("full_name", { ascending: true }),
      supabase
        .from("checkins")
        .select("id,people_count,checked_in_at,guest:guests(full_name)")
        .eq("event_id", eventId)
        .order("checked_in_at", { ascending: false })
        .limit(10),
    ]);
    setGuests((gs ?? []) as Guest[]);
    setRecent(
      (cks ?? []).map((c) => {
        const guest = (c as { guest?: { full_name?: string } | null }).guest;
        return {
          id: c.id,
          people_count: c.people_count,
          checked_in_at: c.checked_in_at,
          guest_name: guest?.full_name ?? "—",
        };
      }),
    );
  }

  useEffect(() => {
    reload();
    inputRef.current?.focus();
  }, [eventId]);

  // Filter
  const filtered = useMemo(() => {
    const qNorm = normalizeText(query);
    const qDigits = onlyDigits(query);
    const base = guests.filter((g) => {
      if (statusFilter === "presentes" && g.checked_in_count <= 0) return false;
      if (statusFilter === "pendentes" && g.checked_in_count >= g.ticket_quantity) return false;
      if (!query.trim()) return true;
      if (normalizeText(g.full_name).includes(qNorm)) return true;
      if (qDigits.length >= 3 && g.cpf?.includes(qDigits)) return true;
      if (qDigits.length >= 3 && g.phone?.includes(qDigits)) return true;
      return false;
    });
    return base.slice(0, 80);
  }, [guests, query, statusFilter]);

  const stats = useMemo(() => {
    const total = guests.reduce((s, g) => s + g.ticket_quantity, 0);
    const present = guests.reduce((s, g) => s + g.checked_in_count, 0);
    return { total, present, pending: total - present };
  }, [guests]);

  function startCheckin(guest: Guest) {
    const remaining = guest.ticket_quantity - guest.checked_in_count;
    if (remaining <= 0) {
      if (strictMode) {
        toast.error(
          `${guest.full_name} já fez check-in completo (${guest.checked_in_count}/${guest.ticket_quantity}). Desative o modo estrito para permitir entrada extra.`,
        );
        return;
      }
      setConfirmGuest(guest);
      setConfirmPeople(1);
      return;
    }
    setConfirmGuest(guest);
    setConfirmPeople(remaining);
  }

  async function performCheckin() {
    if (!confirmGuest || !eventId || confirmPeople < 1) return;
    const remaining = confirmGuest.ticket_quantity - confirmGuest.checked_in_count;
    if (strictMode && confirmPeople > Math.max(remaining, 0)) {
      toast.error(`Modo estrito: máximo ${Math.max(remaining, 0)} pessoa(s) restante(s).`);
      return;
    }
    const { error } = await supabase.from("checkins").insert({
      guest_id: confirmGuest.id,
      event_id: eventId,
      people_count: confirmPeople,
    });
    if (error) {
      toast.error("Erro ao registrar check-in");
      return;
    }
    toast.success(`✓ ${confirmGuest.full_name} — ${confirmPeople} pessoa(s)`);
    setConfirmGuest(null);
    setQuery("");
    inputRef.current?.focus();
    reload();
  }

  async function undoLastCheckin(guestId: string, guestName: string) {
    if (!eventId) return;
    const { data: last } = await supabase
      .from("checkins")
      .select("id,people_count")
      .eq("guest_id", guestId)
      .eq("event_id", eventId)
      .order("checked_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!last) {
      toast.error(`${guestName} não tem check-ins para desfazer.`);
      return;
    }
    const { error } = await supabase.from("checkins").delete().eq("id", last.id);
    if (error) {
      toast.error("Erro ao desfazer check-in");
      return;
    }
    toast.success(`Desfeito: ${guestName} (-${last.people_count})`);
    setUndoTarget(null);
    reload();
  }

  async function resetGuestCheckins(guest: Guest) {
    if (!eventId) return;
    const { error } = await supabase
      .from("checkins")
      .delete()
      .eq("guest_id", guest.id)
      .eq("event_id", eventId);
    if (error) {
      toast.error("Erro ao zerar check-ins");
      return;
    }
    toast.success(`Check-ins zerados: ${guest.full_name}`);
    setResetTarget(null);
    reload();
  }

  if (events.length === 0) {
    return (
      <div className="px-5 md:px-8 py-12 max-w-2xl mx-auto text-center">
        <div className="size-16 rounded-2xl bg-primary/15 flex items-center justify-center mb-4 mx-auto">
          <ScanLine className="size-7 text-primary" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">Nenhum evento ativo</h2>
        <p className="text-muted-foreground mb-5">
          Crie um evento e marque-o como ativo para começar o check-in.
        </p>
        <Link to="/eventos">
          <Button>Ir para eventos</Button>
        </Link>
      </div>
    );
  }

  const currentEvent = events.find((e) => e.id === eventId);

  return (
    <div className="px-5 md:px-8 py-6 md:py-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Check-in"
        subtitle={
          currentEvent
            ? `${currentEvent.name} · ${format(new Date(currentEvent.event_date + "T00:00:00"), "dd 'de' MMM", { locale: ptBR })}`
            : ""
        }
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStrictMode((s) => !s)}
              className={
                "inline-flex items-center gap-1.5 px-3 h-10 rounded-lg border text-xs font-medium transition-colors " +
                (strictMode
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-warning/10 border-warning/40 text-warning")
              }
              title={
                strictMode
                  ? "Modo estrito: bloqueia entradas além dos ingressos"
                  : "Modo flexível: permite entradas extras com confirmação"
              }
            >
              {strictMode ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
              {strictMode ? "Estrito" : "Flexível"}
            </button>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Selecionar evento" />
              </SelectTrigger>
              <SelectContent>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <MiniStat label="Ingressos" value={stats.total} />
        <MiniStat label="Presentes" value={stats.present} accent="success" />
        <MiniStat label="Pendentes" value={stats.pending} accent="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, CPF ou telefone…"
              className="pl-12 pr-12 h-14 text-base bg-card border-border"
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar"
              >
                <X className="size-5" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-surface border border-border w-fit">
            {(["todos", "presentes", "pendentes"] as const).map((opt) => {
              const count =
                opt === "todos"
                  ? guests.length
                  : opt === "presentes"
                  ? guests.filter((g) => g.checked_in_count > 0).length
                  : guests.filter((g) => g.checked_in_count < g.ticket_quantity).length;
              const active = statusFilter === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setStatusFilter(opt)}
                  className={
                    "px-3 h-8 rounded-md text-xs font-medium capitalize transition-colors " +
                    (active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {opt} <span className="opacity-70 ml-1">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Results */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
                {query
                  ? "Nenhum convidado encontrado."
                  : statusFilter !== "todos"
                  ? `Nenhum convidado em "${statusFilter}".`
                  : "Comece digitando o nome do convidado."}
              </div>
            ) : (
              filtered.map((g) => {
                const remaining = g.ticket_quantity - g.checked_in_count;
                const fullyIn = remaining <= 0;
                return (
                  <div
                    key={g.id}
                    className="w-full rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-surface transition-[var(--transition-smooth)] p-4 flex items-center gap-3 group"
                  >
                    <button
                      type="button"
                      onClick={() => startCheckin(g)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="font-semibold truncate">{g.full_name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                        {g.cpf && <span>{formatCPF(g.cpf)}</span>}
                        {g.phone && <span>{formatPhone(g.phone)}</span>}
                        <span className="capitalize">{g.ticket_type}</span>
                      </div>
                      {g.notes && (
                        <div className="mt-2 inline-flex items-start gap-1.5 rounded-md bg-warning/10 border border-warning/30 text-warning px-2 py-1 text-[11px] leading-snug max-w-full">
                          <span className="font-semibold shrink-0">Obs:</span>
                          <span className="break-words">{g.notes}</span>
                        </div>
                      )}
                    </button>
                    <Badge
                      className={
                        fullyIn
                          ? "bg-success/15 text-success border-0 text-sm"
                          : g.checked_in_count > 0
                          ? "bg-warning/15 text-warning border-0 text-sm"
                          : "bg-muted text-muted-foreground border-0 text-sm"
                      }
                    >
                      {g.checked_in_count}/{g.ticket_quantity}
                    </Badge>
                    {g.checked_in_count > 0 && (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-9 text-warning hover:text-warning hover:bg-warning/10"
                          title="Desfazer último check-in"
                          onClick={() => setUndoTarget({ guest: g })}
                        >
                          <Undo2 className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Zerar todos os check-ins deste convidado"
                          onClick={() => setResetTarget(g)}
                        >
                          <RotateCcw className="size-4" />
                        </Button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => startCheckin(g)}
                      className={
                        "size-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 " +
                        (fullyIn
                          ? "bg-success/20 text-success"
                          : "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]")
                      }
                      aria-label="Fazer check-in"
                    >
                      <Check className="size-6" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent */}
        <aside className="rounded-2xl border border-border bg-card p-5 h-fit lg:sticky lg:top-6">
          <h3 className="font-display font-semibold mb-3">Últimos check-ins</h3>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum ainda.</p>
          ) : (
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {recent.map((c) => (
                  <motion.li
                    key={c.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-surface text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.guest_name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {format(new Date(c.checked_in_at), "HH:mm:ss")}
                      </div>
                    </div>
                    <Badge className="bg-success/15 text-success border-0 ml-2">+{c.people_count}</Badge>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </aside>
      </div>

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmGuest} onOpenChange={(o) => !o && setConfirmGuest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar entrada</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmGuest?.full_name} — {confirmGuest?.checked_in_count}/{confirmGuest?.ticket_quantity} já presentes
              {confirmGuest && confirmGuest.checked_in_count >= confirmGuest.ticket_quantity && (
                <span className="block mt-2 text-warning">
                  ⚠️ Esta pessoa já fez check-in completo. Continuar mesmo assim?
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <div className="text-sm text-muted-foreground mb-2">Quantas pessoas estão entrando agora?</div>
            <div className="flex items-center justify-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-12 rounded-full"
                onClick={() => setConfirmPeople(Math.max(1, confirmPeople - 1))}
                disabled={confirmPeople <= 1}
              >
                <MinusCircle className="size-6" />
              </Button>
              <div className="text-5xl font-display font-bold w-20 text-center">{confirmPeople}</div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-12 rounded-full"
                onClick={() => {
                  if (!confirmGuest) return;
                  const remaining = confirmGuest.ticket_quantity - confirmGuest.checked_in_count;
                  const max = strictMode ? Math.max(remaining, 1) : 99;
                  setConfirmPeople(Math.min(max, confirmPeople + 1));
                }}
                disabled={
                  strictMode &&
                  !!confirmGuest &&
                  confirmPeople >=
                    Math.max(confirmGuest.ticket_quantity - confirmGuest.checked_in_count, 1)
                }
              >
                <PlusCircle className="size-6" />
              </Button>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={performCheckin}>
              <Check className="size-4" /> Confirmar entrada
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Undo last check-in */}
      <AlertDialog open={!!undoTarget} onOpenChange={(o) => !o && setUndoTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer último check-in?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto remove o último registro de entrada de{" "}
              <strong>{undoTarget?.guest.full_name}</strong> ({undoTarget?.guest.checked_in_count}/
              {undoTarget?.guest.ticket_quantity}). Use quando o check-in foi feito por engano.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                undoTarget && undoLastCheckin(undoTarget.guest.id, undoTarget.guest.full_name)
              }
            >
              <Undo2 className="size-4" /> Desfazer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset all check-ins for guest */}
      <AlertDialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zerar todos os check-ins?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove <strong>todos</strong> os check-ins de{" "}
              <strong>{resetTarget?.full_name}</strong> ({resetTarget?.checked_in_count}/
              {resetTarget?.ticket_quantity}). Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => resetTarget && resetGuestCheckins(resetTarget)}
            >
              <RotateCcw className="size-4" /> Zerar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "success" | "warning";
}) {
  const cls =
    accent === "success"
      ? "text-success"
      : accent === "warning"
      ? "text-warning"
      : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl font-display font-bold mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}
