import * as XLSX from "xlsx";

export type ParsedRow = {
  full_name: string;
  cpf: string | null;
  phone: string | null;
  ticket_quantity: number;
  ticket_type: string;
  notes: string | null;
};

export type ParseResult = {
  rows: ParsedRow[];
  errors: { line: number; reason: string; raw: Record<string, unknown> }[];
};

const FIELD_ALIASES: Record<keyof ParsedRow, string[]> = {
  full_name: ["nome", "nome completo", "full_name", "fullname", "name", "convidado"],
  cpf: ["cpf", "documento", "doc"],
  phone: ["telefone", "celular", "phone", "tel", "whatsapp"],
  ticket_quantity: [
    "quantidade",
    "qtd",
    "qtde",
    "ingressos",
    "quantidade de ingressos",
    "ticket_quantity",
    "tickets",
  ],
  ticket_type: ["tipo", "tipo de ingresso", "ticket_type", "categoria"],
  notes: ["obs", "observacao", "observação", "observacoes", "observações", "notes", "comentario"],
};

function normalizeKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildHeaderMap(headers: string[]): Partial<Record<keyof ParsedRow, string>> {
  const out: Partial<Record<keyof ParsedRow, string>> = {};
  const norm = headers.map((h) => ({ original: h, n: normalizeKey(h) }));
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [
    keyof ParsedRow,
    string[],
  ][]) {
    const found = norm.find((h) => aliases.includes(h.n));
    if (found) out[field] = found.original;
  }
  return out;
}

export async function parseGuestFile(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  if (json.length === 0) {
    return { rows: [], errors: [{ line: 0, reason: "Arquivo vazio", raw: {} }] };
  }

  const headers = Object.keys(json[0]);
  const map = buildHeaderMap(headers);

  if (!map.full_name) {
    return {
      rows: [],
      errors: [
        {
          line: 0,
          reason: `Coluna de nome não encontrada. Cabeçalhos: ${headers.join(", ")}`,
          raw: {},
        },
      ],
    };
  }

  const rows: ParsedRow[] = [];
  const errors: ParseResult["errors"] = [];

  json.forEach((raw, i) => {
    const line = i + 2; // +1 header, +1 zero-index
    const name = String(raw[map.full_name!] ?? "").trim();
    if (!name) {
      errors.push({ line, reason: "Nome vazio", raw });
      return;
    }
    const qtyRaw = map.ticket_quantity ? raw[map.ticket_quantity] : 1;
    const qty = Number(qtyRaw) || 1;
    if (qty < 1 || qty > 999) {
      errors.push({ line, reason: `Quantidade inválida (${qtyRaw})`, raw });
      return;
    }
    rows.push({
      full_name: name.slice(0, 200),
      cpf: map.cpf
        ? String(raw[map.cpf] ?? "").replace(/\D/g, "").slice(0, 11) || null
        : null,
      phone: map.phone
        ? String(raw[map.phone] ?? "").replace(/\D/g, "").slice(0, 15) || null
        : null,
      ticket_quantity: Math.floor(qty),
      ticket_type: map.ticket_type
        ? String(raw[map.ticket_type] ?? "pista").trim().slice(0, 40) || "pista"
        : "pista",
      notes: map.notes ? String(raw[map.notes] ?? "").trim().slice(0, 500) || null : null,
    });
  });

  return { rows, errors };
}
