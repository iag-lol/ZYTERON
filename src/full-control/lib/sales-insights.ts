/**
 * Análisis comercial calculado en el navegador a partir del tablero del espacio de ventas.
 * No inventa datos: todo se deriva de registros, propuestas y comisiones que entrega la API.
 * Las probabilidades del pronóstico son supuestos estándar y se muestran como tales.
 */
import type {
  Stage,
  WorkEarning,
  WorkProposal,
  WorkRecord,
} from "./sales-workspace-api";

const ZONE = "America/Santiago";
const DAY = 86_400_000;

export const stageOrder: Stage[] = [
  "CONTACTED",
  "RESPONDED",
  "INTERESTED",
  "PROPOSAL",
  "ACCEPTED",
  "COMPLETED",
  "LOST",
];
/** Etapas que el ejecutivo puede registrar a mano (COMPLETED sólo lo asigna administración). */
export const manualStages: Stage[] = [
  "CONTACTED",
  "RESPONDED",
  "INTERESTED",
  "PROPOSAL",
  "ACCEPTED",
  "LOST",
];
export const openStages: Stage[] = ["CONTACTED", "RESPONDED", "INTERESTED", "PROPOSAL", "ACCEPTED"];
export const funnelStages: Stage[] = [
  "CONTACTED",
  "RESPONDED",
  "INTERESTED",
  "PROPOSAL",
  "ACCEPTED",
  "COMPLETED",
];
export const isOpen = (r: Pick<WorkRecord, "stage">) => openStages.includes(r.stage);

/** Estados de cotización que habilitan registrar ACCEPTED (regla del servidor). */
export const sharedProposalStatuses = ["SENT", "NEGOTIATING", "ACCEPTED", "CONVERTED"];
export const openProposalStatuses = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "READY_TO_SEND",
  "SENT",
  "NEGOTIATING",
  "REJECTED",
];
export const wonProposalStatuses = ["ACCEPTED", "CONVERTED"];
export const closedProposalStatuses = ["DECLINED", "EXPIRED", "CANCELLED"];

/** Probabilidad estándar de cierre por estado de propuesta (supuesto declarado en la interfaz). */
export const proposalProbability: Record<string, number> = {
  DRAFT: 0.15,
  REJECTED: 0.1,
  PENDING_APPROVAL: 0.25,
  APPROVED: 0.35,
  READY_TO_SEND: 0.35,
  SENT: 0.5,
  NEGOTIATING: 0.65,
  ACCEPTED: 1,
  CONVERTED: 1,
};

export type ProposalGroup = "review" | "share" | "negotiation" | "won" | "fix" | "closed";
export const proposalGroup = (status: string): ProposalGroup =>
  status === "PENDING_APPROVAL" || status === "DRAFT"
    ? "review"
    : status === "APPROVED" || status === "READY_TO_SEND"
      ? "share"
      : status === "SENT" || status === "NEGOTIATING"
        ? "negotiation"
        : wonProposalStatuses.includes(status)
          ? "won"
          : status === "REJECTED"
            ? "fix"
            : "closed";
export const proposalGroupLabels: Record<ProposalGroup, string> = {
  review: "En autorización",
  share: "Listas para compartir",
  negotiation: "Compartidas",
  won: "Aceptadas",
  fix: "Por corregir",
  closed: "Cerradas",
};

const dateKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
/** Fecha calendario (AAAA-MM-DD) en Santiago para un instante. */
export const dateKey = (value: string | number | Date) => dateKeyFormat.format(new Date(value));
const keyToUtc = (key: string) => Date.parse(`${key}T12:00:00Z`);
const addDaysKey = (key: string, days: number) =>
  new Date(keyToUtc(key) + days * DAY).toISOString().slice(0, 10);
/** Lunes de la semana (AAAA-MM-DD) que contiene la fecha. */
export const weekStart = (key: string) => {
  const weekday = new Date(keyToUtc(key)).getUTCDay();
  return addDaysKey(key, -((weekday + 6) % 7));
};

