import { clientRecurringState } from "@/lib/payments/client-recurring";
import { clientBillingDocuments } from "@/lib/payments/billing-documents";
import { legacyViewId } from "@/lib/full-control/legacy-id";
import { dueInstant } from "@/lib/payments/monthly-calendar";
import { isSafePortalLink } from "@/lib/portal/safe-link";
import { portalModulePermissions } from "@/lib/portal/module-permissions";
import { scopedCommercial, nativeProposalVisible } from "@/lib/portal/commercial-publications";
import { scopedPublications } from "@/lib/portal/canonical-publications";
import "server-only";
import { prisma } from "@/lib/prisma";
import { credentialPaymentStates } from "@/lib/security/credential-payment-access";
import { projectStatus } from "./project-status";
import { getClientPortalSnapshot } from "@/lib/portal/data";
import { clientDatabase } from "@/lib/portal/scoped-db";
import { decideSiteAccess } from "@/lib/payments/site-access-policy";
import { enrichQuoteRecord, parseQuoteMessage } from "@/lib/admin/quote";
import {
  normalizeQuoteMetaPayment,
  quotePaymentVisibleInPortal,
} from "@/lib/payments/quote-payments";
export async function connectedPortalSnapshot(userId: string) {
  const base = await getClientPortalSnapshot(userId);
  if (!base.user) throw new Error("PORTAL_ACCESS_DENIED");
  const credentialAccess = await prisma.$transaction((db) =>
    credentialPaymentStates(
      db,
      userId,
      base.credentials.map((c) => c.project?.id || null),
    ),
  );
  const extra = await clientDatabase(userId, async (db) => {
    const [services, events, debts, payments, quotes, lifecycle, webThreads, webMessages, billing] =
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
        }),
        db.payment.findMany({
          where: { clientId: userId, status: "CONFIRMED" },
          select: {
            id: true,
            amount: true,
            receivedAt: true,
            provider: true,
            metadata: true,
            reference: true,
            allocations: { select: { receivableId: true, amount: true } },
          },
          orderBy: { receivedAt: "desc" },
        }),
        db.quote.findMany({
          where: {
            OR: [
              { userId },
              { userId: null, email: { equals: base.user!.email, mode: "insensitive" } },
            ],
          },
          orderBy: { createdAt: "desc" },
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
        clientRecurringState(db, userId),
      ]);
    const permissions = await portalModulePermissions(db);
    if (!permissions.enabled) throw new Error("PORTAL_DISABLED");
    const publications = await scopedPublications(db);
    const commercial = await scopedCommercial(db);
    const billingDocuments =
      permissions.invoices && permissions.documents ? await clientBillingDocuments(db, userId) : [];
    const managedSchema = await db.$queryRaw<
      Array<{ available: boolean }>
    >`SELECT to_regclass('public.zyteron_native_project_link') IS NOT NULL AS available`;
    const managedNativeProjects = managedSchema[0]?.available
      ? await db.$queryRaw<
          Array<{ native_id: string }>
        >`SELECT native_id FROM public.zyteron_native_project_link`
      : [];

    return {
      billing,
      services,
      events,
      debts,
      payments,
      quotes,
      lifecycle,
      webThreads,
      webMessages,
      publications,
      commercial,
      managedNativeProjects,
      permissions,
      billingDocuments,
    };
  });
  const nativeQuotes = extra.quotes
    .filter(
      (q) =>
        nativeProposalVisible(q.status, parseQuoteMessage(q.message)) &&
        !extra.billing.archives.some(
          (a) =>
            a.state === "ARCHIVED" &&
            (a.native_quote_id === q.id || a.quote_id === legacyViewId("quote", q.id)),
        ),
    )
    .map((q) => {
      const v = enrichQuoteRecord({ ...q, createdAt: q.createdAt.toISOString() }),
        p = normalizeQuoteMetaPayment(v.meta).payment,
        life = extra.lifecycle.find((l) => l.quote_id === q.id);
      return {
        id: q.id,
        number: v.displayNumber,
        currency: "CLP",
        pdfUrl: `/api/portal/quotes/${q.id}/pdf`,
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
          !extra.billing.archives.some((a) => a.quote_id === legacyViewId("quote", q.id)) &&
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
              managedBy: "FLOW",
              anchorDate: null as string | null,
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
  const quotes = [
    ...nativeQuotes,
    ...extra.commercial.quotes
      .filter(
        (q) =>
          !extra.quotes.some((n) => legacyViewId("quote", n.id) === q.id) &&
          !extra.billing.archives.some((a) => a.quote_id === q.id && a.state === "ARCHIVED"),
      )
      .map((q) => ({
        id: q.id,
        number: q.quote_number,
        title: q.company_name,
        status: q.status,
        total: Number(q.total_amount),
        currency: q.currency.trim(),
        createdAt: q.created_at.toISOString(),
        payable: false,
        pdfUrl: q.document_id ? `/api/portal/quotes/${q.id}/pdf` : null,
        billingType: q.billing_type || "ONE_TIME",
        stages: [],
        subscription: null,
      })),
  ].map((q) => {
    const plan = extra.commercial.plans.find((p) => p.quote_id === q.id);
    return !plan || (q.subscription?.managedBy === "FLOW" && q.subscription.state === "ACTIVE")
      ? q
      : {
          ...q,
          payable: false,
          subscription: {
            quoteId: q.id,
            label: plan.label,
            amount: plan.amount,
            nextDate: plan.next_due,
            activatedAt: plan.created_at.toISOString(),
            state: plan.status,
            paidThrough: null,
            managedBy: "MANUAL",
            anchorDate: plan.anchor_date,
          },
        };
  });
  const now = Date.now();
  return {
    billingDocuments: extra.billingDocuments,
    billingDocumentsEnabled: extra.permissions.invoices && extra.permissions.documents,
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
      username: "",
      masked: c.secretMasked,
      url: "",
      notes: "",
      project: c.project?.title || "",
      access: credentialAccess.get(c.project?.id || null)!,
    })),
    invoices: [
      ...(extra.permissions.invoices ? extra.commercial.invoices : []).map((d) => ({
        id: d.id,
        source: "accounting" as const,
        quoteId: null,
        concept: d.description || d.invoice_number,
        currency: d.currency.trim(),
        total: Number(d.total_amount),
        balance: Number(d.balance_due),
        issued: d.issue_date ? d.issue_date.toISOString().slice(0, 10) + "T12:00:00Z" : "",
        due: d.due_date ? dueInstant(d.due_date.toISOString().slice(0, 10)).toISOString() : null,
        status:
          Number(d.balance_due) === 0
            ? "Pagada"
            : d.due_date && dueInstant(d.due_date.toISOString().slice(0, 10)).getTime() < now
              ? "Vencida"
              : "Pendiente",
      })),
      ...(extra.permissions.invoices ? extra.debts : []).map((d) => {
        const paid = d.allocations.reduce((sum, a) => sum + a.amount, 0),
          balance = Math.max(0, d.totalAmount - paid);
        return {
          id: d.id,
          source: "commercial" as const,
          quoteId:
            d.quoteId ||
            (d.metadata &&
            typeof d.metadata === "object" &&
            !Array.isArray(d.metadata) &&
            typeof d.metadata.quoteId === "string"
              ? d.metadata.quoteId
              : null),
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
    ],
    monitors: extra.permissions.monitoring ? extra.publications.monitors : [],
    payments: [
      ...(extra.permissions.invoices ? extra.publications.payments : []).map((p) => ({
        ...p,
        source: "accounting" as const,
        allocations: p.allocations,
        reference: p.reference,
      })),
      ...(extra.permissions.invoices ? extra.payments : []).map((p) => ({
        id: p.id,
        amount: p.amount,
        date: p.receivedAt.toISOString(),
        receipt: p.provider === "FLOW",
        source: "commercial" as const,
        allocations: p.allocations,
        reference: p.reference || "Pago registrado",
        quoteId:
          p.metadata &&
          typeof p.metadata === "object" &&
          !Array.isArray(p.metadata) &&
          typeof p.metadata.quoteId === "string"
            ? p.metadata.quoteId
            : null,
      })),
    ],
    recurring: extra.permissions.invoices ? extra.billing.recurring : [],
    quotes,
    contracts: extra.permissions.documents ? extra.publications.contracts : [],
    webThreads: extra.webThreads,
    webMessages: extra.webMessages.map((m) => ({ ...m, created_at: m.created_at.toISOString() })),
    asOf: new Date().toISOString(),
  };
}
export type PortalData = Awaited<ReturnType<typeof connectedPortalSnapshot>>;
