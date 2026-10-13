import { isSafePortalLink } from "@/lib/portal/safe-link";
import { portalModulePermissions } from "@/lib/portal/module-permissions";
import { scopedPublications } from "@/lib/portal/canonical-publications";
import "server-only";
import { projectStatus } from "./project-status";
import { getClientPortalSnapshot } from "@/lib/portal/data";
import { clientDatabase } from "@/lib/portal/scoped-db";
import { decideSiteAccess } from "@/lib/payments/site-access-policy";
import { enrichQuoteRecord } from "@/lib/admin/quote";
import {
  normalizeQuoteMetaPayment,
  quotePaymentVisibleInPortal,
} from "@/lib/payments/quote-payments";
export async function connectedPortalSnapshot(userId: string) {
  const base = await getClientPortalSnapshot(userId);
  if (!base.user) throw new Error("PORTAL_ACCESS_DENIED");
  const extra = await clientDatabase(userId, async (db) => {
    const [services, events, debts, payments, quotes, lifecycle, webThreads, webMessages] =
      await Promise.all([
        db.$queryRaw<
          Array<{
            id: string;
            service_name: string;
            status: string;
            agreed_price: string | number | null;
            currency: string;
            renewal_date: Date | null;
            billing_frequency: string | null;
            sla: string | null;
            legacy_quote_id: string | null;
          }>
        >`SELECT id,service_name,status,agreed_price,currency,renewal_date,billing_frequency,sla,legacy_quote_id FROM client_services WHERE portal_visible ORDER BY created_at DESC LIMIT 100`,
        db.$queryRaw<
          Array<{
            id: string;
            title: string;
            description: string;
            occurred_at: Date;
            event_type: string;
          }>
        >`SELECT id,title,description,occurred_at,event_type FROM client_events WHERE visibility='CLIENT_VISIBLE' ORDER BY occurred_at DESC LIMIT 100`,
        db.receivable.findMany({
          where: { clientId: userId, status: { notIn: ["VOID", "CANCELLED"] } },
          include: {
            allocations: { where: { payment: { status: "CONFIRMED" } }, select: { amount: true } },
          },
          orderBy: { issuedAt: "desc" },
          take: 200,
        }),
        db.payment.findMany({
          where: { clientId: userId, status: "CONFIRMED" },
          select: { id: true, amount: true, receivedAt: true, provider: true, metadata: true },
          orderBy: { receivedAt: "desc" },
          take: 200,
        }),
        db.quote.findMany({
          where: {
            OR: [
              { userId },
              { userId: null, email: { equals: base.user!.email, mode: "insensitive" } },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        db.$queryRaw<
          Array<{
            quote_id: string;
            state: string;
            paid_through: Date | null;
            verified_at: Date | null;
          }>
        >`SELECT quote_id,state,paid_through,verified_at FROM zyteron_recurring_lifecycle WHERE client_id=${userId}`,
        db.$queryRaw<
          Array<{ id: string; subject: string }>
        >`SELECT id,subject FROM sales_threads WHERE channel='WEB_CHAT' ORDER BY last_message_at DESC NULLS LAST LIMIT 100`,
        db.$queryRaw<
          Array<{
            id: string;
            thread_id: string;
            direction: string;
            actor_kind: string;
            body_text: string;
            created_at: Date;
          }>
        >`SELECT id,thread_id,direction,actor_kind,body_text,created_at FROM sales_messages ORDER BY created_at DESC LIMIT 200`,
      ]);
    const permissions = await portalModulePermissions(db);
    if (!permissions.enabled) throw new Error("PORTAL_DISABLED");
    const publications = await scopedPublications(db);
    const managedSchema = await db.$queryRaw<
      Array<{ available: boolean }>
    >`SELECT to_regclass('public.zyteron_native_project_link') IS NOT NULL AS available`;
    const managedNativeProjects = managedSchema[0]?.available
      ? await db.$queryRaw<
          Array<{ native_id: string }>
        >`SELECT native_id FROM public.zyteron_native_project_link`
      : [];

    return {
      services,
      events,
      debts,
      payments,
      quotes,
      lifecycle,
      webThreads,
      webMessages,
      publications,
      managedNativeProjects,
      permissions,
    };
  });
  const quotes = extra.quotes.map((q) => {
    const v = enrichQuoteRecord({ ...q, createdAt: q.createdAt.toISOString() }),
      p = normalizeQuoteMetaPayment(v.meta).payment,
      life = extra.lifecycle.find((l) => l.quote_id === q.id);
    return {
      id: q.id,
      number: v.displayNumber,
      title:
        v.meta.items
          .map((i) => i.description)
          .filter(Boolean)
          .join(" · ")
          .slice(0, 160) || "Propuesta de servicios",
      status: q.status,
      total: q.total,
      createdAt: q.createdAt.toISOString(),
      payable:
        extra.permissions.invoices &&
        quotePaymentVisibleInPortal(q.status, p) &&
        p?.enabled !== false &&
        q.total > 0 &&
        (p?.billingType === "SUBSCRIPTION"
          ? p.subscription?.status !== "ACTIVE"
          : (p?.stages || []).some(
              (s) =>
                s.dueEnabled &&
                s.paymentChannel === "FLOW" &&
                ["READY", "REJECTED", "PROCESSING"].includes(s.status),
            )),
      billingType: p?.billingType || "ONE_TIME",
      stages: (p?.stages || []).map((s) => ({
        key: s.key,
        label: s.label,
        amount: s.amount,
        status: s.status,
        dueEnabled: !!s.dueEnabled,
        channel: s.paymentChannel,
      })),
      subscription: p?.subscription
        ? {
            quoteId: q.id,
            label: v.displayNumber + " · suscripción mensual",
            amount: p.subscription.amount || q.total,
            nextDate: p.subscription.nextInvoiceDate || null,
            activatedAt: p.subscription.activatedAt || null,
            state: life?.state || p.subscription.status || "PENDING",
            paidThrough: life?.paid_through?.toISOString() || p.subscription.paidThrough || null,
          }
        : null,
    };
  });
  const now = Date.now();
  return {
    user: {
      id: base.user.id,
      name: base.user.name || "Cliente",
      firstName: base.user.firstName || "",
      lastName: base.user.lastName || "",
      email: base.user.email,
      company: base.user.company || "",
      phone: base.user.phone || "",
      rut: base.user.rut || "",
      address: base.user.address || "",
    },
    services: extra.services.map((s) => ({
      id: s.id,
      name: s.service_name,
      status: s.status,
      price: s.agreed_price === null ? null : Number(s.agreed_price),
      currency: s.currency.trim(),
      renewal: s.renewal_date?.toISOString() || null,
      frequency: s.billing_frequency,
      description: s.sla || "",
      quoteId: s.legacy_quote_id,
      continuity: (() => {
        const life = extra.lifecycle.find((l) => l.quote_id === s.legacy_quote_id);
        if (!life) return null;
        const periods = extra.payments
          .filter((p) => p.provider === "FLOW")
          .map((p) => p.metadata as { quoteId?: string; periodEnd?: string } | null)
          .filter((p) => p?.quoteId === s.legacy_quote_id && p.periodEnd)
          .map((p) => new Date(p!.periodEnd!))
          .filter((d) => Number.isFinite(d.getTime()))
          .sort((a, b) => a.getTime() - b.getTime());
        return decideSiteAccess({
          state: life.state,
          verifiedAt: life.verified_at,
          paidThrough: periods.at(-1) || null,
          now: new Date(),
        });
      })(),
    })),
    events: extra.events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description || "",
      date: e.occurred_at.toISOString(),
      kind: e.event_type,
    })),
    projects: !extra.permissions.projects
      ? []
      : [
          ...extra.publications.projects,
          ...base.projects
            .filter((p) => !extra.managedNativeProjects.some((m) => m.native_id === p.id))
            .map((p) => ({
              id: p.id,
              title: p.title,
              status: projectStatus(p.status),
              progress: null,
              category: p.serviceArea,
              description: p.description || "",
              scope: p.scope || "",
              start: p.startDate?.toISOString() || null,
              end: p.endDate?.toISOString() || null,
            })),
        ],
    documents: !extra.permissions.documents
      ? []
      : [
          ...extra.publications.documents,
          ...base.documents.map((d) => ({
            id: d.id,
            title: d.title,
            description: d.description || "",
            category: d.category,
            fileName: d.fileName || "",
            date: d.createdAt.toISOString(),
          })),
        ],
    tickets: !extra.permissions.tickets
      ? []
      : [
          ...extra.publications.tickets,
          ...base.tickets.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            category: t.category || "Asistencia",
            description: t.description,
            date: t.updatedAt.toISOString(),
            messages: t.messages.map((m) => ({
              id: m.id,
              actor: m.authorRole === "CLIENT" ? "Tú" : "Equipo Zyteron",
              text: m.message,
              date: m.createdAt.toISOString(),
            })),
          })),
        ],
    requests: base.portalRequests.map((r) => ({
      id: r.id,
      title: r.title,
      details: r.details,
      type: r.type,
      status: r.status,
      date: r.createdAt.toISOString(),
    })),
    communications: base.communications.map((c) => ({
      id: c.id,
      subject: c.subject,
      message: c.message,
      direction: c.direction,
      date: c.createdAt.toISOString(),
    })),
    notifications: base.notifications.map((n) => ({
      id: n.id,
      title: n.title,
      text: n.body || "",
      read: n.isRead,
      link: n.link && isSafePortalLink(n.link) ? n.link : null,
      date: n.createdAt.toISOString(),
    })),
    credentials: base.credentials.map((c) => ({
      id: c.id,
      name: c.serviceName,
      username: c.username || "",
      masked: c.secretMasked,
      url: c.url || "",
      notes: c.notes || "",
      project: c.project?.title || "",
    })),
    invoices: (extra.permissions.invoices ? extra.debts : []).map((d) => {
      const paid = d.allocations.reduce((sum, a) => sum + a.amount, 0),
        balance = Math.max(0, d.totalAmount - paid);
      return {
        id: d.id,
        quoteId: d.quoteId,
        concept: d.description,
        currency: d.currency,
        total: d.totalAmount,
        balance,
        issued: d.issuedAt.toISOString(),
        due: d.dueAt?.toISOString() || null,
        status:
          balance === 0 ? "Pagada" : d.dueAt && d.dueAt.getTime() < now ? "Vencida" : "Pendiente",
      };
    }),
    monitors: extra.permissions.monitoring ? extra.publications.monitors : [],
    payments: [
      ...(extra.permissions.invoices ? extra.publications.payments : []),
      ...(extra.permissions.invoices ? extra.payments : []).map((p) => ({
        id: p.id,
        amount: p.amount,
        date: p.receivedAt.toISOString(),
        receipt: p.provider === "FLOW",
        quoteId:
          p.metadata &&
          typeof p.metadata === "object" &&
          !Array.isArray(p.metadata) &&
          typeof p.metadata.quoteId === "string"
            ? p.metadata.quoteId
            : null,
      })),
    ],
    quotes,
    contracts: extra.permissions.documents ? extra.publications.contracts : [],
    webThreads: extra.webThreads,
    webMessages: extra.webMessages.map((m) => ({ ...m, created_at: m.created_at.toISOString() })),
    asOf: new Date().toISOString(),
  };
}
export type PortalData = Awaited<ReturnType<typeof connectedPortalSnapshot>>;
