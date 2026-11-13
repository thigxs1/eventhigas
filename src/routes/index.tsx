import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { normalizeText, onlyDigits } from "@/lib/format";
import { PortariaHeader } from "@/components/portaria/PortariaHeader";
import { HeroMetricsSection } from "@/components/portaria/HeroMetricsSection";
import { RecentCheckinsList, type ListFilter } from "@/components/portaria/RecentCheckinsList";
import { QrScannerModal } from "@/components/portaria/QrScannerModal";
import {
  buildDemoPortariaData,
  isVipTicketType,
  type HourlyFlowPoint,
  type PortariaCheckin,
  type PortariaEvent,
  type PortariaGuest,
  type PortariaListRow,
} from "@/components/portaria/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Portaria & Lista — Casa de Eventos" },
      {
        name: "description",
        content:
          "Dashboard em tempo real para controle de entrada de eventos, lotação e lista VIP.",
      },
    ],
  }),
  component: PortariaDashboardPage,
});

function PortariaDashboardPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<PortariaEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [guests, setGuests] = useState<PortariaGuest[]>([]);
  const [checkins, setCheckins] = useState<PortariaCheckin[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [listFilter, setListFilter] = useState<ListFilter>("todos");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  const [demoMode, setDemoMode] = useState(false);
  const [demoValidatedIds, setDemoValidatedIds] = useState<Record<string, string>>({});

  const demoData = useMemo(() => buildDemoPortariaData(), []);

  const loadPortariaData = useCallback(async () => {
    const { data: evData } = await supabase
      .from("events")
      .select("id,name,event_date,event_time,location,status")
      .order("event_date", { ascending: false })
      .limit(20);

    const eventList = (evData ?? []) as PortariaEvent[];
    setEvents(eventList);

    if (eventList.length === 0) {
      setGuests([]);
      setCheckins([]);
      setLoading(false);
      return;
    }

    const activeFirst =
      eventList.find((e) => e.id === selectedEventId) ??
      eventList.find((e) => e.status === "active") ??
      eventList[0];

    if (activeFirst.id !== selectedEventId) {
      setSelectedEventId(activeFirst.id);
    }

    const [{ data: gs }, { data: cks }] = await Promise.all([
      supabase
        .from("guests")
        .select(
          "id,event_id,full_name,cpf,phone,ticket_quantity,ticket_type,checked_in_count,status,notes",
        )
        .eq("event_id", activeFirst.id)
        .order("full_name", { ascending: true })
        .limit(5000),
      supabase
        .from("checkins")
        .select(
          "id,event_id,guest_id,checked_in_at,people_count,operator,guest:guests(full_name,ticket_type,cpf,phone,notes)",
        )
        .eq("event_id", activeFirst.id)
        .order("checked_in_at", { ascending: false })
        .limit(120),
    ]);

    setGuests((gs ?? []) as PortariaGuest[]);
    setCheckins(
      (cks ?? []).map((row) => {
        const guestRel = (
          row as {
            guest?: {
              full_name?: string;
              ticket_type?: string;
              cpf?: string | null;
              phone?: string | null;
              notes?: string | null;
            } | null;
          }
        ).guest;
        return {
          id: row.id,
          event_id: row.event_id,
          guest_id: row.guest_id,
          checked_in_at: row.checked_in_at,
          people_count: row.people_count,
          operator: row.operator,
          guest_name: guestRel?.full_name ?? "Convidado",
          ticket_type: guestRel?.ticket_type ?? "pista",
          cpf: guestRel?.cpf ?? null,
          phone: guestRel?.phone ?? null,
          notes: guestRel?.notes ?? null,
        };
      }),
    );
    setLoading(false);
  }, [selectedEventId]);

  useEffect(() => {
    loadPortariaData();
  }, [loadPortariaData]);

  useRealtimeSync(
    selectedEventId ? `portaria-event-${selectedEventId}` : "portaria-dashboard-sync",
    ["guests", "checkins"],
    loadPortariaData,
    selectedEventId ? { column: "event_id", value: selectedEventId } : undefined,
  );
  useRealtimeSync("portaria-events-sync", ["events"], loadPortariaData);

  const guestsWithNorm = useMemo(
    () =>
      guests.map((g) => ({
        guest: g,
        nameNorm: normalizeText(g.full_name),
        typeNorm: normalizeText(g.ticket_type),
      })),
    [guests],
  );

  const hasRealEvents = events.length > 0;
  const activeEvent = useMemo(
    () =>
      demoMode
        ? demoData.event
        : (events.find((e) => e.id === selectedEventId) ?? events[0] ?? null),
    [demoMode, demoData.event, events, selectedEventId],
  );

  // Derived real-time metrics
  const metrics = useMemo(() => {
    if (demoMode) {
      const extraValidated = Object.keys(demoValidatedIds).length;
      return {
        presentCount: demoData.presentCount + extraValidated,
        capacity: demoData.capacity,
        validatedLastHours: demoData.validatedLastHours + extraValidated,
        lastHourDelta: demoData.lastHourDelta + extraValidated,
        vipPending: Math.max(demoData.vipPending - extraValidated, 0),
        vipTotal: demoData.vipTotal,
        hourlyFlow: demoData.hourlyFlow,
      };
    }

    const approvedGuests = guests.filter((g) => g.status === "approved");
    const capacity = approvedGuests.reduce((sum, g) => sum + (g.ticket_quantity ?? 0), 0);
    const presentCount = approvedGuests.reduce((sum, g) => sum + (g.checked_in_count ?? 0), 0);

    const nowMs = Date.now();
    const threeHoursAgo = nowMs - 3 * 60 * 60 * 1000;
    const oneHourAgo = nowMs - 60 * 60 * 1000;

    let validatedLastHours = 0;
    let lastHourDelta = 0;
    const hourBuckets = new Map<string, number>();

    for (const c of checkins) {
      const ts = new Date(c.checked_in_at).getTime();
      if (ts >= threeHoursAgo) validatedLastHours += c.people_count;
      if (ts >= oneHourAgo) lastHourDelta += c.people_count;

      const label = format(new Date(c.checked_in_at), "HH:00");
      hourBuckets.set(label, (hourBuckets.get(label) ?? 0) + c.people_count);
    }

    const hourlyFlow: HourlyFlowPoint[] = Array.from(hourBuckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([hour, validados], idx, arr) => {
        const avg = Math.round(arr.reduce((acc, [, v]) => acc + v, 0) / Math.max(arr.length, 1));
        return { hour, validados, meta: Math.max(avg, idx > 0 ? arr[idx - 1][1] : avg) };
      });

    const vipGuests = guests.filter(
      (g) => isVipTicketType(g.ticket_type) && g.status !== "rejected",
    );
    const vipTotal = vipGuests.reduce((sum, g) => sum + (g.ticket_quantity ?? 0), 0);
    const vipPending = vipGuests.reduce((sum, g) => {
      if (g.status === "pending") return sum + (g.ticket_quantity ?? 1);
      return sum + Math.max((g.ticket_quantity ?? 1) - (g.checked_in_count ?? 0), 0);
    }, 0);

    return {
      presentCount,
      capacity,
      validatedLastHours,
      lastHourDelta,
      vipPending,
      vipTotal,
      hourlyFlow,
    };
  }, [demoMode, demoData, demoValidatedIds, guests, checkins]);

  // Build rows for either Recent Check-ins feed or Live Search across guests
  const listRows = useMemo<PortariaListRow[]>(() => {
    const q = searchQuery.trim();

    if (demoMode) {
      const demoCheckinRows: PortariaListRow[] = [
        ...Object.entries(demoValidatedIds).map(([guestId, timestamp]) => {
          const g = demoData.pendingGuests.find((item) => item.id === guestId);
          return {
            key: `demo-new-${guestId}`,
            guestId,
            fullName: g?.full_name ?? "Convidado VIP",
            ticketType: g?.ticket_type ?? "VIP",
            cpf: g?.cpf ?? null,
            phone: g?.phone ?? null,
            notes: g?.notes ?? null,
            checkedInAt: timestamp,
            peopleCount: 1,
            checkedInTotal: (g?.checked_in_count ?? 0) + 1,
            ticketQuantity: g?.ticket_quantity ?? 1,
            isValidated: true,
          };
        }),
        ...demoData.recentCheckins.map((c) => ({
          key: c.id,
          guestId: c.guest_id,
          fullName: c.guest_name,
          ticketType: c.ticket_type,
          cpf: c.cpf,
          phone: c.phone,
          notes: c.notes,
          checkedInAt: c.checked_in_at,
          peopleCount: c.people_count,
          checkedInTotal: c.people_count,
          ticketQuantity: c.people_count,
          isValidated: true,
        })),
      ];

      const demoPendingRows: PortariaListRow[] = demoData.pendingGuests
        .filter((g) => !demoValidatedIds[g.id])
        .map((g) => ({
          key: `demo-pending-${g.id}`,
          guestId: g.id,
          fullName: g.full_name,
          ticketType: g.ticket_type,
          cpf: g.cpf,
          phone: g.phone,
          notes: g.notes,
          checkedInAt: null,
          peopleCount: 0,
          checkedInTotal: g.checked_in_count,
          ticketQuantity: g.ticket_quantity,
          isValidated: false,
        }));

      const combined = q
        ? [...demoPendingRows, ...demoCheckinRows]
        : [...demoCheckinRows, ...demoPendingRows];
      if (!q) return combined;
      const qNorm = normalizeText(q);
      const qDigits = onlyDigits(q);
      return combined.filter(
        (r) =>
          normalizeText(r.fullName).includes(qNorm) ||
          normalizeText(r.ticketType).includes(qNorm) ||
          (qDigits.length >= 3 && (r.cpf?.includes(qDigits) || r.phone?.includes(qDigits))),
      );
    }

    const latestByGuest = new Map<string, string>();
    for (const c of checkins) {
      if (!latestByGuest.has(c.guest_id)) {
        latestByGuest.set(c.guest_id, c.checked_in_at);
      }
    }

    const guestById = new Map(guests.map((g) => [g.id, g]));

    // When searching, show matching guests from full event list (pre-normalized)
    if (q) {
      const qNorm = normalizeText(q);
      const qDigits = onlyDigits(q);
      const matches: PortariaListRow[] = [];
      for (const item of guestsWithNorm) {
        const g = item.guest;
        if (g.status !== "approved") continue;
        const hit =
          item.nameNorm.includes(qNorm) ||
          item.typeNorm.includes(qNorm) ||
          (qDigits.length >= 3 && (g.cpf?.includes(qDigits) || g.phone?.includes(qDigits)));
        if (!hit) continue;
        matches.push({
          key: `guest-${g.id}`,
          guestId: g.id,
          fullName: g.full_name,
          ticketType: g.ticket_type,
          cpf: g.cpf,
          phone: g.phone,
          notes: g.notes,
          checkedInAt: latestByGuest.get(g.id) ?? null,
          peopleCount: g.checked_in_count,
          checkedInTotal: g.checked_in_count,
          ticketQuantity: g.ticket_quantity,
          isValidated: g.checked_in_count > 0,
        });
        if (matches.length >= 40) break;
      }
      return matches;
    }

    // Default feed: recent check-ins followed by pending VIPs if feed is short
    const checkinRows: PortariaListRow[] = checkins.slice(0, 20).map((c) => {
      const g = guestById.get(c.guest_id);
      return {
        key: c.id,
        guestId: c.guest_id,
        fullName: c.guest_name,
        ticketType: c.ticket_type,
        cpf: c.cpf,
        phone: c.phone,
        notes: c.notes,
        checkedInAt: c.checked_in_at,
        peopleCount: c.people_count,
        checkedInTotal: g?.checked_in_count ?? c.people_count,
        ticketQuantity: g?.ticket_quantity ?? c.people_count,
        isValidated: true,
      };
    });

    const pendingLimit = listFilter === "todos" ? 8 : 60;
    const pendingRows: PortariaListRow[] = guests
      .filter((g) => g.status === "approved" && g.checked_in_count < g.ticket_quantity)
      .slice(0, pendingLimit)
      .map((g) => ({
        key: `pending-${g.id}`,
        guestId: g.id,
        fullName: g.full_name,
        ticketType: g.ticket_type,
        cpf: g.cpf,
        phone: g.phone,
        notes: g.notes,
        checkedInAt: null,
        peopleCount: 0,
        checkedInTotal: g.checked_in_count,
        ticketQuantity: g.ticket_quantity,
        isValidated: false,
      }));

    return [...checkinRows, ...pendingRows];
  }, [
    searchQuery,
    listFilter,
    demoMode,
    demoData,
    demoValidatedIds,
    guests,
    guestsWithNorm,
    checkins,
  ]);

  const scannerGuests = useMemo<PortariaGuest[]>(() => {
    if (demoMode) {
      return demoData.pendingGuests.map((g) =>
        demoValidatedIds[g.id] ? { ...g, checked_in_count: g.ticket_quantity } : g,
      );
    }
    return guests.filter((g) => g.status === "approved");
  }, [demoMode, demoData.pendingGuests, demoValidatedIds, guests]);

  function handleFilterVipPending() {
    setSearchQuery("");
    setListFilter("pendentes");
    if (typeof document !== "undefined") {
      document
        .getElementById("portaria-lista")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  async function handleQuickCheckin(guestId: string, fullName: string) {
    if (demoMode) {
      setDemoValidatedIds((prev) => ({
        ...prev,
        [guestId]: new Date().toISOString(),
      }));
      toast.success(`Entrada validada: ${fullName}`);
      return;
    }

    if (!activeEvent) return;
    const strictMode =
      typeof window === "undefined"
        ? true
        : window.localStorage.getItem("checkin_strict_mode") !== "false";
    const targetGuest = guests.find((g) => g.id === guestId);
    if (targetGuest && strictMode && targetGuest.checked_in_count >= targetGuest.ticket_quantity) {
      toast.error("Limite de ingressos atingido para este convidado");
      return;
    }

    setCheckingInId(guestId);
    const { error } = await supabase.from("checkins").insert({
      event_id: activeEvent.id,
      guest_id: guestId,
      people_count: 1,
      operator: user?.email ?? null,
    });
    setCheckingInId(null);

    if (error) {
      toast.error(error.message || "Erro ao registrar check-in");
      return;
    }

    toast.success(`Entrada validada: ${fullName}`);
    loadPortariaData();
  }

  return (
    <div className="p-5 sm:p-6 lg:p-7 max-w-[1480px] mx-auto">
      <PortariaHeader
        event={activeEvent}
        events={events}
        selectedEventId={selectedEventId}
        onSelectEvent={(id) => {
          setDemoMode(false);
          setSelectedEventId(id);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenScanner={() => setScannerOpen(true)}
        onFilterVipPending={handleFilterVipPending}
        vipPendingCount={metrics.vipPending}
        userEmail={user?.email}
        isDemoMode={demoMode}
        hasRealEvents={hasRealEvents}
        onToggleDemoMode={() => setDemoMode((prev) => !prev)}
      />

      <HeroMetricsSection
        presentCount={metrics.presentCount}
        capacity={metrics.capacity}
        validatedLastHours={metrics.validatedLastHours}
        lastHourDelta={metrics.lastHourDelta}
        vipPending={metrics.vipPending}
        vipTotal={metrics.vipTotal}
        hourlyFlow={metrics.hourlyFlow}
        eventId={activeEvent?.id}
        onOpenScanner={() => setScannerOpen(true)}
        onFilterVipPending={handleFilterVipPending}
        hasRealEvents={hasRealEvents}
        isDemoMode={demoMode}
        onEnableDemo={() => setDemoMode(true)}
      />

      <RecentCheckinsList
        rows={listRows}
        searchQuery={searchQuery}
        loading={loading && !demoMode}
        onQuickCheckin={handleQuickCheckin}
        checkingInId={checkingInId}
        activeFilter={listFilter}
        onFilterChange={setListFilter}
      />

      <QrScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        guests={scannerGuests}
        onConfirmCheckin={handleQuickCheckin}
      />
    </div>
  );
}