export type AgendaBucket = "overdue" | "today" | "week" | "later" | "unscheduled";
export const agendaLabels: Record<AgendaBucket, string> = {
  overdue: "Atrasados",
  today: "Hoy",
  week: "Próximos 7 días",
  later: "Más adelante",
  unscheduled: "Sin seguimiento",
};
export function agendaBucket(r: WorkRecord, now = Date.now()): AgendaBucket | null {
  if (!isOpen(r)) return null;
  if (!r.next_action_at) return "unscheduled";
  const at = Date.parse(r.next_action_at);
  if (at < now) return "overdue";
  const today = dateKey(now);
  const due = dateKey(at);
  if (due === today) return "today";
  if (due <= addDaysKey(today, 7)) return "week";
  return "later";
}
export function agenda(records: WorkRecord[], now = Date.now()) {
  const groups: Record<AgendaBucket, WorkRecord[]> = {
    overdue: [],
    today: [],
    week: [],
    later: [],
    unscheduled: [],
  };
  for (const r of records) {
    const bucket = agendaBucket(r, now);
    if (bucket) groups[bucket].push(r);
  }
  const byNext = (a: WorkRecord, b: WorkRecord) =>
    String(a.next_action_at).localeCompare(String(b.next_action_at));
  groups.overdue.sort(byNext);
  groups.today.sort(byNext);
  groups.week.sort(byNext);
  groups.later.sort(byNext);
  groups.unscheduled.sort((a, b) => a.updated_at.localeCompare(b.updated_at));
  return groups;
}

export type Priority = "high" | "medium" | "low" | "closed";
export const priorityLabels: Record<Priority, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
  closed: "Cerrada",
};
const stageWeight: Partial<Record<Stage, number>> = {
  CONTACTED: 20,
  RESPONDED: 35,
  INTERESTED: 55,
  PROPOSAL: 68,
  ACCEPTED: 82,
};
/**
 * Prioridad de atención (0–100): etapa, urgencia del seguimiento, actividad reciente
 * y monto de propuestas abiertas. Explica sus motivos para que no sea una caja negra.
 */
export function priority(r: WorkRecord, proposals: WorkProposal[] = [], now = Date.now()) {
  if (!isOpen(r)) return { score: 0, level: "closed" as Priority, reasons: ["Gestión cerrada"] };
  const reasons: string[] = [];
  let score = stageWeight[r.stage] ?? 0;
  const bucket = agendaBucket(r, now);
  if (bucket === "overdue") {
    score += 15;
    reasons.push("Seguimiento atrasado");
  } else if (bucket === "today") {
    score += 10;
    reasons.push("Seguimiento hoy");
  } else if (bucket === "unscheduled") {
    score -= 8;
    reasons.push("Sin próximo contacto");
  }
  const idleDays = Math.floor((now - Date.parse(r.updated_at)) / DAY);
  if (idleDays >= 21) {
    score -= 12;
    reasons.push(`${idleDays} días sin movimiento`);
  } else if (idleDays <= 3) {
    score += 5;
    reasons.push("Actividad reciente");
  }
  if (r.review_status === "REJECTED") {
    score += 8;
    reasons.push("Corrección solicitada");
  }
  const open = proposals.filter(
    (p) => p.record_id === r.id && openProposalStatuses.includes(p.status),
  );
  const value = open.reduce((t, p) => t + Number(p.net_amount || 0), 0);
  if (value > 0) {
    score += Math.min(10, Math.round(value / 400_000));
    reasons.push("Propuesta abierta");
  }
  score = Math.max(0, Math.min(100, score));
  const level: Priority = score >= 70 ? "high" : score >= 45 ? "medium" : "low";
  return { score, level, reasons, idleDays };
}
export const isCooling = (r: WorkRecord, now = Date.now()) =>
  isOpen(r) && now - Date.parse(r.updated_at) >= 14 * DAY;

