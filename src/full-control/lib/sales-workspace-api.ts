import type { Role } from "@zyteron/contracts";
import { apiHeaders } from "./api-auth";
export type Review = "PENDING" | "APPROVED" | "REJECTED";
export type Stage =
  | "CONTACTED"
  | "RESPONDED"
  | "INTERESTED"
  | "PROPOSAL"
  | "ACCEPTED"
  | "COMPLETED"
  | "LOST";
export interface WorkRecord {
  id: string;
  owner_id: string;
  owner_type?: "ADMIN" | "EXECUTIVE";
  converted_at?: string | null;
  purchase_confirmed?: boolean;
  lead_id: string;
  client_id: string | null;
  client_created: boolean;
  company_name: string;
  contact_name: string;
  rut: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  business_activity: string | null;
  address: string | null;
  commune: string | null;
  city: string | null;
  interest: string;
  notes: string;
  stage: Stage;
  review_status: Review;
  review_note: string | null;
  next_action_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface WorkEvent {
  id: string;
  record_id: string;
  actor_id: string;
  kind: string;
  body: string;
  stage: Stage;
  next_action_at: string | null;
  review_status: Review;
  review_note: string | null;
  created_at: string;
}
export interface ProposalItem {
  planId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxable?: boolean;
}
export interface WorkProposal {
  quote_id: string;
  record_id: string;
  owner_id: string;
  quote_number: string;
  status: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  net_amount: number;
  tax_amount: number;
  total_amount: number;
  billing_type: "ONE_TIME" | "SUBSCRIPTION";
  valid_until: string;
  payment_terms: string;
  commercial_terms: string;
  notes: string;
  review_note: string | null;
  created_at: string;
  items: ProposalItem[];
}
export interface WorkReport {
  id: string;
  owner_id: string;
  record_id: string | null;
  title: string;
  body: string;
  period_from: string;
  period_to: string;
  review_status: Review;
  review_note: string | null;
  created_at: string;
}
export interface WorkEarning {
  id: string;
  owner_id: string;
  quote_id: string;
  commission_amount: number;
  commission_rate: number;
  status: "EARNED" | "ON_HOLD";
  approved_at: string;
  validated_cost?: number;
  net_revenue?: number;
  profit?: number;
  source_id?: string;
  source_kind?: string;
  receipt_key?: string;
}
export interface Receipt {
  receipt_key: string;
  source_kind: "INSTALLMENT" | "INVOICE";
  source_id: string;
  quote_id: string;
  collected_at: string;
  currency: string;
  net_revenue: number;
  period_label: string;
  document_number: string;
}
export interface AssignedClient {
  contact_name?: string;
  id: string;
  legal_name: string;
  rut: string;
  general_email: string | null;
  phone: string | null;
  business_activity: string | null;
  address: string | null;
  commune: string | null;
  account_executive_id: string | null;
}
export interface WorkBoard {
  admin: boolean;
  commissionRate: number;
  summary: {
    contacts: number;
    interested: number;
    generatedClients: number;
    pendingContacts: number;
    pendingProposals: number;
    accepted: number;
    completed: number;
    overdue: number;
    earnedCommission: number;
    pendingReports: number;
  };
  records: WorkRecord[];
  proposals: WorkProposal[];
  reports: WorkReport[];
  earnings: WorkEarning[];
  owners: Array<{ id: string; name: string }>;
  assignedClients: AssignedClient[];
  reviewEvents: WorkEvent[];
  receipts?: Receipt[];
  asOf: string;
}
export interface WorkDetail {
  record: WorkRecord;
  events: WorkEvent[];
  proposals: WorkProposal[];
}
export interface PublicPlan {
  id: string;
  name: string;
  category: string;
  amount: number;
  billingType: string;
  description: string;
  features: readonly string[];
}
export interface WorkCatalog {
  plans: PublicPlan[];
  pricingNote: string;
  commissionRate: number;
  company: {
    name: string;
    description: string;
    website: string;
    email: string;
    links: Array<{ title: string; url: string }>;
    presentation: string;
    discovery: string[];
  };
}
const base = "/api/control-core/api/sales-workspace";
async function request<T>(role: Role, path: string, method = "GET", body?: unknown) {
  const response = await fetch(base + path, {
    method,
    cache: "no-store",
    headers: await apiHeaders(role),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const value = await response.json().catch(() => ({}));
    throw new Error(
      Array.isArray(value.message)
        ? value.message.join(" ")
        : value.message || "No fue posible guardar la gestión.",
    );
  }
  return response.json() as Promise<T>;
}
export const workApi = {
  get: <T>(role: Role, path = "") => request<T>(role, path),
  post: <T>(role: Role, path: string, value: unknown) => request<T>(role, path, "POST", value),
  patch: <T>(role: Role, path: string, value: unknown) => request<T>(role, path, "PATCH", value),
  async download(role: Role, path: string, filename: string) {
    const response = await fetch(base + path, {
      headers: await apiHeaders(role),
      cache: "no-store",
    });
    if (!response.ok) {
      const value = await response.json().catch(() => ({}));
      throw new Error(value.message || "No fue posible descargar el documento.");
    }
    const href = URL.createObjectURL(await response.blob());
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(href);
  },
};
export const stageLabels: Record<Stage, string> = {
  CONTACTED: "Contactado",
  RESPONDED: "Respondió",
  INTERESTED: "Interesado",
  PROPOSAL: "En propuesta",
  ACCEPTED: "Aceptación informada",
  COMPLETED: "Venta validada",
  LOST: "No continúa",
};
export const reviewLabels: Record<Review, string> = {
  PENDING: "Por validar",
  APPROVED: "Validado",
  REJECTED: "Requiere corrección",
};
export const proposalLabels: Record<string, string> = {
  DRAFT: "Borrador",
  PENDING_APPROVAL: "Esperando autorización",
  APPROVED: "Autorizada",
  REJECTED: "Corregir propuesta",
  READY_TO_SEND: "Lista para compartir",
  SENT: "Compartida",
  NEGOTIATING: "En negociación",
  ACCEPTED: "Aceptación validada",
  CONVERTED: "Venta en proceso",
  CANCELLED: "Anulada",
  DECLINED: "No aceptada",
  EXPIRED: "Vencida",
};
