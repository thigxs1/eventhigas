import React, { useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, MapPin, QrCode, Search, Sparkles, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PortariaEvent } from "./types";

interface PortariaHeaderProps {
  event: PortariaEvent | null;
  events: PortariaEvent[];
  selectedEventId: string;
  onSelectEvent: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenScanner: () => void;
  onFilterVipPending?: () => void;
  vipPendingCount: number;
  userEmail?: string | null;
  isDemoMode: boolean;
  hasRealEvents: boolean;
  onToggleDemoMode: () => void;
}

export function PortariaHeader({
  event,
  events,
  selectedEventId,
  onSelectEvent,
  searchQuery,
  onSearchChange,
  onOpenScanner,
  onFilterVipPending,
  vipPendingCount,
  userEmail,
  isDemoMode,
  hasRealEvents,
  onToggleDemoMode,
}: PortariaHeaderProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const eventTitle = event?.name ?? "Portaria & Lista";
  const eventMeta = event
    ? [
        format(new Date(event.event_date + "T00:00:00"), "EEE, dd 'de' MMM", { locale: ptBR }),
        event.event_time ? event.event_time.slice(0, 5) : null,
        event.location,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Nenhum evento selecionado";

  const operatorInitial = userEmail ? userEmail.slice(0, 2).toUpperCase() : "OP";

  return (
    <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6">
      {/* Left: Party / Event Title + Metadata */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-full bg-[#FF6B00] shadow-[0_0_12px_#FF6B00] shrink-0"
            />
            <h1 className="font-display font-bold text-2xl sm:text-[28px] tracking-tight text-white/95 truncate">
              {eventTitle}
            </h1>
          </div>

          {/* Inline Event Switcher when multiple real events exist */}
          {events.length > 1 && !isDemoMode && (
            <Select value={selectedEventId} onValueChange={onSelectEvent}>
              <SelectTrigger
                aria-label="Alternar evento ativo"
                className="h-8 w-auto min-w-[140px] max-w-[220px] rounded-full bg-white/[0.04] border-white/[0.08] text-xs text-white/80 hover:bg-white/[0.08] px-3 gap-1.5"
              >
                <SelectValue placeholder="Trocar evento" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1e] border-white/[0.1] text-white rounded-2xl">
                {events.map((ev) => (
                  <SelectItem key={ev.id} value={ev.id} className="rounded-xl">
                    {ev.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {isDemoMode && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FF6B00]/15 text-[#FF8C38] border border-[#FF6B00]/30">
              <Sparkles className="size-3" aria-hidden="true" />
              Prévia Demo
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs sm:text-[13px] text-white/50 pl-5">
          <span className="inline-flex items-center gap-1.5 capitalize">
            <MapPin className="size-3.5 text-white/40" aria-hidden="true" />
            {eventMeta}
          </span>
        </div>
      </div>

      {/* Right: Integrated Search Field + Quick Controls */}
      <div className="flex items-center gap-2.5 w-full lg:w-auto">
        <div className="relative flex-1 lg:w-[320px] xl:w-[360px]">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/40"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar convidado na lista…"
            aria-label="Buscar convidado na lista"
            className="w-full h-11 pl-10 pr-14 rounded-[16px] text-sm text-white/95 placeholder:text-white/40 bg-white/[0.04] border border-white/[0.08] backdrop-blur-xl transition-all duration-200 focus:outline-none focus:border-[#FF6B00]/60 focus:bg-white/[0.06] focus:shadow-[0_0_24px_rgba(255,107,0,0.16)]"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Limpar busca"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 size-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ) : (
            <kbd
              aria-hidden="true"
              className="hidden sm:inline-flex items-center justify-center absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md text-[10px] font-medium text-white/35 bg-white/[0.05] border border-white/[0.08]"
            >
              /
            </kbd>
          )}
        </div>

        {/* Toggle Demo / Live */}
        {hasRealEvents && (
          <button
            type="button"
            onClick={onToggleDemoMode}
            title={isDemoMode ? "Voltar para dados reais" : "Visualizar prévia demo"}
            className="hidden sm:inline-flex items-center h-11 px-3.5 rounded-[16px] text-xs font-medium text-white/65 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] transition-colors whitespace-nowrap"
          >
            {isDemoMode ? "Dados Reais" : "Demo"}
          </button>
        )}

        {/* Quick QR Code Reader Trigger */}
        <button
          type="button"
          onClick={onOpenScanner}
          aria-label="Abrir Leitor de QR Code e Validação Rápida"
          title="Abrir Leitor de QR Code e Validação Rápida"
          className="size-11 shrink-0 rounded-[16px] flex items-center justify-center bg-white/[0.04] hover:bg-[#FF6B00]/15 text-white/75 hover:text-[#FF6B00] border border-white/[0.08] hover:border-[#FF6B00]/40 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
        >
          <QrCode className="size-[18px] stroke-[1.75]" aria-hidden="true" />
        </button>

        {/* VIP Pending Filter Bell Button */}
        <button
          type="button"
          onClick={onFilterVipPending}
          aria-label={`Ver pendentes na Lista VIP (${vipPendingCount})`}
          title={`Filtrar pendentes na Lista VIP (${vipPendingCount})`}
          className="relative size-11 shrink-0 rounded-[16px] hidden sm:flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-[#FF6B00]/40 text-white/70 hover:text-white transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
        >
          <Bell className="size-[18px] stroke-[1.65]" aria-hidden="true" />
          {vipPendingCount > 0 && (
            <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-[#FF6B00] shadow-[0_0_8px_#FF6B00]" />
          )}
        </button>

        {/* Operator Badge */}
        <div
          title={`Operador conectado: ${userEmail ?? "Operador de Portaria"}`}
          aria-label={`Operador conectado: ${userEmail ?? "Operador de Portaria"}`}
          className="size-11 shrink-0 rounded-[16px] bg-gradient-to-br from-[#FF6B00]/30 to-white/[0.05] border border-white/[0.12] flex items-center justify-center font-display font-semibold text-xs text-white/95 select-none"
        >
          {operatorInitial}
        </div>
      </div>
    </header>
  );
}