/** Distribución acumulada inferida del estado actual; no reconstruye transiciones históricas. */
export function funnel(records: WorkRecord[]) {
  const rank = (s: Stage) => (s === "LOST" ? 0 : funnelStages.indexOf(s));
  return funnelStages.map((stage, i) => {
    const reaches = (r: WorkRecord, index: number) => rank(r.stage) >= index && (funnelStages[index] !== "COMPLETED" || r.purchase_confirmed === true);
    const reached = records.filter((r) => reaches(r, i)).length;
    const current = records.filter((r) => r.stage === stage && (stage !== "COMPLETED" || r.purchase_confirmed === true)).length;
    const previous = i === 0 ? reached : records.filter((r) => reaches(r, i - 1)).length;
    return {
      stage,
      reached,
      current,
      conversion: i === 0 || !previous ? null : reached / previous,
    };
  });
}

export function pipeline(proposals: WorkProposal[]) {
  const open = proposals.filter((p) => openProposalStatuses.includes(p.status));
  const value = open.reduce((t, p) => t + Number(p.net_amount || 0), 0);
  const weighted = Math.round(
    open.reduce(
      (t, p) => t + Number(p.net_amount || 0) * (proposalProbability[p.status] ?? 0),
      0,
    ),
  );
  const won = proposals.filter((p) => wonProposalStatuses.includes(p.status));
  const wonValue = won.reduce((t, p) => t + Number(p.net_amount || 0), 0);
  const recurring = open
    .filter((p) => p.billing_type === "SUBSCRIPTION")
    .reduce((t, p) => t + Number(p.net_amount || 0), 0);
  return { open: open.length, value, weighted, won: won.length, wonValue, recurring };
}

export function winRate(records: WorkRecord[]) {
  const won = records.filter((r) => r.stage === "COMPLETED" && r.purchase_confirmed === true).length;
  const lost = records.filter((r) => r.stage === "LOST").length;
  return won + lost ? won / (won + lost) : null;
}

/** Proposals compartibles o en revisión cuya vigencia termina dentro de `days` días. */
export function expiringProposals(proposals: WorkProposal[], days = 5, now = Date.now()) {
  const today = dateKey(now);
  const limit = addDaysKey(today, days);
  return proposals
    .filter(
      (p) =>
        ["APPROVED", "READY_TO_SEND", "SENT", "NEGOTIATING", "PENDING_APPROVAL"].includes(
          p.status,
        ) &&
        p.valid_until &&
        p.valid_until.slice(0, 10) >= today &&
        p.valid_until.slice(0, 10) <= limit,
    )
    .sort((a, b) => a.valid_until.localeCompare(b.valid_until));
}
export const daysUntil = (iso: string, now = Date.now()) =>
  Math.round((keyToUtc(iso.slice(0, 10)) - keyToUtc(dateKey(now))) / DAY);

/** Serie semanal (lunes a domingo) de las últimas `weeks` semanas, incluida la actual. */
export function weeklySeries(dates: string[], weeks = 8, now = Date.now()) {
  const current = weekStart(dateKey(now));
  const starts = Array.from({ length: weeks }, (_, i) => addDaysKey(current, (i - weeks + 1) * 7));
  const counts = new Map(starts.map((s) => [s, 0]));
  for (const value of dates) {
    if (!value) continue;
    const start = weekStart(dateKey(value));
    if (counts.has(start)) counts.set(start, (counts.get(start) ?? 0) + 1);
  }
  return starts.map((start) => ({ start, end: addDaysKey(start, 6), value: counts.get(start) ?? 0 }));
}

