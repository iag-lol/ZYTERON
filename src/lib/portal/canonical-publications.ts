import "server-only";
import type { Prisma } from "@prisma/client";
import { clientDatabase } from "./scoped-db";
import { projectStatus } from "@/lib/client-experience/project-status";
import { projectDateOnly } from "@/lib/operations/project-identity";
type PublishedDocument = {
  id: string;
  title: string;
  description: string | null;
  filename: string;
  storage_path: string;
  created_at: Date;
  category?: string | null;
};
export async function scopedPublications(db: Prisma.TransactionClient) {
  // The isolated native QA database intentionally contains no enterprise modules.
  const present = await db.$queryRaw<
    Array<{ available: boolean }>
  >`SELECT to_regclass('public.projects') IS NOT NULL AND to_regclass('public.support_tickets') IS NOT NULL AS available`;
  if (!present[0]?.available) {
    let isolated = false;
    try {
      isolated = ["localhost", "127.0.0.1", "[::1]"].includes(
        new URL(process.env.DATABASE_URL || "").hostname,
      );
    } catch {}
    if (isolated)
      return {
        projects: [],
        documents: [],
        tickets: [],
        messages: [],
        monitors: [],
        payments: [],
        contracts: [],
      };
    throw new Error("PORTAL_PUBLICATION_SCHEMA_UNAVAILABLE");
  }
  const [projects, documents, tickets, messages, monitors, payments] = await Promise.all([
    db.$queryRaw<
      Array<{
        id: string;
        name: string;
        project_number: string;
        description: string | null;
        scope: string | null;
        status: string;
        progress: number;
        planned_start_date: Date | null;
        target_date: Date | null;
      }>
    >`SELECT id,name,project_number,description,scope,status,progress,planned_start_date,target_date FROM projects ORDER BY created_at DESC LIMIT 100`,
    db.$queryRaw<
      PublishedDocument[]
    >`SELECT d.id,d.title,d.description,v.filename,v.storage_path,d.created_at,t.code AS category FROM documents d JOIN document_versions v ON v.id=d.current_version_id LEFT JOIN document_types t ON t.id=d.type_id ORDER BY d.created_at DESC LIMIT 100`,
    db.$queryRaw<
      Array<{ id: string; subject: string; description: string; status: string; updated_at: Date }>
    >`SELECT id,subject,description,status,updated_at FROM support_tickets ORDER BY updated_at DESC LIMIT 100`,
    db.$queryRaw<
      Array<{ id: string; ticket_id: string; author_type: string; body: string; created_at: Date }>
    >`SELECT id,ticket_id,author_type,body,created_at FROM ticket_messages ORDER BY created_at ASC LIMIT 500`,
    db.$queryRaw<
      Array<{
        id: string;
        name: string;
        url: string;
        status: string;
        last_checked_at: Date | null;
        last_latency_ms: number | null;
        ssl_status: string;
        ssl_expires_at: Date | null;
      }>
    >`SELECT m.id,e.name,e.url,m.status,m.last_checked_at,m.last_latency_ms,m.ssl_status,m.ssl_expires_at FROM monitors m JOIN project_endpoints e ON e.id=m.endpoint_id ORDER BY e.name LIMIT 100`,
    db.$queryRaw<
      Array<{
        id: string;
        gross_amount: number;
        received_at: Date;
        currency: string;
        payment_reference: string | null;
        allocations: { receivableId: string; amount: number }[];
      }>
    >`SELECT p.id,p.gross_amount,p.received_at,p.currency,p.payment_reference,COALESCE((SELECT jsonb_agg(jsonb_build_object('receivableId',a.invoice_id,'amount',a.amount)) FROM payment_allocations a WHERE a.payment_id=p.id AND a.reversed_at IS NULL),'[]'::jsonb) AS allocations FROM payments p WHERE p.status='CONFIRMED' AND p.confirmed_at IS NOT NULL AND p.provider IN ('BANK_TRANSFER','CASH','OTHER','FLOW') AND p.currency='CLP' ORDER BY p.received_at DESC`,
  ]);
  const contracts = await db.$queryRaw<
    Array<{
      id: string;
      contract_number: string;
      name: string;
      status: string;
      signature_status: string;
      effective_status: string;
      start_date: Date | null;
      end_date: Date | null;
      total: number;
      currency: string;
      billing_frequency: string | null;
      frozen_at: Date | null;
      version: number;
    }>
  >`SELECT id,contract_number,name,status,signature_status,effective_status,start_date,end_date,total,currency,billing_frequency,frozen_at,version FROM public.client_contracts ORDER BY contract_number DESC LIMIT 100`;
  return {
    contracts: contracts.map((c) => ({
      id: c.id,
      number: c.contract_number,
      title: c.name,
      status: c.status,
      signature: c.signature_status,
      effective: c.effective_status,
      start: c.start_date?.toISOString() || null,
      end: c.end_date?.toISOString() || null,
      total: Number(c.total),
      currency: c.currency.trim(),
      frequency: c.billing_frequency,
      review: !c.frozen_at,
      version: c.version,
      documentUrl: `/api/portal/contracts/${c.id}/document`,
    })),
    projects: projects.map((p) => ({
      id: p.id,
      title: p.name,
      number: p.project_number,
      status: projectStatus(p.status),
      progress:
        p.progress !== null && Number.isFinite(Number(p.progress)) ? Number(p.progress) : null,
      category: "Proyecto",
      description: p.description || "",
      scope: p.scope || "",
      start: projectDateOnly(p.planned_start_date),
      end: projectDateOnly(p.target_date),
    })),
    documents: documents.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description || "",
      category:
        d.category === "REPORT" ? "REPORT" : d.category === "CONTRACT" ? "CONTRACT" : "Documento",
      fileName: d.filename,
      date: d.created_at.toISOString(),
    })),
    tickets: tickets.map((t) => ({
      id: t.id,
      title: t.subject,
      status: t.status === "NEW" ? "OPEN" : t.status,
      category: "Asistencia",
      description: t.description,
      date: t.updated_at.toISOString(),
      messages: messages
        .filter((m) => m.ticket_id === t.id)
        .map((m) => ({
          id: m.id,
          actor: m.author_type === "CLIENT" ? "Tú" : "Equipo Zyteron",
          text: m.body,
          date: m.created_at.toISOString(),
        })),
    })),
    messages,
    monitors: monitors.map((m) => ({
      id: m.id,
      name: m.name,
      url: (() => {
        try {
          const u = new URL(m.url);
          return u.origin + u.pathname;
        } catch {
          return "";
        }
      })(),
      status: m.status,
      checkedAt: m.last_checked_at?.toISOString() || null,
      latency: m.last_latency_ms,
      ssl: m.ssl_status,
      sslExpires: m.ssl_expires_at?.toISOString() || null,
    })),
    payments: payments.map((p) => ({
      id: p.id,
      amount: Number(p.gross_amount),
      date: p.received_at.toISOString(),
      receipt: false,
      quoteId: null,
      reference: p.payment_reference || "Pago registrado",
      allocations: p.allocations,
    })),
  };
}
export async function canonicalDocumentForCustomer(userId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return clientDatabase(userId, async (db) => {
    const present = await db.$queryRaw<
      Array<{ available: boolean }>
    >`SELECT to_regclass('public.documents') IS NOT NULL AS available`;
    if (!present[0]?.available) return null;
    const rows = await db.$queryRaw<
      PublishedDocument[]
    >`SELECT d.id,d.title,d.description,v.filename,v.storage_path,d.created_at FROM documents d JOIN document_versions v ON v.id=d.current_version_id WHERE d.id=${id}::uuid`;
    return rows[0] || null;
  });
}
export async function replyToCanonicalTicket(userId: string, id: string, message: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  return clientDatabase(userId, async (db) => {
    const present = await db.$queryRaw<
      Array<{ available: boolean }>
    >`SELECT to_regclass('public.support_tickets') IS NOT NULL AS available`;
    if (!present[0]?.available) return false;
    const tickets = await db.$queryRaw<
      Array<{ id: string; status: string }>
    >`SELECT id,status FROM support_tickets WHERE id=${id}::uuid`;
    if (!tickets.length) return false;
    if (["CLOSED", "RESOLVED", "CANCELLED"].includes(tickets[0]!.status))
      throw new Error("TICKET_CLOSED");
    const { randomUUID } = await import("node:crypto");
    await db.$executeRaw`INSERT INTO ticket_messages(id,ticket_id,author_type,message_type,body,visibility) VALUES(${randomUUID()}::uuid,${id}::uuid,'CLIENT','PORTAL_REPLY',${message},'PUBLIC_REPLY')`;
    return true;
  });
}
