import "server-only";
import type { Prisma } from "@prisma/client";
import { clientDatabase } from "./scoped-db";
import { projectStatus } from "@/lib/client-experience/project-status";
type PublishedDocument = {
  id: string;
  title: string;
  description: string | null;
  filename: string;
  storage_path: string;
  created_at: Date;
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
    if (isolated) return { projects: [], documents: [], tickets: [], messages: [] };
    throw new Error("PORTAL_PUBLICATION_SCHEMA_UNAVAILABLE");
  }
  const [projects, documents, tickets, messages] = await Promise.all([
    db.$queryRaw<
      Array<{
        id: string;
        name: string;
        description: string | null;
        scope: string | null;
        status: string;
        planned_start_date: Date | null;
        target_date: Date | null;
      }>
    >`SELECT id,name,description,scope,status,planned_start_date,target_date FROM projects ORDER BY created_at DESC LIMIT 100`,
    db.$queryRaw<
      PublishedDocument[]
    >`SELECT d.id,d.title,d.description,v.filename,v.storage_path,d.created_at FROM documents d JOIN document_versions v ON v.id=d.current_version_id ORDER BY d.created_at DESC LIMIT 100`,
    db.$queryRaw<
      Array<{ id: string; subject: string; description: string; status: string; updated_at: Date }>
    >`SELECT id,subject,description,status,updated_at FROM support_tickets ORDER BY updated_at DESC LIMIT 100`,
    db.$queryRaw<
      Array<{ id: string; ticket_id: string; author_type: string; body: string; created_at: Date }>
    >`SELECT id,ticket_id,author_type,body,created_at FROM ticket_messages ORDER BY created_at ASC LIMIT 500`,
  ]);
  return {
    projects: projects.map((p) => ({
      id: p.id,
      title: p.name,
      status: projectStatus(p.status),
      category: "Proyecto",
      description: p.description || "",
      scope: p.scope || "",
      start: p.planned_start_date?.toISOString() || null,
      end: p.target_date?.toISOString() || null,
    })),
    documents: documents.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description || "",
      category: "Documento",
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
