import React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, QrCode, ScanLine, Sparkles } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HourlyFlowPoint } from "./types";

interface HeroMetricsSectionProps {
  presentCount: number;
  capacity: number;
  validatedLastHours: number;
  lastHourDelta: number;
  vipPending: number;
  vipTotal: number;
  hourlyFlow: HourlyFlowPoint[];
  eventId?: string;
  onOpenScanner: () => void;
  onFilterVipPending?: () => void;
  hasRealEvents: boolean;
  isDemoMode: boolean;
  onEnableDemo: () => void;
}

export function HeroMetricsSection({
  presentCount,
  capacity,
  validatedLastHours,
  lastHourDelta,
  vipPending,
  vipTotal,
  hourlyFlow,
  eventId,
  onOpenScanner,
  onFilterVipPending,
  hasRealEvents,
  isDemoMode,
  onEnableDemo,
}: HeroMetricsSectionProps) {
  const occupationPct =
    capacity > 0 ? Math.min(100, Math.round((presentCount / capacity) * 100)) : 0;

  const vipCheckedIn = Math.max(vipTotal - vipPending, 0);
  const vipPct = vipTotal > 0 ? Math.round((vipCheckedIn / vipTotal) * 100) : 0;

  const peakHour = hourlyFlow.reduce<HourlyFlowPoint | null>(
    (best, cur) => (!best || cur.validados > best.validados ? cur : best),
    null,
  );

  return (
    <section
      aria-label="Métricas da portaria em tempo real"
      className="grid grid-cols-1 xl:grid-cols-12 gap-5 mb-5"
    >
      {/* Left 7-column Hero Backdrop + Overlapping Glass Metrics */}
      <div className="xl:col-span-7 flex flex-col justify-between relative rounded-[24px] overflow-hidden border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] min-h-[340px] sm:min-h-[360px]">
        {/* Atmospheric Stage Background */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(28, 28, 32, 0.92) 0%, rgba(20, 20, 23, 0.96) 52%, rgba(42, 24, 14, 0.88) 100%)",
          }}
        />
        {/* Vibrant Amber Stage Illumination behind overlapping glass */}
        <div
          aria-hidden="true"
          className="absolute -right-12 -bottom-10 w-[380px] h-[380px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(255, 107, 0, 0.48) 0%, rgba(255, 107, 0, 0.16) 42%, transparent 72%)",
            filter: "blur(18px)",
          }}
        />
        {/* Delicate Concentric Geometry (inspired by editorial reference) */}
        <svg
          aria-hidden="true"
          className="absolute right-6 top-6 w-64 h-64 opacity-[0.14] pointer-events-none"
          viewBox="0 0 240 240"
          fill="none"
        >
          <circle cx="120" cy="120" r="46" stroke="white" strokeWidth="1" />
          <circle cx="120" cy="120" r="80" stroke="white" strokeWidth="1" strokeDasharray="4 6" />
          <circle cx="120" cy="120" r="114" stroke="#FF6B00" strokeWidth="1" />
        </svg>

        {/* Top Hero Copy + Primary CTA */}
        <div className="relative z-10 p-6 sm:p-7 pb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] font-medium tracking-wide text-white/75 mb-4">
            <span className="size-1.5 rounded-full bg-[#FF6B00] shadow-[0_0_8px_#FF6B00]" />
            Operação em Tempo Real
          </div>

          <h2 className="font-display font-bold text-2xl sm:text-[32px] leading-[1.12] tracking-tight text-white max-w-md">
            Controle de Portaria &amp; Fluxo de Entrada
          </h2>
          <p className="text-sm text-white/55 mt-2.5 max-w-md leading-relaxed">
            Valide ingressos, monitore a lotação da casa e acompanhe a lista VIP com sincronização
            instantânea.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <button
              type="button"
              onClick={onOpenScanner}
              title="Abrir leitor de QR Code e validação rápida de convidados"
              className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-[#FF6B00] hover:bg-[#ff7c1f] text-white text-sm font-semibold shadow-[0_0_26px_rgba(255,107,0,0.45)] transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <QrCode className="size-4 stroke-[2]" aria-hidden="true" />
              Validar QR Code
            </button>

            <Link
              to="/checkin"
              search={eventId && !isDemoMode ? { eventId } : {}}
              title="Abrir painel completo de check-in manual"
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.1] text-white/90 text-sm font-medium transition-colors"
            >
              <ScanLine className="size-4 stroke-[1.75]" aria-hidden="true" />
              Check-in Manual
            </Link>

            {!hasRealEvents && !isDemoMode && (
              <button
                type="button"
                onClick={onEnableDemo}
                title="Carregar dados fictícios para demonstração visual do painel"
                className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-white/75 transition-colors cursor-pointer"
              >
                <Sparkles className="size-3.5 text-[#FF6B00]" aria-hidden="true" />
                Ver com Dados Demo
              </button>
            )}
          </div>
        </div>

        {/* Overlapping Floating Glass Metric Cards */}
        <div className="relative z-20 px-4 pb-4 -mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-stretch">
            {/* Card 1: Lotação Atual */}
            <div className="sm:col-span-5 glass-card-elevated p-4 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-white/55">Lotação Atual</span>
                <span className="text-[11px] font-semibold text-[#FF6B00] tabular-nums">
                  {occupationPct}%
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1.5 font-display font-bold tabular-nums">
                <span className="text-2xl sm:text-[26px] text-white tracking-tight">
                  {presentCount}
                </span>
                <span className="text-sm sm:text-base font-medium text-white/40">/ {capacity}</span>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#FF6B00] shadow-[0_0_12px_rgba(255,107,0,0.7)] transition-all duration-500"
                  style={{ width: `${occupationPct}%` }}
                />
              </div>
            </div>

            {/* Card 2: Validados nas últimas horas */}
            <div className="sm:col-span-3 glass-card-elevated p-4 flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5">
              <span className="text-xs font-medium text-white/55 leading-snug">
                Validados nas últimas horas
              </span>
              <div className="mt-2 font-display font-bold text-2xl sm:text-[26px] text-white tabular-nums tracking-tight">
                {validatedLastHours}
              </div>
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-white/60">
                <span className="size-2 rounded-full bg-[#FF6B00] shadow-[0_0_8px_#FF6B00] shrink-0" />
                <span className="truncate tabular-nums">+{lastHourDelta} última hora</span>
              </div>
            </div>

            {/* Card 3: Pendentes na Lista VIP + Quick Arrow */}
            <div className="sm:col-span-4 glass-card-elevated p-4 flex items-center justify-between gap-3 transition-transform duration-200 hover:-translate-y-0.5">
              <button
                type="button"
                onClick={onFilterVipPending}
                title="Filtrar convidados pendentes na lista abaixo"
                className="min-w-0 flex flex-col justify-between h-full text-left cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] rounded-xl"
              >
                <span className="text-xs font-medium text-white/55 group-hover:text-white/80 leading-snug transition-colors">
                  Pendentes na Lista VIP
                </span>
                <div className="mt-2 font-display font-bold text-2xl sm:text-[26px] text-white tabular-nums tracking-tight">
                  {vipPending}
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-white/60">
                  <span className="size-2 rounded-full bg-[#FF6B00]/80 shrink-0" />
                  <span className="truncate">Ver pendentes</span>
                </div>
              </button>

              <Link
                to="/checkin"
                search={eventId && !isDemoMode ? { eventId } : {}}
                title="Abrir painel de Check-in Manual"
                aria-label="Abrir painel de Check-in Manual"
                className="size-10 shrink-0 rounded-full bg-[#121214]/90 hover:bg-[#FF6B00] border border-white/[0.12] hover:border-[#FF6B00] text-white flex items-center justify-center transition-all duration-200 shadow-lg"
              >
                <ArrowRight className="size-4 stroke-[2]" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right 5-column Stacked Glass Bento Cards */}
      <div className="xl:col-span-5 flex flex-col gap-5">
        {/* Top Card: Validados nas últimas horas (Hourly Spline Chart) */}
        <div className="glass-card p-5 flex-1 flex flex-col justify-between min-h-[175px]">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-white/85">Fluxo de Portaria por Hora</h3>
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-[#FF6B00] shadow-[0_0_10px_#FF6B00]"
              />
            </div>
            <div className="flex items-center gap-2">
              {peakHour && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#121214]/90 border border-white/[0.1] text-white/90 tabular-nums">
                  Pico {peakHour.validados} · {peakHour.hour}
                </span>
              )}
              {eventId && !isDemoMode && (
                <Link
                  to="/eventos/$eventId/dashboard"
                  params={{ eventId }}
                  title="Abrir relatório completo de lotação e ranking de operadores"
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FF6B00]/15 hover:bg-[#FF6B00]/25 border border-[#FF6B00]/30 text-[#FF8C38] transition-colors whitespace-nowrap"
                >
                  Relatório completo
                </Link>
              )}
            </div>
          </div>

          <div className="h-[120px] w-full">
            {hourlyFlow.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyFlow} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="portariaAmberGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "rgba(255,255,255,0.42)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.32)", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                  />
                  <Tooltip
                    cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
                    contentStyle={{
                      background: "rgba(18, 18, 22, 0.94)",
                      backdropFilter: "blur(16px)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: "14px",
                      fontSize: "12px",
                      color: "#fff",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="meta"
                    name="Ritmo esperado"
                    stroke="rgba(255,255,255,0.28)"
                    strokeWidth={1.5}
                    fill="transparent"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="validados"
                    name="Validados"
                    stroke="#FF6B00"
                    strokeWidth={2.5}
                    fill="url(#portariaAmberGradient)"
                    activeDot={{
                      r: 5,
                      fill: "#FF6B00",
                      stroke: "#ffffff",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-white/40">
                Aguardando primeiros check-ins para gerar curva horária…
              </div>
            )}
          </div>
        </div>

        {/* Bottom Card: Split VIP Summary + QR Reader Quick Tile */}
        <div className="glass-card p-5 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
          <div className="sm:col-span-7 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-white/85">Lista VIP</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#FF6B00] tabular-nums">
                {vipPct}% presente
              </span>
            </div>

            {/* Subtle inline sparkline wave */}
            <svg aria-hidden="true" className="w-28 h-7 my-2" viewBox="0 0 120 28" fill="none">
              <path
                d="M2 22 C18 22, 24 8, 38 14 C52 20, 62 4, 78 12 C94 20, 102 6, 118 10"
                stroke="#FF6B00"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>

            <div className="flex items-baseline gap-2">
              <span className="font-display font-bold text-3xl text-white tabular-nums tracking-tight">
                {vipPending}
              </span>
              <span className="text-xs text-white/50">pendentes de {vipTotal} VIPs</span>
            </div>
          </div>

          {/* Interactive QR Code Scanner Tile */}
          <button
            type="button"
            onClick={onOpenScanner}
            className="sm:col-span-5 h-full min-h-[118px] rounded-[20px] bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-[#FF6B00]/45 p-4 flex flex-col items-center justify-center text-center gap-2 transition-all duration-200 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
          >
            <div className="relative size-12 rounded-2xl bg-[#FF6B00]/12 border border-[#FF6B00]/30 flex items-center justify-center text-[#FF6B00] group-hover:scale-105 group-hover:shadow-[0_0_24px_rgba(255,107,0,0.4)] transition-all">
              <QrCode className="size-6 stroke-[1.75]" aria-hidden="true" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white/90">Leitor QR Code</div>
              <div className="text-[11px] text-white/45 mt-0.5">Toque para ler</div>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}
