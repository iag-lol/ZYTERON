import "server-only";
import { projectStatus } from "./project-status";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/auth/admin";
import { normalizeQuoteMetaPayment } from "@/lib/payments/quote-payments";
import { enrichQuoteRecord } from "@/lib/admin/quote";
export async function controlSnapshot() {
  await assertAdmin();
  const [
    users,
    leads,
    quotes,
    projects,
    documents,
    tickets,
    requests,
    payments,
    debts,
    audit,
    services,
    events,
    threads,
    messages,
    communications,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CLIENT" },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        phone: true,
        accountStatus: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        email: true,

        phone: true,
        message: true,
        source: true,
        type: true,
        process: { select: { status: true } },
        createdAt: true,
      },
    }),
    prisma.quote.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        title: true,
        description: true,
        scope: true,
        status: true,
        clientId: true,
        startDate: true,
        endDate: true,
        serviceArea: true,
      },
    }),
    prisma.clientDocument.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        userId: true,
        title: true,
        description: true,
        category: true,
        fileName: true,
        createdAt: true,
      },
    }),
    prisma.supportTicket.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 100,
          select: { id: true, message: true, authorRole: true, isInternal: true, createdAt: true },
        },
      },
    }),
    prisma.portalRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.payment.findMany({
      orderBy: { receivedAt: "desc" },
      take: 200,
      select: {
        id: true,
        clientId: true,
        amount: true,
        status: true,
        provider: true,
        receivedAt: true,
      },
    }),
    prisma.receivable.findMany({
      where: { status: { notIn: ["VOID", "CANCELLED"] } },
      orderBy: { issuedAt: "desc" },
      take: 200,
      include: {
        allocations: { where: { payment: { status: "CONFIRMED" } }, select: { amount: true } },
      },
    }),
    prisma.clientAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        action: true,
        targetUserId: true,
        entityType: true,
        entityId: true,
        createdAt: true,
      },
    }),
    prisma.$queryRaw<
      Array<{
        id: string;
        user_id: string;
        service_name: string;
        sla: string | null;
        start_date: Date;
        renewal_date: Date | null;
        agreed_price: string | null;
        billing_frequency: string | null;
        status: string;
        portal_visible: boolean;
        legacy_quote_id: string | null;
        legacy_project_id: string | null;
      }>
    >`SELECT s.id,l.user_id,s.service_name,s.sla,s.start_date,s.renewal_date,s.agreed_price,s.billing_frequency,s.status,s.portal_visible,s.legacy_quote_id,s.legacy_project_id FROM client_services s JOIN zyteron_legacy_client_link l ON l.client_id=s.client_id ORDER BY s.created_at DESC LIMIT 200`,
    prisma.$queryRaw<
      Array<{
        id: string;
        user_id: string;
        title: string;
        description: string | null;
        occurred_at: Date;
        visibility: string;
      }>
    >`SELECT e.id,l.user_id,e.title,e.description,e.occurred_at,e.visibility FROM client_events e JOIN zyteron_legacy_client_link l ON l.client_id=e.client_id ORDER BY e.occurred_at DESC LIMIT 200`,
    prisma.$queryRaw<
      Array<{
        id: string;
        subject: string;
        legacy_user_id: string | null;
        message_count: number;
        last_message_at: Date | null;
        lead_id: string | null;
        quote_id: string | null;
      }>
    >`SELECT id,subject,legacy_user_id,message_count,last_message_at,lead_id,quote_id FROM sales_threads WHERE channel='WEB_CHAT' ORDER BY last_message_at DESC NULLS LAST LIMIT 100`,
    prisma.$queryRaw<
      Array<{
        id: string;
        thread_id: string;
        direction: string;
        actor_kind: string;
        body_text: string;
        created_at: Date;
      }>
    >`SELECT m.id,m.thread_id,m.direction,m.actor_kind,m.body_text,m.created_at FROM sales_messages m JOIN sales_threads t ON t.id=m.thread_id WHERE t.channel='WEB_CHAT' ORDER BY m.created_at DESC LIMIT 500`,
    prisma.clientCommunication.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        userId: true,
        subject: true,
        message: true,
        direction: true,
        createdAt: true,
      },
    }),
  ]);
  const iso = (v: Date | null) => v?.toISOString() || null;
  const quoteRows = quotes.map((q) => {
    const v = enrichQuoteRecord({ ...q, createdAt: q.createdAt.toISOString() });
    return {
      id: q.id,
      userId: q.userId,
      name: q.name,
      email: q.email,
      company: q.company,
      number: v.displayNumber,
      title: v.meta.items.map((i) => i.description).join(" · ") || "Solicitud de propuesta",
      status: q.status,
      total: q.total,
      date: q.createdAt.toISOString(),
      items: v.meta.items,
      notes: v.meta.notes || "",
      billingType: normalizeQuoteMetaPayment(v.meta).payment?.billingType || "ONE_TIME",
      includeIva: v.meta.includeIva !== false,
      stages: (normalizeQuoteMetaPayment(v.meta).payment?.stages || []).map((s) => ({
        key: s.key,
        label: s.label,
        status: s.status,
        amount: s.amount,
      })),
    };
  });
  return {
    users: users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      emailVerifiedAt: iso(u.emailVerifiedAt),
    })),
    leads: leads.map((l) => ({
      ...l,
      company: users.find((u) => u.email.toLowerCase() === l.email.toLowerCase())?.company || null,
      status: l.process?.status || "RECEIVED",
      createdAt: l.createdAt.toISOString(),
    })),
    quotes: quoteRows,
    projects: projects.map((p) => ({
      ...p,
      status: projectStatus(p.status),
      startDate: iso(p.startDate),
      endDate: iso(p.endDate),
    })),
    documents: documents.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })),
    tickets: tickets.map((t) => ({
      id: t.id,
      userId: t.userId,
      title: t.title,
      status: t.status,
      description: t.description,
      category: t.category,
      priority: t.priority,
      updatedAt: t.updatedAt.toISOString(),
      messages: t.messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
    })),
    requests: requests.map((r) => ({
      id: r.id,
      userId: r.userId,
      title: r.title,
      details: r.details,
      status: r.status,
      type: r.type,
      createdAt: r.createdAt.toISOString(),
    })),
    payments: payments.map((p) => ({ ...p, receivedAt: p.receivedAt.toISOString() })),
    debts: debts.map((d) => ({
      id: d.id,
      clientId: d.clientId,
      quoteId: d.quoteId,
      description: d.description,
      total: d.totalAmount,
      balance: Math.max(0, d.totalAmount - d.allocations.reduce((s, a) => s + a.amount, 0)),
      currency: d.currency,
      status: d.status,
      dueAt: iso(d.dueAt),
    })),
    audit: audit.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
    resources: [
      ...services.map((s) => ({
        id: s.id,
        userId: s.user_id,
        kind: "SERVICE",
        title: s.service_name,
        description: s.sla || "",
        date: s.start_date.toISOString().slice(0, 10),
        renewal: s.renewal_date?.toISOString().slice(0, 10) || "",
        price: Number(s.agreed_price || 0),
        frequency: s.billing_frequency || "ONE_TIME",
        status: s.status,
        published: s.portal_visible,
        quoteId: s.legacy_quote_id || "",
        projectId: s.legacy_project_id || "",
      })),
      ...events.map((e) => ({
        id: e.id,
        userId: e.user_id,
        kind: "EVENT",
        title: e.title,
        description: e.description || "",
        date: e.occurred_at.toISOString().slice(0, 10),
        renewal: "",
        price: 0,
        frequency: "ONE_TIME",
        status: "PENDING_ACTIVATION",
        published: e.visibility === "CLIENT_VISIBLE",
        quoteId: "",
        projectId: "",
      })),
    ],
    threads: threads.map((t) => ({ ...t, last_message_at: iso(t.last_message_at) })),
    messages: messages.map((m) => ({ ...m, created_at: m.created_at.toISOString() })),
    communications: communications.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
    asOf: new Date().toISOString(),
  };
}
export type ControlData = Awaited<ReturnType<typeof controlSnapshot>>;