/** Comisiones ganadas por mes de validación, últimos `months` meses. */
export function monthlyCommission(earnings: WorkEarning[], months = 6, now = Date.now()) {
  const [y, m] = dateKey(now).split("-").map(Number);
  const keys = Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (months - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
  const totals = new Map(keys.map((k) => [k, 0]));
  for (const e of earnings) {
    if (e.status !== "EARNED" || !e.approved_at) continue;
    const k = dateKey(e.approved_at).slice(0, 7);
    if (totals.has(k)) totals.set(k, (totals.get(k) ?? 0) + Number(e.commission_amount || 0));
  }
  return keys.map((month) => ({ month, value: totals.get(month) ?? 0 }));
}
const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const monthLabel = (key: string) => `${monthNames[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`;
export const shortDay = (key: string) => `${key.slice(8, 10)}-${key.slice(5, 7)}`;

/** Búsqueda tolerante a tildes y mayúsculas. */
export const normalize = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL")
    .trim();
export const matches = (query: string, ...values: Array<string | null | undefined>) => {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = values.map(normalize).join(" ");
  return terms.every((t) => haystack.includes(t));
};

// ───────── Integraciones sin credenciales: WhatsApp, Google Calendar, ICS, CSV ─────────

/** Teléfono chileno en formato internacional sin "+", o null si no se puede asegurar. */
export function chilePhone(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (/^569\d{8}$/.test(digits) || /^562\d{8}$/.test(digits)) return digits;
  if (/^9\d{8}$/.test(digits) || /^2\d{8}$/.test(digits)) return `56${digits}`;
  if (/^\d{10,15}$/.test(digits) && !digits.startsWith("0")) return digits;
  return null;
}
export function whatsappLink(phone: string | null | undefined, text: string) {
  const target = chilePhone(phone);
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return target ? `https://wa.me/${target}${query}` : null;
}
export function whatsappShare(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
export const telLink = (phone: string | null | undefined) => {
  const target = chilePhone(phone);
  return target ? `tel:+${target}` : null;
};
export const mailLink = (email: string | null | undefined, subject = "", body = "") =>
  email
    ? `mailto:${email}?${new URLSearchParams({ subject, body }).toString().replace(/\+/g, "%20")}`
    : null;

const icsStamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export function googleCalendarLink(r: WorkRecord, minutes = 30) {
  if (!r.next_action_at) return null;
  const start = Date.parse(r.next_action_at);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Seguimiento · ${r.company_name}`,
    dates: `${icsStamp(start)}/${icsStamp(start + minutes * 60_000)}`,
    details: [
      `Contacto: ${r.contact_name}`,
      r.phone ? `Teléfono: ${r.phone}` : "",
      r.email ? `Correo: ${r.email}` : "",
      `Necesidad: ${r.interest}`,
    ]
      .filter(Boolean)
      .join("\n"),
    ctz: ZONE,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
const icsText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
/** Calendario ICS (Outlook, Apple, Google) con los seguimientos programados. */
export function agendaIcs(records: WorkRecord[], now = Date.now(), minutes = 30) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zyteron//Gestion comercial//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Seguimientos comerciales Zyteron",
  ];
  for (const r of records) {
    if (!r.next_action_at || !isOpen(r)) continue;
    const start = Date.parse(r.next_action_at);
    if (Number.isNaN(start)) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:${r.id}-${icsStamp(start)}@zyteron.cl`,
      `DTSTAMP:${icsStamp(now)}`,
      `DTSTART:${icsStamp(start)}`,
      `DTEND:${icsStamp(start + minutes * 60_000)}`,
      `SUMMARY:${icsText(`Seguimiento · ${r.company_name}`)}`,
      `DESCRIPTION:${icsText(`Contacto: ${r.contact_name}\nNecesidad: ${r.interest}`)}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT15M",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsText(`Seguimiento con ${r.company_name}`)}`,
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/** CSV para Excel (separador ;, BOM UTF-8) protegido contra inyección de fórmulas. */
export function toCsv(rows: Array<Array<string | number | null | undefined>>) {
  const cell = (value: string | number | null | undefined) => {
    let text = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return "\uFEFF" + rows.map((row) => row.map(cell).join(";")).join("\r\n");
}

export function proposalMessage(p: WorkProposal, money: (v: number) => string) {
  const first = p.contact_name?.split(/\s+/)[0] ?? "";
  return [
    `Hola${first ? ` ${first}` : ""}, te comparto la propuesta ${p.quote_number} de Zyteron para ${p.company_name}.`,
    `Total: ${money(p.total_amount)}${p.billing_type === "SUBSCRIPTION" ? " mensual" : ""} (IVA incluido).`,
    p.valid_until
      ? `Vigente hasta el ${p.valid_until.slice(8, 10)}-${p.valid_until.slice(5, 7)}-${p.valid_until.slice(0, 4)}.`
      : "",
    "Quedo atento a tus comentarios para avanzar.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Borrador de informe a partir de datos reales del período; el ejecutivo lo revisa antes de enviarlo. */
export function reportDraft(
  input: {
    records: WorkRecord[];
    proposals: WorkProposal[];
    from: string;
    to: string;
    labels: Record<Stage, string>;
    money: (v: number) => string;
  },
  now = Date.now(),
) {
  const { records, proposals, from, to, labels, money } = input;
  const inside = (value: string | null | undefined) => {
    if (!value) return false;
    const k = dateKey(value);
    return k >= from && k <= to;
  };
  const created = records.filter((r) => inside(r.created_at));
  const moved = records.filter((r) => inside(r.updated_at));
  const proposed = proposals.filter((p) => inside(p.created_at));
  const won = records.filter((r) => r.stage === "COMPLETED" && r.purchase_confirmed === true && inside(r.converted_at ?? r.updated_at));
  const lost = records.filter((r) => r.stage === "LOST" && inside(r.updated_at));
  const pending = agenda(records, now);
  const top = records
    .filter(isOpen)
    .map((r) => ({ r, p: priority(r, proposals, now) }))
    .sort((a, b) => b.p.score - a.p.score)
    .slice(0, 5);
  const d = (k: string) => `${k.slice(8, 10)}-${k.slice(5, 7)}-${k.slice(0, 4)}`;
  const stageCounts = stageOrder
    .map((s) => [labels[s], records.filter((r) => r.stage === s && (s !== "COMPLETED" || r.purchase_confirmed === true)).length] as const)
    .filter(([, n]) => n > 0)
    .map(([l, n]) => `- ${l}: ${n}`);
  const upcoming = [...pending.overdue, ...pending.today, ...pending.week].slice(0, 8);
  return [
    `Período informado: ${d(from)} al ${d(to)}`,
    "",
    "RESUMEN DEL PERÍODO",
    `- Contactos nuevos: ${created.length}`,
    `- Gestiones con movimiento: ${moved.length}`,
    `- Propuestas preparadas: ${proposed.length}${proposed.length ? ` (neto ${money(proposed.reduce((t, p) => t + Number(p.net_amount || 0), 0))})` : ""}`,
    `- Ventas validadas: ${won.length}`,
    `- Gestiones que no continúan: ${lost.length}`,
    "",
    "ESTADO ACTUAL DE LA CARTERA",
    ...(stageCounts.length ? stageCounts : records.length ? [] : ["- Sin registros"]),
    ...(records.some((r) => r.stage === "COMPLETED" && r.purchase_confirmed !== true)
      ? [`- Compras por revisar: ${records.filter((r) => r.stage === "COMPLETED" && r.purchase_confirmed !== true).length}`]
      : []),
    "",
    "OPORTUNIDADES PRIORITARIAS",
    ...(top.length
      ? top.map(({ r }) => `- ${r.company_name} · ${labels[r.stage]} · ${r.interest}`)
      : ["- Sin oportunidades abiertas"]),
    "",
    "SEGUIMIENTOS COMPROMETIDOS",
    ...(upcoming.length
      ? upcoming.map((r) => `- ${r.company_name} · ${r.next_action_at ? d(dateKey(r.next_action_at)) : "sin fecha"}`)
      : ["- Sin seguimientos programados"]),
    ...(pending.unscheduled.length
      ? [`- ${pending.unscheduled.length} contactos abiertos aún sin próximo seguimiento`]
      : []),
    "",
    "OBSTÁCULOS Y APOYO REQUERIDO",
    "- (Completa con lo que necesitas de administración)",
  ].join("\n");
}
