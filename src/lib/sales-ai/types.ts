export const SALES_STATUSES = [
  "NUEVO",
  "INVESTIGADO",
  "CONTACTADO",
  "RESPONDIO",
  "INTERESADO",
  "PRESUPUESTO_ENVIADO",
  "NEGOCIACION",
  "GANADO",
  "PERDIDO",
  "EN_PAUSA",
] as const;

export type SalesStatus = (typeof SALES_STATUSES)[number];

export const SALES_STATUS_LABELS: Record<SalesStatus, string> = {
  NUEVO: "Nuevo",
  INVESTIGADO: "Investigado",
  CONTACTADO: "Contactado",
  RESPONDIO: "Respondió",
  INTERESADO: "Interesado",
  PRESUPUESTO_ENVIADO: "Presupuesto enviado",
  NEGOCIACION: "Negociación",
  GANADO: "Ganado",
  PERDIDO: "Perdido",
  EN_PAUSA: "En pausa",
};

export const SALES_POTENTIALS = ["BAJO", "MEDIO", "POTENCIAL", "ALTO"] as const;
export type SalesPotential = (typeof SALES_POTENTIALS)[number];

export const LOST_REASONS = [
  "PRECIO",
  "SIN_PRESUPUESTO",
  "COMPETENCIA",
  "SIN_RESPUESTA",
  "NO_INTERESADO",
  "PROYECTO_CANCELADO",
  "SOLUCION_INTERNA",
  "OTRO",
] as const;

export type LostReason = (typeof LOST_REASONS)[number];

export const LOST_REASON_LABELS: Record<LostReason, string> = {
  PRECIO: "Precio",
  SIN_PRESUPUESTO: "Sin presupuesto",
  COMPETENCIA: "Eligió competencia",
  SIN_RESPUESTA: "Nunca respondió",
  NO_INTERESADO: "No interesado",
  PROYECTO_CANCELADO: "Proyecto cancelado",
  SOLUCION_INTERNA: "Resolvió internamente",
  OTRO: "Otro",
};

export type SalesCompany = {
  id: string;
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  industry: string | null;
  commune: string | null;
  region: string | null;
  country: string | null;
  website: string | null;
  website_domain: string | null;
  primary_email: string | null;
  secondary_emails: string[] | null;
  phone: string | null;
  whatsapp: string | null;
  contact_name: string | null;
  contact_role: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  source: string | null;
  owner_user: string | null;
  notes: string | null;
  detected_problem: string | null;
  recommended_service: string | null;
  score: number | null;
  potential: SalesPotential;
  status: SalesStatus;
  last_interaction_at: string | null;
  next_action: string | null;
  next_action_at: string | null;
  potential_value: number | null;
  linked_quote_id: string | null;
  linked_client_id: string | null;
  linked_lead_id: string | null;
  lost_reason: string | null;
  lost_comment: string | null;
  closed_at: string | null;
  do_not_contact: boolean;
  email_invalid: boolean;
  dormant_since: string | null;
  import_batch_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SalesEvent = {
  id: number;
  company_id: string | null;
  event_type: string;
  title: string;
  detail: string | null;
  payload: Record<string, unknown> | null;
  actor: string | null;
  is_automated: boolean;
  created_at: string;
};

/** Tipos de evento del historial. Se registran siempre, nunca se borran. */
export const SALES_EVENT_TYPES = {
  COMPANY_CREATED: "COMPANY_CREATED",
  COMPANY_IMPORTED: "COMPANY_IMPORTED",
  COMPANY_UPDATED: "COMPANY_UPDATED",
  EMAIL_SENT: "EMAIL_SENT",
  EMAIL_RECEIVED: "EMAIL_RECEIVED",
  EMAIL_ANALYZED: "EMAIL_ANALYZED",
  STATUS_CHANGED: "STATUS_CHANGED",
  POTENTIAL_CHANGED: "POTENTIAL_CHANGED",
  DRAFT_CREATED: "DRAFT_CREATED",
  DRAFT_APPROVED: "DRAFT_APPROVED",
  DRAFT_SENT: "DRAFT_SENT",
  FOLLOWUP_SCHEDULED: "FOLLOWUP_SCHEDULED",
  FOLLOWUP_SENT: "FOLLOWUP_SENT",
  FOLLOWUP_CANCELLED: "FOLLOWUP_CANCELLED",
  PROPOSAL_CREATED: "PROPOSAL_CREATED",
  PROPOSAL_SENT: "PROPOSAL_SENT",
  NOTE_ADDED: "NOTE_ADDED",
  HUMAN_INTERVENTION: "HUMAN_INTERVENTION",
  WON: "WON",
  LOST: "LOST",
  CLIENT_LINKED: "CLIENT_LINKED",
  NOTIFICATION_SENT: "NOTIFICATION_SENT",
  ERROR: "ERROR",
  AI_ACTION: "AI_ACTION",
  OPT_OUT: "OPT_OUT",
} as const;
