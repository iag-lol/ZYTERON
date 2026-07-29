/**
 * FUENTE ÚNICA DEL ÁREA COMERCIAL (ejecutivos y partners)
 * ------------------------------------------------------
 * Roles, etiquetas de estado, reglas de comisión y parámetros de liquidación.
 * Lo consumen el portal del ejecutivo, el admin y las APIs, para que ambos
 * lados muestren exactamente la misma información.
 */

export const COMMERCIAL_ROLES = ["executive", "portfolio", "partner"] as const;
export type CommercialRoleId = (typeof COMMERCIAL_ROLES)[number];

export const ROLE_INFO: Record<
  string,
  { label: string; short: string; description: string; cls: string }
> = {
  executive: {
    label: "Ejecutivo comercial",
    short: "Ejecutivo",
    description:
      "Prospecta, presenta la propuesta y acompaña al cliente hasta el cierre junto al equipo técnico.",
    cls: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  portfolio: {
    label: "Gestor de cartera",
    short: "Cartera",
    description:
      "Mantiene y hace crecer la cartera de clientes activos: renovaciones, mantenciones y nuevos módulos.",
    cls: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  partner: {
    label: "Partner / Referidor",
    short: "Partner",
    description:
      "Refiere oportunidades calificadas; Zyteron toma la propuesta técnica y el cierre comercial.",
    cls: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  },
};

export const USER_STATUS_INFO: Record<string, { label: string; cls: string }> = {
  active: { label: "Activo", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  suspended: { label: "Suspendido", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  invited: { label: "Invitado", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
};

/** Etapa informada por el ejecutivo (avance de su gestión). */
export const PROGRESS_INFO: Record<string, { label: string; cls: string; step: number }> = {
  registered: { label: "Registrado", cls: "bg-slate-100 text-slate-700", step: 1 },
  contacted: { label: "Contactado", cls: "bg-blue-50 text-blue-700", step: 2 },
  follow_up: { label: "En seguimiento", cls: "bg-cyan-50 text-cyan-700", step: 3 },
  meeting_scheduled: { label: "Reunión agendada", cls: "bg-violet-50 text-violet-700", step: 4 },
  proposal_sent: { label: "Propuesta enviada", cls: "bg-indigo-50 text-indigo-700", step: 5 },
  negotiation: { label: "Negociación", cls: "bg-amber-50 text-amber-700", step: 6 },
  won: { label: "Ganado", cls: "bg-emerald-50 text-emerald-700", step: 7 },
  lost: { label: "Perdido", cls: "bg-rose-50 text-rose-700", step: 0 },
  no_response: { label: "Sin respuesta", cls: "bg-orange-50 text-orange-700", step: 0 },
};

/** Etapas que cuentan como embudo activo (ni ganado ni cerrado). */
export const ACTIVE_PROGRESS = [
  "contacted",
  "follow_up",
  "meeting_scheduled",
  "proposal_sent",
  "negotiation",
] as const;

export const CLOSED_PROGRESS = ["won", "lost", "no_response"] as const;

/** Clasificación que solo asigna administración. */
export const VALIDATION_INFO: Record<string, { label: string; cls: string; description: string }> = {
  pending: {
    label: "Pendiente de evaluación",
    cls: "bg-slate-100 text-slate-700 ring-slate-200",
    description: "Zyteron aún no revisa este registro.",
  },
  in_review: {
    label: "En revisión",
    cls: "bg-blue-50 text-blue-700 ring-blue-200",
    description: "Se está verificando la información entregada.",
  },
  potential: {
    label: "Cliente potencial",
    cls: "bg-violet-50 text-violet-700 ring-violet-200",
    description: "Califica como oportunidad real: continúa la gestión.",
  },
  accepted: {
    label: "Aceptado por Zyteron",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    description: "Oportunidad tomada por la empresa: habilita comisión al cerrarse.",
  },
  rejected: {
    label: "No califica",
    cls: "bg-rose-50 text-rose-700 ring-rose-200",
    description: "No corresponde al perfil de cliente o al alcance de Zyteron.",
  },
  duplicate: {
    label: "Duplicado",
    cls: "bg-amber-50 text-amber-700 ring-amber-200",
    description: "El contacto ya existía en la cartera de Zyteron.",
  },
  validated: {
    label: "Validado",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    description: "Registro validado (estado histórico).",
  },
};

export const ACTIVITY_INFO: Record<string, { label: string; cls: string }> = {
  call: { label: "Llamada", cls: "bg-blue-100 text-blue-700" },
  whatsapp: { label: "WhatsApp", cls: "bg-emerald-100 text-emerald-700" },
  email: { label: "Correo", cls: "bg-indigo-100 text-indigo-700" },
  meeting: { label: "Reunión", cls: "bg-violet-100 text-violet-700" },
  note: { label: "Nota interna", cls: "bg-slate-100 text-slate-700" },
  status_change: { label: "Cambio de etapa", cls: "bg-cyan-100 text-cyan-700" },
  evaluation: { label: "Evaluación de Zyteron", cls: "bg-violet-100 text-violet-700" },
};

// -- Comisiones y liquidaciones ---------------------------------------------

export const COMMISSION_STATUS_INFO: Record<
  string,
  { label: string; cls: string; description: string }
> = {
  pending: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 ring-amber-200",
    description: "Registrada, a la espera de que se cumplan las condiciones de pago.",
  },
  approved: {
    label: "Aprobada",
    cls: "bg-blue-50 text-blue-700 ring-blue-200",
    description: "Validada por administración: entra en la próxima liquidación.",
  },
  paid: {
    label: "Pagada",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    description: "Incluida en una liquidación ya pagada.",
  },
  adjusted: {
    label: "Ajustada",
    cls: "bg-slate-100 text-slate-700 ring-slate-200",
    description: "Modificada por una corrección posterior; revisa la observación.",
  },
};

export const STATEMENT_STATUS_INFO: Record<string, { label: string; cls: string }> = {
  draft: { label: "Borrador", cls: "bg-slate-100 text-slate-700 ring-slate-200" },
  issued: { label: "Emitida", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
  paid: { label: "Pagada", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  cancelled: { label: "Anulada", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
};

/**
 * Retención de segunda categoría (boleta de honorarios) vigente en Chile.
 * Ley 21.133 aplica un alza gradual: 2026 = 15,25%. Se usa como valor por
 * defecto al emitir una liquidación y puede ajustarse liquidación por
 * liquidación desde el admin.
 */
export const DEFAULT_RETENTION_PCT = 15.25;

export const RETENTION_NOTE =
  "La retención corresponde al impuesto de segunda categoría que Zyteron retiene y entera al SII cuando el pago se documenta con boleta de honorarios. Si el pago se realiza contra factura, la retención se ajusta a 0% y el IVA se maneja por separado.";

export const COMMISSION_RULES: Array<{ title: string; detail: string }> = [
  {
    title: "La comisión nace de un registro aceptado",
    detail:
      "Solo los contactos clasificados por Zyteron como “Cliente potencial” o “Aceptado” generan comisión cuando el proyecto se cierra y el cliente paga.",
  },
  {
    title: "Se calcula sobre la base neta del proyecto",
    detail:
      "El porcentaje se aplica sobre el monto neto (sin IVA) efectivamente pagado por el cliente, descontando servicios de terceros, licencias, dominios, hosting y consumo de IA.",
  },
  {
    title: "Se paga una vez recibido el pago del cliente",
    detail:
      "Si el proyecto se cobra por etapas, la comisión se libera en la misma proporción en que el cliente paga cada etapa.",
  },
  {
    title: "Antigüedad del registro",
    detail:
      "El registro protege al ejecutivo frente al mismo contacto durante los 90 días siguientes a su aceptación. Pasado ese plazo sin gestión informada, la oportunidad vuelve a quedar disponible.",
  },
  {
    title: "Liquidación mensual",
    detail:
      "Las comisiones aprobadas dentro del mes se consolidan en una liquidación, con su retención y monto neto, y se pagan por transferencia a la cuenta registrada en el perfil.",
  },
];

// -- Utilidades compartidas --------------------------------------------------

export function formatCLP(value: number | null | undefined): string {
  const amount = Number(value ?? 0);
  return `$${Math.round(amount).toLocaleString("es-CL")}`;
}

/** "2026-07" → "julio 2026" */
export function formatPeriod(period: string | null | undefined): string {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return period || "—";
  const [year, month] = period.split("-").map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toLocaleUpperCase("es") + label.slice(1);
}

/** Periodo actual en formato YYYY-MM. */
export function currentPeriod(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
