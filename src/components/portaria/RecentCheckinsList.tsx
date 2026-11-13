import React, { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Clock, Filter, Ticket, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { GuestAvatar } from "./GuestAvatar";
import { isVipTicketType, type PortariaListRow } from "./types";

export type ListFilter = "todos" | "vip" | "validados" | "pendentes";

interface RecentCheckinsListProps {
  rows: PortariaListRow[];
  searchQuery: string;
  loading: boolean;
  onQuickCheckin: (guestId: string, fullName: string) => void;
  checkingInId: string | null;
  activeFilter?: ListFilter;
  onFilterChange?: (filter: ListFilter) => void;
}

export function RecentCheckinsList({
  rows,
  searchQuery,
  loading,
  onQuickCheckin,
  checkingInId,
  activeFilter,
  onFilterChange,
}: RecentCheckinsListProps) {
  const [internalFilter, setInternalFilter] = useState<ListFilter>("todos");
  const filter = activeFilter ?? internalFilter;
  const setFilter = onFilterChange ?? setInternalFilter;

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (filter === "vip" && !isVipTicketType(row.ticketType)) return false;
      if (filter === "validados" && !row.isValidated) return false;
      if (filter === "pendentes" && row.checkedInTotal >= row.ticketQuantity) return false;
      return true;
    });
  }, [rows, filter]);

  const filterOptions: { id: ListFilter; label: string; title: string }[] = [
    { id: "todos", label: "Todos", title: "Mostrar todos os convidados da lista" },
    { id: "vip", label: "VIP", title: "Filtrar apenas convidados VIP e Camarote" },
    {
      id: "validados",
      label: "Validados",
      title: "Mostrar apenas convidados com entrada validada",
    },
    { id: "pendentes", label: "Pendentes", title: "Mostrar convidados aguardando check-in" },
  ];

  return (
    <section
      id="portaria-lista"
      aria-label="Últimas entradas na portaria"
      className="glass-card p-5 sm:p-6 scroll-mt-4"
    >
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-semibold text-lg text-white/95">
            {searchQuery.trim() ? "Resultados da Lista" : "Últimas Entradas"}
          </h2>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/[0.06] text-white/70 border border-white/[0.08] tabular-nums">
            {filteredRows.length}
          </span>
        </div>

        {/* Clean Pill Filter Selector */}
        <div
          role="tablist"
          aria-label="Filtrar entradas"
          className="inline-flex items-center gap-1 p-1 rounded-full bg-white/[0.04] border border-white/[0.08] w-fit overflow-x-auto max-w-full"
        >
          <Filter className="size-3.5 text-white/40 ml-2.5 mr-1 shrink-0" aria-hidden="true" />
          {filterOptions.map((opt) => {
            const active = filter === opt.id;
            return (
              <button
                key={opt.id}
                role="tab"
                aria-selected={active}
                type="button"
                title={opt.title}
                onClick={() => setFilter(opt.id)}
                className={cn(
                  "px-3.5 h-8 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                  active
                    ? "bg-[#FF6B00] text-white shadow-[0_0_16px_rgba(255,107,0,0.35)]"
                    : "text-white/55 hover:text-white/90 hover:bg-white/[0.04]",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subtle Column Header (No Traditional Table Borders) */}
      <div className="hidden md:grid grid-cols-12 items-center px-3 pb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-white/40 border-b border-white/[0.05]">
        <div className="col-span-5">Convidado</div>
        <div className="col-span-3">Tipo de Ingresso</div>
        <div className="col-span-2">Horário de Check-in</div>
        <div className="col-span-2 text-right">Portaria</div>
      </div>

      {/* Rows */}
      {loading ? (
        <div className="py-12 text-center text-sm text-white/45">
          Sincronizando lista da portaria…
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="py-12 text-center">
          <UserCheck
            className="size-9 text-white/25 mx-auto mb-2.5 stroke-[1.5]"
            aria-hidden="true"
          />
          <p className="text-sm text-white/55">
            {searchQuery.trim()
              ? "Nenhum convidado encontrado para esta busca."
              : "Nenhuma entrada registrada ainda neste filtro."}
          </p>
        </div>
      ) : (
        <div role="list" className="divide-y-0">
          {filteredRows.map((row) => {
            const vip = isVipTicketType(row.ticketType);
            const fullyIn = row.checkedInTotal >= row.ticketQuantity;
            const timeLabel = row.checkedInAt
              ? format(new Date(row.checkedInAt), "HH:mm")
              : "Aguardando";
            const relativeLabel = row.checkedInAt
              ? formatDistanceToNow(new Date(row.checkedInAt), {
                  addSuffix: true,
                  locale: ptBR,
                })
              : `${row.checkedInTotal}/${row.ticketQuantity} ingressos`;

            return (
              <div
                key={row.key}
                role="listitem"
                className="glass-row-divider grid grid-cols-1 md:grid-cols-12 items-center gap-3 md:gap-4 px-3 py-3.5 transition-colors hover:bg-white/[0.025] rounded-xl"
              >
                {/* Avatar + Nome */}
                <div className="md:col-span-5 flex items-center gap-3.5 min-w-0">
                  <GuestAvatar
                    name={row.fullName}
                    ticketType={row.ticketType}
                    validated={row.isValidated}
                    avatarUrl={row.avatarUrl}
                  />
                  <div className="min-w-0">
                    <div className="text-[15px] font-medium text-white/95 truncate">
                      {row.fullName}
                    </div>
                    <div className="text-xs text-white/45 truncate mt-0.5 flex items-center gap-2">
                      {row.notes ? (
                        <span className="truncate">{row.notes}</span>
                      ) : row.cpf ? (
                        <span className="tabular-nums">
                          CPF •••.{row.cpf.slice(-5, -2)}-{row.cpf.slice(-2)}
                        </span>
                      ) : (
                        <span>
                          {row.checkedInTotal}/{row.ticketQuantity}{" "}
                          {row.ticketQuantity === 1 ? "ingresso" : "ingressos"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tipo de Ingresso */}
                <div className="md:col-span-3 flex items-center justify-between md:justify-start">
                  <span className="md:hidden text-xs text-white/40">Ingresso</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium capitalize border",
                      vip
                        ? "bg-[#FF6B00]/12 text-[#FF8C38] border-[#FF6B00]/25"
                        : "bg-white/[0.04] text-white/75 border-white/[0.08]",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-1.5 rounded-full",
                        vip ? "bg-[#FF6B00] shadow-[0_0_8px_#FF6B00]" : "bg-white/40",
                      )}
                    />
                    <Ticket className="size-3 opacity-70" aria-hidden="true" />
                    {row.ticketType}
                  </span>
                </div>

                {/* Horário de Check-in */}
                <div className="md:col-span-2 flex items-center justify-between md:block">
                  <span className="md:hidden text-xs text-white/40">Horário</span>
                  <div>
                    <div className="text-sm font-medium text-white/90 tabular-nums flex items-center gap-1.5">
                      <Clock
                        className="size-3.5 text-white/35 hidden sm:inline"
                        aria-hidden="true"
                      />
                      {timeLabel}
                    </div>
                    <div className="text-[11px] text-white/45 truncate">{relativeLabel}</div>
                  </div>
                </div>

                {/* Status / Ação Rápida */}
                <div className="md:col-span-2 flex items-center justify-end">
                  {!fullyIn ? (
                    <button
                      type="button"
                      disabled={checkingInId === row.guestId}
                      onClick={() => onQuickCheckin(row.guestId, row.fullName)}
                      title={
                        row.checkedInTotal > 0
                          ? "Registrar mais 1 entrada para este convidado"
                          : "Confirmar check-in de entrada na portaria"
                      }
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full bg-[#FF6B00] hover:bg-[#ff7d24] disabled:opacity-50 text-white text-xs font-semibold shadow-[0_0_18px_rgba(255,107,0,0.35)] transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Check className="size-3.5 stroke-[2.5]" aria-hidden="true" />
                      {checkingInId === row.guestId
                        ? "Validando…"
                        : row.checkedInTotal > 0
                          ? `Validar (+1 · ${row.checkedInTotal}/${row.ticketQuantity})`
                          : "Validar Entrada"}
                    </button>
                  ) : (
                    <span
                      title="Check-in completo para este convidado"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.04] border border-white/[0.08] text-white/80 tabular-nums whitespace-nowrap"
                    >
                      <span className="size-1.5 rounded-full bg-[#FF6B00] shadow-[0_0_8px_#FF6B00]" />
                      {row.ticketQuantity > 1
                        ? `Validado (${row.checkedInTotal}/${row.ticketQuantity})`
                        : "Validado"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
