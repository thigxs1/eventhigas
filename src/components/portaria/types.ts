export type PortariaEvent = {
  id: string;
  name: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  status: string;
};

export type PortariaGuest = {
  id: string;
  event_id: string;
  full_name: string;
  cpf: string | null;
  phone: string | null;
  ticket_quantity: number;
  ticket_type: string;
  checked_in_count: number;
  status: "approved" | "pending" | "rejected";
  notes: string | null;
};

export type PortariaCheckin = {
  id: string;
  event_id: string;
  guest_id: string;
  checked_in_at: string;
  people_count: number;
  operator: string | null;
  guest_name: string;
  ticket_type: string;
  cpf: string | null;
  phone: string | null;
  notes: string | null;
  avatar_url?: string | null;
};

export type PortariaListRow = {
  key: string;
  guestId: string;
  fullName: string;
  ticketType: string;
  cpf: string | null;
  phone: string | null;
  notes: string | null;
  checkedInAt: string | null;
  peopleCount: number;
  checkedInTotal: number;
  ticketQuantity: number;
  isValidated: boolean;
  avatarUrl?: string | null;
};

export type HourlyFlowPoint = {
  hour: string;
  validados: number;
  meta: number;
};

export function isVipTicketType(ticketType: string | null | undefined): boolean {
  if (!ticketType) return false;
  const normalized = ticketType.toLowerCase();
  return (
    normalized.includes("vip") ||
    normalized.includes("camarote") ||
    normalized.includes("backstage")
  );
}

/**
 * Dados de demonstração exibidos apenas quando o usuário ativa a Prévia Demo
 * ou quando não há eventos reais cadastrados e ele deseja inspecionar o layout.
 */
export function buildDemoPortariaData() {
  const now = Date.now();
  const min = 60 * 1000;
  const hr = 60 * min;

  const event: PortariaEvent = {
    id: "demo-event",
    name: "NOITE SOLAR · EDITION 04",
    event_date: new Date().toISOString().slice(0, 10),
    event_time: "22:00:00",
    location: "Pavilhão Obsidian · Jardins, SP",
    status: "active",
  };

  const recentCheckins: PortariaCheckin[] = [
    {
      id: "ck-1",
      event_id: event.id,
      guest_id: "g-1",
      checked_in_at: new Date(now - 3 * min).toISOString(),
      people_count: 2,
      operator: "portaria@casa.com",
      guest_name: "Camila Vasconcelos",
      ticket_type: "VIP",
      cpf: "38492011842",
      phone: "11998442100",
      notes: "Mesa 04 · Acompanhante",
    },
    {
      id: "ck-2",
      event_id: event.id,
      guest_id: "g-2",
      checked_in_at: new Date(now - 9 * min).toISOString(),
      people_count: 1,
      operator: "portaria@casa.com",
      guest_name: "Rafael Albuquerque",
      ticket_type: "Backstage",
      cpf: "41203948102",
      phone: "11991234490",
      notes: "Imprensa / Credencial",
    },
    {
      id: "ck-3",
      event_id: event.id,
      guest_id: "g-3",
      checked_in_at: new Date(now - 16 * min).toISOString(),
      people_count: 3,
      operator: "portaria@casa.com",
      guest_name: "Beatriz Monteiro",
      ticket_type: "Camarote",
      cpf: "29104827319",
      phone: "11987720134",
      notes: null,
    },
    {
      id: "ck-4",
      event_id: event.id,
      guest_id: "g-4",
      checked_in_at: new Date(now - 24 * min).toISOString(),
      people_count: 1,
      operator: "portaria@casa.com",
      guest_name: "Lucas Ferraz",
      ticket_type: "Pista",
      cpf: "50918273645",
      phone: "11974458821",
      notes: null,
    },
    {
      id: "ck-5",
      event_id: event.id,
      guest_id: "g-5",
      checked_in_at: new Date(now - 38 * min).toISOString(),
      people_count: 2,
      operator: "portaria@casa.com",
      guest_name: "Mariana Tavares",
      ticket_type: "VIP",
      cpf: "33920184756",
      phone: "11982340912",
      notes: "Aniversariante da lista",
    },
  ];

  const pendingGuests: PortariaGuest[] = [
    {
      id: "g-6",
      event_id: event.id,
      full_name: "Thiago Mendonça",
      cpf: "47281920344",
      phone: "11993812204",
      ticket_quantity: 2,
      ticket_type: "VIP",
      checked_in_count: 0,
      status: "approved",
      notes: "Lista Diretoria",
    },
    {
      id: "g-7",
      event_id: event.id,
      full_name: "Helena Guimarães",
      cpf: "31948271099",
      phone: "11981239911",
      ticket_quantity: 1,
      ticket_type: "Backstage",
      checked_in_count: 0,
      status: "approved",
      notes: "Convidada DJ Set",
    },
    {
      id: "g-8",
      event_id: event.id,
      full_name: "André Cavalcanti",
      cpf: "51829301482",
      phone: "11994412008",
      ticket_quantity: 4,
      ticket_type: "Camarote",
      checked_in_count: 1,
      status: "approved",
      notes: "3 convidados restantes",
    },
  ];

  const hourlyFlow: HourlyFlowPoint[] = [
    { hour: "20:00", validados: 28, meta: 35 },
    { hour: "21:00", validados: 74, meta: 68 },
    { hour: "22:00", validados: 132, meta: 110 },
    { hour: "23:00", validados: 148, meta: 130 },
    { hour: "00:00", validados: 68, meta: 90 },
  ];

  return {
    event,
    recentCheckins,
    pendingGuests,
    hourlyFlow,
    capacity: 1000,
    presentCount: 450,
    validatedLastHours: 216,
    vipPending: 38,
    vipTotal: 160,
    lastHourDelta: 68,
    nowIso: new Date(now - 1 * hr).toISOString(),
  };
}
