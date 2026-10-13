import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { controlSnapshot, type ControlData } from "@/lib/client-experience/control-snapshot";
import { enrichQuoteRecord, parseQuoteMessage, serializeQuoteMessage } from "@/lib/admin/quote";
import { generateQuotePdf } from "@/lib/admin/quote-pdf";
import { POST as nativeAction } from "@/app/api/control/[action]/route";
import { PATCH as requestAction } from "@/app/api/portal/admin/requests/[id]/route";
import { POST as chatReply } from "@/app/api/admin/chat/[id]/reply/route";
import type {
  CommercialSummary,
  ExecutiveDashboard,
  SalesLead,
  SalesQuote,
  SupportTicket,
  SupportWorkspace,
} from "@zyteron/contracts";
export function legacyViewId(type: string, id: string) {
  if (/^[0-9a-f-]{36}$/i.test(id)) return id;
  const h = createHash("sha256").update(`zyteron:legacy-view:${type}:${id}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
type Link = { user_id: string; client_id: string };
async function links() {
  return prisma.$queryRaw<Link[]>`SELECT user_id,client_id FROM zyteron_legacy_client_link`;
}
const clientId = (rows: Link[], id: string | null) =>
  rows.find((l) => l.user_id === id)?.client_id || null;
const sourceUser = (rows: Link[], id: string) =>
  rows.find((l) => l.client_id === id)?.user_id || null;
const id = (type: string, value: string) => legacyViewId(type, value);
function leads(s: ControlData, ls: Link[]): SalesLead[] {
  return s.leads.map((l) => ({
    id: id("lead", l.id),
    companyName: l.company || l.name,
    contactName: l.name,
    email: l.email,
    phone: l.phone,
    whatsapp: null,
    website: null,
    rut: null,
    sourceId: null,
    sourceName: l.source || l.type,
    campaign: null,
    interest: l.type,
    notes: l.message,
    assignedTo: null,
    status:
      l.status === "LOST"
        ? "DISQUALIFIED"
        : l.status === "CLOSED"
          ? "CONVERTED"
          : l.status === "IN_PROGRESS"
            ? "CONTACTED"
            : "NEW",
    score: null,
    scoreReason: "Sin evaluación registrada",
    nextActionAt: null,
    clientId: clientId(
      ls,
      s.users.find((u) => u.email.toLowerCase() === l.email.toLowerCase())?.id || null,
    ),
    assignedBy: null,
    assignedAt: null,
    createdBy: null,
    createdAt: l.createdAt,
    updatedAt: l.createdAt,
    archivedAt: null,
  }));
}
async function quotes(s: ControlData, ls: Link[]): Promise<SalesQuote[]> {
  const raw = await prisma.quote.findMany({ where: { id: { in: s.quotes.map((q) => q.id) } } });
  return raw.map((q) => {
    const e = enrichQuoteRecord({ ...q, createdAt: q.createdAt.toISOString() }),
      m = e.meta as typeof e.meta & { controlState?: SalesQuote["status"] };
    return {
      id: id("quote", q.id),
      quoteNumber: e.displayNumber,
      version: 1,
      clientId:
        clientId(ls, q.userId) ||
        clientId(
          ls,
          s.users.find((u) => u.email.toLowerCase() === q.email.toLowerCase())?.id || null,
        ),
      leadId: null,
      opportunityId: null,
      companyName: q.company || q.name,
      contactName: q.name,
      contactEmail: q.email,
      ownerId: null,
      status:
        q.status === "WON"
          ? "ACCEPTED"
          : q.status === "LOST"
            ? "CANCELLED"
            : m.controlState || (q.status === "SENT" ? "SENT" : "DRAFT"),
      currency: "CLP",
      subtotal: m.items.length
        ? m.items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0)
        : q.subtotal,
      discountTotal: m.totalDescuento,
      netAmount: q.total - m.iva,
      taxRate: m.includeIva ? 19 : 0,
      taxAmount: m.iva,
      totalAmount: q.total,
      validUntil: m.validUntil || null,
      paymentTerms: m.terms || null,
      commercialTerms: null,
      notes: m.notes || null,
      documentId: null,
      documentHash: null,
      sentAt: null,
      acceptedAt: null,
      saleId: null,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.createdAt.toISOString(),
      items: m.items.map((i, n) => ({
        id: i.id || String(n),
        quoteId: id("quote", q.id),
        catalogServiceId: null,
        description: i.description,
        quantity: i.qty,
        unitPrice: i.unitPrice,
        discountPercent: i.discountPct || 0,
        taxable: m.includeIva !== false && i.taxable !== false,
        subtotal: Math.round(i.qty * i.unitPrice * (1 - (i.discountPct || 0) / 100)),
      })),
    };
  });
}
function tickets(s: ControlData, ls: Link[]): SupportTicket[] {
  const base = (
    entityId: string,
    userId: string,
    subject: string,
    description: string,
    status: string,
    date: string,
  ): SupportTicket => ({
    id: entityId,
    ticketNumber: "SOL-" + entityId.slice(0, 8).toUpperCase(),
    requesterType: "CLIENT",
    clientId: clientId(ls, userId),
    clientName:
      s.users.find((u) => u.id === userId)?.company ||
      s.users.find((u) => u.id === userId)?.name ||
      null,
    clientContactId: null,
    contactName: s.users.find((u) => u.id === userId)?.name || null,
    requesterUserId: null,
    projectId: null,
    projectName: null,
    serviceId: null,
    subject,
    description,
    ticketType: "SERVICE_REQUEST",
    categoryId: null,
    categoryName: null,
    subcategoryId: null,
    channel: "PORTAL",
    priority: "NORMAL",
    severity: "MEDIUM",
    status: status as SupportTicket["status"],
    queueId: null,
    queueName: null,
    assignedTo: null,
    teamId: null,
    slaPolicyId: null,
    firstResponseDueAt: null,
    resolutionDueAt: null,
    firstRespondedAt: null,
    resolvedAt: null,
    closedAt: null,
    resolutionCode: null,
    resolutionSummary: null,
    rootCause: null,
    clientVisibility: "CLIENT_VISIBLE",
    privacy: "NORMAL",
    reopenedCount: 0,
    archivedAt: null,
    createdBy: null,
    createdAt: date,
    updatedAt: date,
  });
  return [
    ...s.tickets.map((t) => ({
      ...base(
        id("ticket", t.id),
        t.userId,
        t.title,
        t.description,
        t.status === "OPEN" ? "NEW" : t.status,
        t.updatedAt,
      ),
      priority: t.priority as SupportTicket["priority"],
    })),
    ...s.requests.map((r) => ({
      ...base(
        id("request", r.id),
        r.userId,
        r.title,
        r.details,
        (
          {
            PENDING: "NEW",
            IN_PROGRESS: "IN_PROGRESS",
            COMPLETED: "RESOLVED",
            REJECTED: "CANCELLED",
          } as Record<string, string>
        )[r.status] || "NEW",
        r.createdAt,
      ),
      categoryName: r.type,
    })),
    ...s.threads.map((t) => ({
      ...base(
        t.id,
        t.legacy_user_id || "",
        t.subject,
        "Conversación recibida desde el chat de la web",
        "NEW",
        t.last_message_at || s.asOf,
      ),
      channel: "WEB_CHAT" as SupportTicket["channel"],
      categoryName: "Chat web / IA",
    })),
  ];
}
function mergePage(
  existing: { items: unknown[]; total?: number },
  additional: unknown[],
  params: URLSearchParams,
) {
  const query = (params.get("search") || "").toLocaleLowerCase("es");
  const state = params.get("status"),
    client = params.get("clientId");
  const items = [...existing.items, ...additional].filter((value) => {
    const r = value as Record<string, unknown>;
    return (
      (!query || JSON.stringify(r).toLocaleLowerCase("es").includes(query)) &&
      (!state || r.status === state) &&
      (!client || r.clientId === client)
    );
  });
  const page = Math.max(1, Number(params.get("page")) || 1),
    pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize")) || 25));
  return {
    ...existing,
    items: items.slice((page - 1) * pageSize, page * pageSize),
    total: items.length,
    totalPages: Math.ceil(items.length / pageSize),
    page,
    pageSize,
  };
}
export function legacyReadPath(path: string) {
  return /^\/(executive\/dashboard|commercial\/(summary|search)|leads|quotes|sales|sales\/summary|documents(?:\/workspace)?|projects|operations\/summary|support\/(workspace|tickets|search)|finance\/(dashboard|payments|invoices|receivables(?:\/aging)?|collections)|clients\/[^/]+\/(summary|support-summary|documents|finance-summary))$/.test(
    path,
  );
}
export async function mergeLegacyRead(path: string, params: URLSearchParams, body: unknown) {
  const s = await controlSnapshot(),
    ls = await links();
  const rows = body as Record<string, unknown>;
  if (path === "/quotes")
    return mergePage(body as { items: unknown[] }, await quotes(s, ls), params);
  if (path === "/leads") return mergePage(body as { items: unknown[] }, leads(s, ls), params);
  if (path === "/commercial/search") {
    const query = (params.get("q") || "").toLowerCase();
    const match = (r: unknown) => JSON.stringify(r).toLowerCase().includes(query);
    return {
      ...rows,
      leads: [...(rows.leads as unknown[]), ...leads(s, ls).filter(match)],
      quotes: [...(rows.quotes as unknown[]), ...(await quotes(s, ls)).filter(match)],
    };
  }
  if (path === "/commercial/summary") {
    const result = body as CommercialSummary;
    const nativeSales = await prisma.sale.findMany({ select: { total: true, createdAt: true } });
    const currentMonth = s.asOf.slice(0, 7);
    const monthSales = nativeSales
      .filter((v) => v.createdAt.toISOString().slice(0, 7) === currentMonth)
      .reduce((sum, v) => sum + v.total, 0);
    return {
      ...result,
      monthSales: result.monthSales + monthSales,
      newLeads:
        result.newLeads + s.leads.filter((l) => ["NEW", "RECEIVED"].includes(l.status)).length,
      uncontactedLeads:
        result.uncontactedLeads +
        s.leads.filter((l) => !["CLOSED", "LOST", "IN_PROGRESS"].includes(l.status)).length,
      pendingQuotes:
        result.pendingQuotes +
        s.quotes.filter((q) => !["WON", "LOST"].includes(q.status || "")).length,
    };
  }
  if (path === "/executive/dashboard") {
    const result = body as ExecutiveDashboard;
    const nativeSales = await prisma.sale.findMany({ select: { total: true, createdAt: true } });
    const monthSales = nativeSales
      .filter((v) => v.createdAt.toISOString().slice(0, 7) === s.asOf.slice(0, 7))
      .reduce((sum, v) => sum + v.total, 0);
    return {
      ...result,
      metrics: {
        ...result.metrics,
        salesThisMonth: result.metrics.salesThisMonth + monthSales,
        activeProjects:
          result.metrics.activeProjects +
          s.projects.filter((p) => p.status === "IN_PROGRESS").length,
        pendingQuotes:
          result.metrics.pendingQuotes +
          s.quotes.filter((q) => !["WON", "LOST"].includes(q.status || "")).length,
        pendingInvoices:
          result.metrics.pendingInvoices + s.debts.filter((d) => d.balance > 0).length,
        overdueReceivables:
          result.metrics.overdueReceivables +
          s.debts.filter((d) => d.balance > 0 && d.dueAt && d.dueAt < s.asOf).length,
        criticalTickets:
          result.metrics.criticalTickets +
          s.tickets.filter(
            (t) => t.priority === "URGENT" && !["CLOSED", "RESOLVED"].includes(t.status),
          ).length,
      },
    };
  }
  if (path === "/support/workspace") {
    const result = body as SupportWorkspace,
      extra = tickets(s, ls),
      open = extra.filter((t) => !["CLOSED", "RESOLVED", "CANCELLED"].includes(t.status));
    return {
      ...result,
      tickets: [...result.tickets, ...extra],
      summary: {
        ...result.summary,
        openTickets: result.summary.openTickets + open.length,
        newTickets: result.summary.newTickets + extra.filter((t) => t.status === "NEW").length,
        unassigned: result.summary.unassigned + open.length,
        awaitingFirstResponse: result.summary.awaitingFirstResponse + open.length,
      },
    };
  }
  if (path === "/support/tickets")
    return mergePage(body as { items: unknown[] }, tickets(s, ls), params);
  if (path === "/support/search") {
    const query = (params.get("q") || "").toLowerCase();
    return [
      ...(body as unknown[]),
      ...tickets(s, ls).filter((t) => `${t.subject} ${t.clientName}`.toLowerCase().includes(query)),
    ];
  }
  // Other native lists keep their own financial identifiers and are projections, never copied ledgers.
  if (path === "/finance/payments") {
    return mergePage(
      body as { items: unknown[] },
      s.payments.map((p) => ({
        id: id("payment", p.id),
        paymentReference: p.id,
        clientId: clientId(ls, p.clientId),
        clientName:
          s.users.find((u) => u.id === p.clientId)?.company ||
          s.users.find((u) => u.id === p.clientId)?.name,
        provider: p.provider,
        method: p.provider,
        currency: "CLP",
        grossAmount: p.amount,
        feeAmount: null,
        netAmount: null,
        receivedAt: p.receivedAt,
        status: p.status,
        externalId: null,
        externalStatus: null,
        allocatedAmount: null,
        refundedAmount: 0,
        unappliedAmount: null,
        bankAccountId: null,
        bankTransactionId: null,
        cashMovementId: null,
        evidencePath: null,
        notes:
          "Registro histórico de la web; consulta el documento de origen para comisiones y aplicación.",
        recordedBy: null,
        confirmedBy: null,
        confirmedAt: p.status === "CONFIRMED" ? p.receivedAt : null,
        settlementStatus: "UNKNOWN",
        moneyReleaseDate: null,
        createdAt: p.receivedAt,
      })),
      params,
    );
  }
  return extraLegacyRead(path, params, body, s, ls);
}
function internalRequest(request: Request, path: string, body: unknown, method = "POST") {
  const u = new URL(request.url);
  u.pathname = path;
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  return new Request(u, { method, headers, body: JSON.stringify(body) });
}
export async function handleLegacyDetail(request: Request, path: string, payload: Buffer) {
  const parts = path.split("/").filter(Boolean);
  if (!["quotes", "support", "projects", "documents", "finance"].includes(parts[0] || ""))
    return null;
  const s = await controlSnapshot(),
    ls = await links();
  const body = payload.length ? JSON.parse(payload.toString()) : {};
  if (parts[0] === "documents" && parts[1] && parts[1] !== "workspace") {
    const doc = s.documents.find((d) => id("document", d.id) === parts[1]);
    if (!doc) return null;
    if (request.method === "GET" && parts[2] === "download")
      return NextResponse.json({
        url: `/api/portal/documents/${doc.id}/download`,
        filename: doc.fileName || doc.title + ".pdf",
      });
    if (request.method === "GET" && parts.length === 2)
      return NextResponse.json({
        document: (await legacyDocuments(s)).find((d) => d.id === parts[1]),
        versions: [],
        links: [],
        reviews: [],
        signatures: [],
        relationships: [],
        comments: [],
        permissions: [],
        activity: [],
        duplicateWarnings: [],
      });
    return NextResponse.json(
      {
        message:
          "Este archivo conserva su registro histórico. Sus modificaciones requieren una nueva versión documental.",
      },
      { status: 409 },
    );
  }
  if (parts[0] === "finance" && parts[1] === "payments" && parts[2]) {
    const p = s.payments.find((p) => id("payment", p.id) === parts[2]);
    if (!p) return null;
    if (request.method === "GET") {
      const actual = await prisma.payment.findUnique({
        where: { id: p.id },
        include: { allocations: { include: { receivable: true } } },
      });
      if (!actual) return null;
      const allocated = actual.allocations.reduce((sum, a) => sum + a.amount, 0);
      return NextResponse.json({
        id: parts[2],
        paymentReference: actual.reference || p.id,
        clientId: clientId(ls, p.clientId),
        clientName:
          s.users.find((u) => u.id === p.clientId)?.company ||
          s.users.find((u) => u.id === p.clientId)?.name ||
          null,
        provider: p.provider || "OTHER",
        method: actual.method,
        currency: actual.currency,
        grossAmount: p.amount,
        feeAmount: null,
        netAmount: null,
        receivedAt: p.receivedAt,
        status: p.status,
        allocatedAmount: allocated,
        unappliedAmount: Math.max(0, p.amount - allocated),
        refundedAmount: 0,
        confirmedAt: p.status === "CONFIRMED" ? p.receivedAt : null,
        evidencePath: actual.proofUrl || null,
        bankTransactionId: null,
        allocations: actual.allocations.map((a) => ({
          id: a.id,
          invoiceId: id("receivable", a.receivableId),
          invoiceNumber: "AR-" + a.receivableId.slice(0, 8).toUpperCase(),
          amount: a.amount,
          allocatedAt: a.createdAt.toISOString(),
          reversedAt: null,
        })),
        refunds: [],
        legacySource: true,
      });
    }
    return NextResponse.json(
      {
        message:
          "Este pago pertenece al libro histórico del portal. No se puede modificar desde un libro contable diferente.",
      },
      { status: 409 },
    );
  }
  if (parts[0] === "projects" && parts[1]) {
    const native = s.projects.find((p) => id("project", p.id) === parts[1]);
    if (!native) return null;
    if (request.method === "GET") {
      const result = (await extraLegacyRead(
        "/projects",
        new URLSearchParams({ pageSize: "100" }),
        { items: [] },
        s,
        ls,
      )) as { items: Array<Record<string, unknown>> };
      const project = result.items.find((p) => p.id === parts[1]);
      if (parts.length === 2) return NextResponse.json(project);
      if (parts[2] === "summary")
        return NextResponse.json({
          project,
          nextMilestone: null,
          openTasks: 0,
          overdueTasks: 0,
          blockedTasks: 0,
          usedMinutes: 0,
          remainingMinutes: null,
          members: 0,
          pendingDeliverables: 0,
          activeRisks: 0,
        });
      if (
        [
          "activity",
          "members",
          "milestones",
          "tasks",
          "worklogs",
          "deliverables",
          "deployments",
          "endpoints",
          "risks",
          "change-requests",
        ].includes(parts[2] || "")
      )
        return NextResponse.json([]);
    }
    if (request.method === "POST" && parts[2] === "status") {
      const status = (
        {
          PLANNING: "PLANNED",
          READY: "PLANNED",
          IN_PROGRESS: "IN_PROGRESS",
          COMPLETED: "DONE",
          CANCELLED: "CANCELLED",
        } as Record<string, string>
      )[body.status];
      if (!status)
        return NextResponse.json(
          {
            message:
              "Este proyecto histórico admite planificación, ejecución, entrega o cancelación.",
          },
          { status: 409 },
        );
      return nativeAction(
        internalRequest(request, "/api/control/project", {
          id: native.id,
          clientId: native.clientId,
          title: native.title,
          description: native.description || "",
          scope: native.scope || "",
          status,
        }),
        { params: Promise.resolve({ action: "project" }) },
      );
    }
    return NextResponse.json(
      {
        message:
          "El proyecto histórico conserva sus registros de origen. Crea las nuevas relaciones desde un proyecto operativo.",
      },
      { status: 409 },
    );
  }
  if (parts[0] === "quotes" && parts.length === 1 && request.method === "POST") {
    const userId = sourceUser(ls, body.clientId);
    if (!userId) return null;
    if (body.currency && body.currency !== "CLP")
      return NextResponse.json(
        { message: "Esta cuenta usa cotizaciones y cobros en CLP." },
        { status: 400 },
      );
    const values = {
      userId,
      includeIva: Number(body.taxRate) > 0,
      billingType: body.billingType === "SUBSCRIPTION" ? "SUBSCRIPTION" : "ONE_TIME",
      notes: body.notes || "",
      items: (body.items || []).map((i: Record<string, unknown>) => ({
        description: i.description,
        qty: i.quantity,
        unitPrice: i.unitPrice,
        discountPct: i.discountPercent || 0,
        unit: "unidad",
        taxable: i.taxable !== false,
      })),
    };
    const r = await nativeAction(internalRequest(request, "/api/control/quote", values), {
      params: Promise.resolve({ action: "quote" }),
    });
    const v = await r.json();
    if (!r.ok) return NextResponse.json({ message: v.error }, { status: r.status });
    const created = await prisma.quote.findUnique({ where: { id: v.id } });
    if (created) {
      const meta = parseQuoteMessage(created.message);
      await prisma.quote.update({
        where: { id: v.id },
        data: {
          message: serializeQuoteMessage({
            ...meta,
            validUntil: typeof body.validUntil === "string" ? body.validUntil : undefined,
            paymentTerms: typeof body.paymentTerms === "string" ? body.paymentTerms : undefined,
            terms: typeof body.commercialTerms === "string" ? body.commercialTerms : meta.terms,
            ...(body.billingType === "SUBSCRIPTION"
              ? {
                  payment: {
                    ...meta.payment,
                    subscription: { interval: "MONTHLY", amount: created.total, status: "PENDING" },
                  },
                }
              : {}),
          }),
        },
      });
    }
    const updated = await controlSnapshot();
    return NextResponse.json((await quotes(updated, ls)).find((q) => q.id === id("quote", v.id)));
  }
  if (parts[0] === "quotes" && parts[1]) {
    const native = s.quotes.find((q) => id("quote", q.id) === parts[1]);
    if (!native) return null;
    const raw = await prisma.quote.findUnique({ where: { id: native.id } });
    if (!raw) return null;
    if (request.method === "GET")
      return NextResponse.json((await quotes(s, ls)).find((q) => q.id === parts[1]));
    const action = parts[2];
    if (action === "preview") {
      const e = enrichQuoteRecord({ ...raw, createdAt: raw.createdAt.toISOString() });
      const bytes = await generateQuotePdf({
        quoteId: raw.id,
        clientName: raw.name,
        clientEmail: raw.email,
        clientPhone: raw.phone,
        clientCompany: raw.company,
        status: raw.status,
        createdAt: raw.createdAt.toISOString(),
        meta: e.meta,
      });
      return NextResponse.json({
        contentBase64: Buffer.from(bytes).toString("base64"),
        filename: e.displayNumber + ".pdf",
      });
    }
    if (action === "pdf") {
      const meta = parseQuoteMessage(raw.message) as ReturnType<typeof parseQuoteMessage> & {
        controlState?: string;
      };
      if (meta.controlState !== "APPROVED")
        return NextResponse.json(
          { message: "Aprueba la propuesta antes de emitir su documento." },
          { status: 409 },
        );
      const bytes = await generateQuotePdf({
        quoteId: raw.id,
        clientName: raw.name,
        clientEmail: raw.email,
        clientPhone: raw.phone,
        clientCompany: raw.company,
        status: raw.status,
        createdAt: raw.createdAt.toISOString(),
        meta,
      });
      const hash = createHash("sha256").update(bytes).digest("hex");
      await prisma.quote.update({
        where: { id: raw.id },
        data: {
          message: serializeQuoteMessage({
            ...meta,
            controlState: "READY_TO_SEND",
            pdfGeneratedAt: new Date().toISOString(),
            documentHash: hash,
          } as typeof meta),
        },
      });
      return NextResponse.json({ filename: native.number + ".pdf", hash });
    }
    if (action === "send") {
      const meta = parseQuoteMessage(raw.message) as ReturnType<typeof parseQuoteMessage> & {
        controlState?: string;
      };
      if (
        meta.controlState !== "READY_TO_SEND" ||
        String(body.to || "")
          .trim()
          .toLowerCase() !== raw.email.toLowerCase()
      )
        return NextResponse.json(
          { message: "La propuesta aprobada debe enviarse al correo vinculado a esta cuenta." },
          { status: 409 },
        );
      const result = await nativeAction(
        internalRequest(request, "/api/control/enable", { id: raw.id, stageKey: "FULL" }),
        { params: Promise.resolve({ action: "enable" }) },
      );
      return result;
    }
    if (action === "accept")
      return NextResponse.json(
        {
          message:
            "La aceptación no acredita un pago. La venta se genera únicamente después de verificar el cobro efectivo.",
        },
        { status: 409 },
      );
    if (["submit-approval", "approve", "reject", "cancel", "decline"].includes(action || "")) {
      const controlState = (
        {
          "submit-approval": "PENDING_APPROVAL",
          approve: "APPROVED",
          reject: "REJECTED",
          cancel: "CANCELLED",
          decline: "DECLINED",
        } as Record<string, string>
      )[action!];
      const financial = await prisma.receivable.count({
        where: { quoteId: raw.id, status: { notIn: ["VOID", "CANCELLED"] } },
      });
      if (financial || raw.status === "WON")
        return NextResponse.json(
          {
            message:
              "Esta cotización tiene obligaciones o pagos vinculados. Debe conservarse su trazabilidad financiera.",
          },
          { status: 409 },
        );
      const m = parseQuoteMessage(raw.message);
      await prisma.quote.update({
        where: { id: raw.id },
        data: {
          message: serializeQuoteMessage({ ...m, controlState } as typeof m),
          ...(action === "cancel" || action === "decline" ? { status: "LOST" } : {}),
        },
      });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      { message: "Esta acción requiere completar el flujo de la cotización vinculada al portal." },
      { status: 409 },
    );
  }
  if (parts[0] === "support" && parts[1] === "tickets" && parts[2]) {
    const t = tickets(s, ls).find((t) => t.id === parts[2]);
    if (!t) return null;
    const sourceTicket = s.tickets.find((v) => id("ticket", v.id) === t.id),
      sourceRequest = s.requests.find((v) => id("request", v.id) === t.id),
      thread = s.threads.find((v) => v.id === t.id);
    if (request.method === "GET") {
      const messages = sourceTicket
        ? sourceTicket.messages.map((m) => ({
            id: m.id,
            ticketId: t.id,
            authorType: m.authorRole === "CLIENT" ? "CLIENT" : "AGENT",
            authorUserId: null,
            authorContactId: null,
            messageType: "PORTAL_REPLY",
            body: m.message,
            visibility: m.isInternal ? "INTERNAL_NOTE" : "PUBLIC_REPLY",
            providerMessageId: null,
            deliveryStatus: "NOT_REQUIRED",
            callDurationMinutes: null,
            callOutcome: null,
            createdAt: m.createdAt,
            editedAt: null,
          }))
        : thread
          ? s.messages
              .filter((m) => m.thread_id === thread.id)
              .map((m) => ({
                id: m.id,
                ticketId: t.id,
                authorType:
                  m.actor_kind === "STAFF" ? "AGENT" : m.actor_kind === "AI" ? "SYSTEM" : "CLIENT",
                authorUserId: null,
                authorContactId: null,
                messageType: "MESSAGE",
                body: m.body_text,
                visibility: "PUBLIC_REPLY",
                providerMessageId: null,
                deliveryStatus: "NOT_REQUIRED",
                callDurationMinutes: null,
                callOutcome: null,
                createdAt: m.created_at,
                editedAt: null,
              }))
          : [];
      const clock = {
        dueAt: null,
        completedAt: null,
        paused: false,
        remainingMinutes: null,
        breached: false,
        consumptionPercent: null,
      };
      return NextResponse.json({
        ticket: t,
        messages,
        sla: {
          ticketId: t.id,
          firstResponse: { ...clock, target: "FIRST_RESPONSE" },
          resolution: { ...clock, target: "RESOLUTION" },
          policy: null,
        },
        relations: [],
        history: [],
        context: null,
        knowledge: [],
      });
    }
    const action = parts[3];
    if (thread && action === "reply")
      return chatReply(
        internalRequest(request, `/api/admin/chat/${thread.id}/reply`, { message: body.body }),
        { params: Promise.resolve({ id: thread.id }) },
      );
    if (sourceRequest && ["reply", "resolve", "close", "change-status"].includes(action || ""))
      return requestAction(
        internalRequest(
          request,
          `/api/portal/admin/requests/${sourceRequest.id}`,
          {
            status:
              action === "resolve" || action === "close"
                ? "COMPLETED"
                : body.status === "IN_PROGRESS"
                  ? "IN_PROGRESS"
                  : sourceRequest.status,
            reply: body.body || body.resolutionSummary || "",
          },
          "PATCH",
        ),
        { params: Promise.resolve({ id: sourceRequest.id }) },
      );
    if (
      sourceTicket &&
      ["reply", "internal-note", "resolve", "close", "reopen", "change-status"].includes(
        action || "",
      )
    ) {
      const status =
        action === "resolve"
          ? "RESOLVED"
          : action === "close"
            ? "CLOSED"
            : action === "reopen"
              ? "OPEN"
              : body.status || sourceTicket.status;
      return nativeAction(
        internalRequest(request, "/api/control/ticket", {
          id: sourceTicket.id,
          status: status === "NEW" ? "OPEN" : status,
          message: body.body || body.resolutionSummary || "",
          internal: action === "internal-note",
        }),
        { params: Promise.resolve({ action: "ticket" }) },
      );
    }
    return NextResponse.json(
      {
        message:
          "Esta conversación conserva su canal de origen. Usa una respuesta o una actualización compatible.",
      },
      { status: 409 },
    );
  }
  return null;
}
async function legacyInvoices(s: ControlData, ls: Link[]) {
  const records = await prisma.receivable.findMany({
    where: { id: { in: s.debts.map((d) => d.id) } },
  });
  return s.debts.map((d) => {
    const source = records.find((r) => r.id === d.id)!;
    const overdue = !!d.dueAt && d.dueAt < s.asOf && d.balance > 0;
    return {
      id: id("receivable", d.id),
      invoiceNumber: "AR-" + d.id.slice(0, 8).toUpperCase(),
      documentTypeCode: 0,
      clientId: clientId(ls, d.clientId),
      clientName:
        s.users.find((u) => u.id === d.clientId)?.company ||
        s.users.find((u) => u.id === d.clientId)?.name ||
        null,
      saleId: source.saleId,
      contractId: null,
      projectId: source.projectId ? id("project", source.projectId) : null,
      clientServiceId: null,
      billingScheduleId: null,
      referenceInvoiceId: null,
      referenceCode: null,
      referenceReason: null,
      currency: d.currency,
      exchangeRate: 1,
      netAmount: null,
      exemptAmount: null,
      taxAmount: null,
      totalAmount: d.total,
      taxRate: null,
      taxRuleVersionId: null,
      amountPaid: d.total - d.balance,
      amountCredited: 0,
      balanceDue: d.balance,
      status: d.balance === 0 ? "PAID" : d.balance < d.total ? "PARTIALLY_PAID" : "ISSUED",
      effectiveStatus:
        d.balance === 0
          ? "PAID"
          : overdue
            ? "OVERDUE"
            : d.balance < d.total
              ? "PARTIALLY_PAID"
              : "ISSUED",
      issueDate: source.issuedAt.toISOString().slice(0, 10),
      dueDate: d.dueAt?.slice(0, 10) || null,
      paymentTermsDays: null,
      paymentTerms: null,
      description: d.description,
      notes: "Obligación histórica de la web; no corresponde a la emisión de un nuevo DTE.",
      clientSnapshot: {
        legalName:
          s.users.find((u) => u.id === d.clientId)?.company ||
          s.users.find((u) => u.id === d.clientId)?.name ||
          null,
      },
      taxDocumentId: source.taxDocumentId,
      approvalRequired: false,
      approvedBy: null,
      approvedAt: null,
      issuedAt: source.issuedAt.toISOString(),
      cancelledAt: null,
      cancelReason: null,
      createdBy: null,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
      lines: [],
      daysOverdue: overdue
        ? Math.floor((new Date(s.asOf).getTime() - new Date(d.dueAt!).getTime()) / 86_400_000)
        : 0,
    };
  });
}
function legacyAging(invoices: Awaited<ReturnType<typeof legacyInvoices>>, asOf: string) {
  const buckets = [
    { key: "CURRENT", label: "Vigente", amount: 0, count: 0 },
    { key: "D1_30", label: "1–30 días", amount: 0, count: 0 },
    { key: "D31_60", label: "31–60 días", amount: 0, count: 0 },
    { key: "D61_90", label: "61–90 días", amount: 0, count: 0 },
    { key: "D90_PLUS", label: "Más de 90 días", amount: 0, count: 0 },
  ];
  const parties = new Map<
    string,
    {
      partyId: string;
      partyName: string | null;
      total: number;
      buckets: Record<string, number>;
      oldestDays: number;
    }
  >();
  for (const i of invoices.filter((i) => i.balanceDue > 0 && i.currency === "CLP")) {
    const days = i.dueDate
      ? Math.floor(
          (new Date(asOf + "T12:00Z").getTime() - new Date(i.dueDate + "T12:00Z").getTime()) /
            86_400_000,
        )
      : 0;
    const key =
      days <= 0
        ? "CURRENT"
        : days <= 30
          ? "D1_30"
          : days <= 60
            ? "D31_60"
            : days <= 90
              ? "D61_90"
              : "D90_PLUS";
    const bucket = buckets.find((b) => b.key === key)!;
    bucket.amount += i.balanceDue;
    bucket.count++;
    const client = i.clientId || "unlinked:" + i.id;
    const party = parties.get(client) || {
      partyId: client,
      partyName: i.clientName,
      total: 0,
      buckets: {},
      oldestDays: 0,
    };
    party.total += i.balanceDue;
    party.buckets[key] = (party.buckets[key] || 0) + i.balanceDue;
    party.oldestDays = Math.max(party.oldestDays, days);
    parties.set(client, party);
  }
  return {
    asOf,
    total: buckets.reduce((sum, b) => sum + b.amount, 0),
    buckets,
    byParty: [...parties.values()],
  };
}
async function extraLegacyRead(
  path: string,
  params: URLSearchParams,
  body: unknown,
  s: ControlData,
  ls: Link[],
) {
  const data = body as Record<string, unknown>;
  if (path === "/documents/workspace") {
    const docs = await legacyDocuments(s);
    const summary = data.summary as { total: number; shared: number };
    return {
      ...data,
      documents: [...(data.documents as unknown[]), ...docs],
      summary: {
        ...summary,
        total: summary.total + docs.length,
        shared: summary.shared + docs.length,
      },
    };
  }
  if (path === "/documents")
    return mergePage(body as { items: unknown[] }, await legacyDocuments(s), params);
  if (path === "/sales" || path === "/sales/summary") {
    const records = await prisma.sale.findMany({ orderBy: { createdAt: "desc" }, take: 1000 });
    const rows = records.map((r) => ({
      id: id("sale", r.id),
      quoteId: "",
      quoteVersionId: null,
      opportunityId: null,
      clientId: clientId(ls, r.clientId),
      amount: r.total,
      currency: "CLP",
      ownerId: null,
      closedAt: r.createdAt.toISOString(),
      contractId: null,
      workOrderId: null,
      status: "WON",
      createdAt: r.createdAt.toISOString(),
    }));
    if (path === "/sales") return mergePage(body as { items: unknown[] }, rows, params);
    const amount = rows.reduce((sum, r) => sum + r.amount, 0);
    return {
      ...data,
      amount: Number(data.amount || 0) + amount,
      total: Number(data.total || 0) + rows.length,
    };
  }
  if (path === "/projects") {
    const records = await prisma.project.findMany({
      where: { id: { in: s.projects.map((p) => p.id) } },
    });
    const rows = records.map((p) => ({
      id: id("project", p.id),
      projectNumber: "WEB-" + p.id.slice(0, 8).toUpperCase(),
      clientId: clientId(ls, p.clientId),
      clientName:
        s.users.find((u) => u.id === p.clientId)?.company ||
        s.users.find((u) => u.id === p.clientId)?.name ||
        null,
      workOrderId: "",
      quoteId: p.quoteId ? id("quote", p.quoteId) : null,
      contractId: null,
      name: p.title,
      description: p.description,
      scope: p.scope || "",
      status:
        s.projects.find((v) => v.id === p.id)?.status === "DONE"
          ? "COMPLETED"
          : s.projects.find((v) => v.id === p.id)?.status === "PLANNED"
            ? "PLANNING"
            : s.projects.find((v) => v.id === p.id)?.status || "PLANNING",
      priority: p.priority || "NORMAL",
      health: "ATTENTION",
      healthReason: "Proyecto histórico sin medición publicada de avance.",
      progress: null,
      developmentManagerId: null,
      projectLeadId: null,
      plannedStartDate: p.startDate?.toISOString().slice(0, 10) || null,
      actualStartDate: null,
      targetDate: p.endDate?.toISOString().slice(0, 10) || null,
      completedAt: null,
      estimatedHours: p.estimatedHours,
      budgetedHours: null,
      stagingUrl: null,
      productionUrl: null,
      repositoryUrl: null,
      clientVisibility: "CLIENT_VISIBLE",
      createdBy: null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.createdAt.toISOString(),
      archivedAt: null,
    }));
    return mergePage(body as { items: unknown[] }, rows, params);
  }
  if (path === "/operations/summary")
    return {
      ...data,
      activeProjects:
        Number(data.activeProjects || 0) +
        s.projects.filter((p) => p.status === "IN_PROGRESS").length,
    };
  const clientMatch =
    /^\/clients\/([^/]+)\/(summary|finance-summary|support-summary|documents)$/.exec(path);
  if (clientMatch) {
    const userId = sourceUser(ls, clientMatch[1]!);
    if (!userId) return body;
    const ownQuotes = s.quotes.filter((q) => q.userId === userId),
      ownDebts = s.debts.filter((d) => d.clientId === userId),
      ownProjects = s.projects.filter((p) => p.clientId === userId),
      ownTickets = tickets(s, ls).filter((t) => t.clientId === clientMatch[1]);
    if (clientMatch[2] === "finance-summary")
      return {
        ...data,
        openInvoices: Number(data.openInvoices || 0) + ownDebts.filter((d) => d.balance > 0).length,
        overdueInvoices:
          Number(data.overdueInvoices || 0) +
          ownDebts.filter((d) => d.balance > 0 && d.dueAt && d.dueAt < s.asOf).length,
        balanceDue: Number(data.balanceDue || 0) + ownDebts.reduce((sum, d) => sum + d.balance, 0),
        overdueBalance:
          Number(data.overdueBalance || 0) +
          ownDebts
            .filter((d) => d.dueAt && d.dueAt < s.asOf)
            .reduce((sum, d) => sum + d.balance, 0),
      };
    if (clientMatch[2] === "support-summary")
      return {
        ...data,
        tickets: [...(data.tickets as unknown[]), ...ownTickets],
        open:
          Number(data.open || 0) +
          ownTickets.filter((t) => !["CLOSED", "RESOLVED", "CANCELLED"].includes(t.status)).length,
      };
    if (clientMatch[2] === "summary") {
      const commercial = data.commercial as Record<string, number>,
        operations = data.operations as Record<string, number>;
      return {
        ...data,
        commercial: {
          ...commercial,
          pendingQuotes:
            (commercial.pendingQuotes || 0) +
            ownQuotes.filter((q) => !["WON", "LOST"].includes(q.status || "")).length,
        },
        operations: {
          ...operations,
          activeProjects:
            (operations.activeProjects || 0) +
            ownProjects.filter((p) => p.status === "IN_PROGRESS").length,
        },
      };
    }
  }
  if (
    [
      "/finance/invoices",
      "/finance/receivables",
      "/finance/receivables/aging",
      "/finance/collections",
      "/finance/dashboard",
    ].includes(path)
  ) {
    const invoices = (await legacyInvoices(s, ls)).filter(
      (i) => !params.get("clientId") || i.clientId === params.get("clientId"),
    );
    const open = invoices.filter((i) => i.balanceDue > 0);
    const today = s.asOf.slice(0, 10),
      aging = legacyAging(open, today);
    if (path === "/finance/invoices")
      return mergePage(body as { items: unknown[] }, invoices, params);
    if (path === "/finance/receivables") return [...(body as unknown[]), ...open];
    if (path === "/finance/receivables/aging")
      return {
        ...data,
        total: Number(data.total || 0) + aging.total,
        buckets: (data.buckets as typeof aging.buckets).map((b) => {
          const v = aging.buckets.find((v) => v.key === b.key)!;
          return { ...b, amount: b.amount + v.amount, count: b.count + v.count };
        }),
        byParty: [...(data.byParty as unknown[]), ...aging.byParty],
      };
    if (path === "/finance/dashboard") {
      const collected = s.payments
        .filter(
          (p) =>
            p.status === "CONFIRMED" &&
            p.receivedAt.slice(0, 7) === (data.period as { periodKey: string }).periodKey,
        )
        .reduce((sum, p) => sum + p.amount, 0);
      const overdue = aging.buckets
        .filter((b) => b.key !== "CURRENT")
        .reduce((sum, b) => sum + b.amount, 0);
      return {
        ...data,
        kpis: (data.kpis as Array<{ key: string; value: number; definition: string }>).map((k) => ({
          ...k,
          value:
            k.value +
            (k.key === "AR"
              ? aging.total
              : k.key === "AR_OVERDUE"
                ? overdue
                : k.key === "COLLECTED"
                  ? collected
                  : 0),
          definition:
            k.definition +
            (k.key === "AR" || k.key === "AR_OVERDUE" || k.key === "COLLECTED"
              ? " Incluye el historial de la web."
              : ""),
        })),
        dueSoon: [
          ...(data.dueSoon as unknown[]),
          ...open.filter((i) => i.dueDate && i.dueDate >= today),
        ],
        aging: {
          ...(data.aging as Record<string, unknown>),
          total: Number((data.aging as { total: number }).total) + aging.total,
        },
      };
    }
    if (path === "/finance/collections") {
      const rows = aging.byParty.map((p) => ({
        clientId: p.partyId,
        clientName: p.partyName,
        balance: p.total,
        overdue: p.total - (p.buckets.CURRENT || 0),
        oldestDays: p.oldestDays,
        invoices: open.filter((i) => i.clientId === p.partyId),
        lastActivity: null,
        openPromise: null,
        priority: p.oldestDays * Math.log10(10 + p.total),
      }));
      const totals = data.totals as {
        balance: number;
        overdue: number;
        clients: number;
        withPromise: number;
      };
      return {
        ...data,
        clients: [...(data.clients as unknown[]), ...rows],
        totals: {
          ...totals,
          balance: totals.balance + aging.total,
          overdue: totals.overdue + rows.reduce((sum, r) => sum + r.overdue, 0),
          clients: totals.clients + rows.length,
        },
      };
    }
  }
  return body;
}
async function legacyDocuments(s: ControlData) {
  return s.documents.map((d) => ({
    id: id("document", d.id),
    documentNumber: null,
    title: d.title,
    description: d.description || null,
    typeId: d.category,
    typeCode: d.category,
    typeName: d.category,
    classification: "CLIENT",
    status: "PUBLISHED",
    ownerId: null,
    currentVersionId: null,
    currentVersionNumber: 1,
    clientVisible: true,
    expiresAt: null,
    retentionPolicyId: null,
    legalHold: false,
    archivedAt: null,
    trashedAt: null,
    purgeAfter: null,
    createdBy: null,
    createdAt: d.createdAt,
    updatedAt: d.createdAt,
    legacySourceId: d.id,
  }));
}
