import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { CommercialRepository } from "../commercial/commercial.repository.js";
import { QuoteDocumentService } from "../commercial/quote-document.service.js";
import { publicPlans, pricingNote } from "./public-plans.js";
import { SalesWorkspaceRepository } from "./sales-workspace.repository.js";
import type { Row, WorkActor } from "./sales-workspace.types.js";
import {
  admin,
  amount,
  csvCell,
  date,
  id,
  recordInput,
  review,
  stamp,
  text,
} from "./sales-workspace.validation.js";

const n = (v: unknown) => Number(v ?? 0);
const scopes = (a: WorkActor, owner?: string): Record<string, string> =>
  a.role === "EJECUTIVA_VENTAS" ? { owner_id: a.userId } : owner ? { owner_id: id(owner) } : {};
const dayInChile = (value: unknown) => {
  const raw = String(value ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const p = (type: string) => parts.find((v) => v.type === type)?.value ?? "";
  return `${p("year")}-${p("month")}-${p("day")}`;
};
const within = (value: unknown, from?: string, to?: string) => {
  const d = dayInChile(value);
  return (!from || d >= from) && (!to || d <= to);
};
const company = {
  name: "Zyteron SpA",
  description:
    "Desarrollamos soluciones digitales para empresas y organizaciones: sitios web, comercio electrónico, plataformas de gestión, automatizaciones, integraciones y aplicaciones Android e iOS. Cada propuesta se adapta al alcance, la operación y los objetivos del cliente.",
  website: "https://www.zyteron.cl",
  email: "contacto@zyteron.cl",
  links: [
    { title: "Planes y servicios", url: "https://www.zyteron.cl/planes" },
    { title: "Sitio de Zyteron", url: "https://www.zyteron.cl" },
  ],
  presentation:
    "Hola, soy parte del equipo comercial de Zyteron. Desarrollamos sitios web, comercio electrónico, sistemas y plataformas de gestión, automatizaciones, integraciones y aplicaciones Android e iOS. Trabajamos con empresas y organizaciones de distintos tamaños, desde soluciones específicas hasta proyectos corporativos a medida. Me gustaría conocer tus objetivos y procesos para preparar una propuesta que revise nuestro equipo.",
  discovery: [
    "¿Qué necesitas vender, gestionar o automatizar?",
    "¿Cómo lo resuelves hoy y qué dificultad tienes?",
    "¿Quién revisa y aprueba la propuesta?",
    "¿Qué plazo y presupuesto tienes considerado?",
    "¿Qué siguiente paso podemos acordar?",
  ],
};

@Injectable()
export class SalesWorkspaceService {
  constructor(
    private readonly r: SalesWorkspaceRepository,
    private readonly commercial: CommercialRepository,
    private readonly pdf: QuoteDocumentService,
  ) {}
  catalog() {
    return { plans: publicPlans, pricingNote, company, commissionRate: 15 };
  }
  async board(a: WorkActor, query: Record<string, string | undefined> = {}) {
    const filter = scopes(a, query.owner),
      from = query.from ? date(query.from) : undefined,
      to = query.to ? date(query.to) : undefined;
    if (from && to && to < from) throw new BadRequestException("Revisa el período del informe.");
    const [allRecords, allProposals, reports, settlements, owners, assignedClients] =
      await Promise.all([
        this.r.rows("sales_work_records", "*", filter),
        this.r.rows("sales_work_proposal_view", "*", filter),
        this.r.rows("sales_work_reports", "*", filter),
        this.r.rows("sales_work_profit_settlements", "*", filter, "approved_at"),
        a.role === "GERENTE_GENERAL" ? this.r.owners() : Promise.resolve([]),
        this.r.rows(
          "clients",
          "id,legal_name,rut,general_email,phone,business_activity,address,commune,account_executive_id,created_at",
          a.role === "EJECUTIVA_VENTAS"
            ? { account_executive_id: a.userId }
            : query.owner
              ? { account_executive_id: id(query.owner) }
              : {},
        ),
      ]);
    const quoteIds = allProposals.map((p) => String(p.quote_id));
    const receipts = quoteIds.length
      ? await this.r.rows(
          "sales_work_verified_receipts",
          "*",
          { quote_id: quoteIds },
          "collected_at",
        )
      : [];
    const earned = settlements.map((s) => {
      const receipt = receipts.find(
        (v) => v.receipt_key === s.receipt_key && n(v.net_revenue) === n(s.net_revenue),
      );
      const safe = {
        id: s.id,
        quote_id: s.quote_id,
        owner_id: s.owner_id,
        commission_amount: n(s.commission_amount),
        commission_rate: 15,
        currency: "CLP",
        approved_at: s.approved_at,
        status: receipt ? "EARNED" : "ON_HOLD",
      };
      return a.role === "GERENTE_GENERAL" ? { ...s, ...safe } : safe;
    });
    const records = allRecords.filter((r) => within(r.created_at, from, to)),
      proposals = allProposals.filter((p) => within(p.created_at, from, to));
    const currentEarnings = earned.filter((e) => within(e.approved_at, from, to));
    const submittedReports = reports.filter((r) => within(r.created_at, from, to));
    const reviewEvents =
      a.role === "GERENTE_GENERAL" && allRecords.length
        ? await this.r.rows("sales_work_events", "*", {
            record_id: allRecords.map((r) => String(r.id)),
            review_status: "PENDING",
          })
        : [];
    const summary = {
      contacts: records.length,
      interested: records.filter((r) =>
        ["INTERESTED", "PROPOSAL", "ACCEPTED", "COMPLETED"].includes(String(r.stage)),
      ).length,
      generatedClients: new Set(
        records
          .filter((r) => r.review_status === "APPROVED" && r.client_id && r.client_created === true)
          .map((r) => r.client_id),
      ).size,
      pendingContacts: records.filter((r) => r.review_status === "PENDING").length,
      pendingProposals: proposals.filter((p) => p.status === "PENDING_APPROVAL").length,
      accepted: records.filter((r) => r.stage === "ACCEPTED" || r.stage === "COMPLETED").length,
      completed: records.filter((r) => r.stage === "COMPLETED").length,
      overdue: allRecords.filter(
        (r) =>
          r.next_action_at &&
          Date.parse(String(r.next_action_at)) < Date.now() &&
          !["COMPLETED", "LOST"].includes(String(r.stage)),
      ).length,
      earnedCommission: currentEarnings
        .filter((e) => e.status === "EARNED")
        .reduce((t, e) => t + e.commission_amount, 0),
      pendingReports: submittedReports.filter((r) => r.review_status === "PENDING").length,
    };
    return {
      admin: a.role === "GERENTE_GENERAL",
      commissionRate: 15,
      summary,
      records,
      proposals,
      reports: submittedReports,
      earnings: currentEarnings,
      owners,
      assignedClients,
      reviewEvents: reviewEvents.filter(
        (e) =>
          !["CONTACT_CREATED", "PROPOSAL_SUBMITTED", "record_update"].includes(String(e.kind)) &&
          within(e.created_at, from, to),
      ),
      receipts: a.role === "GERENTE_GENERAL" ? receipts : undefined,
      asOf: new Date().toISOString(),
    };
  }
  async detail(a: WorkActor, recordId: string) {
    const record = await this.r.record(id(recordId), a);
    const [events, proposals] = await Promise.all([
      this.r.rows("sales_work_events", "*", { record_id: recordId }),
      this.r.rows("sales_work_proposal_view", "*", { record_id: recordId }),
    ]);
    return { record, events, proposals };
  }
  async create(a: WorkActor, b: Row) {
    if (a.role !== "EJECUTIVA_VENTAS")
      throw new ForbiddenException(
        "Las nuevas gestiones se registran desde la cuenta del ejecutivo.",
      );
    const payload = {
      ...recordInput(b),
      requestId: id(b.requestId),
      client_id: b.client_id ? id(b.client_id) : null,
    };
    const result = await this.r.write(a, "record_create", null, payload);
    return this.detail(a, result);
  }
  async update(a: WorkActor, recordId: string, b: Row) {
    const current = await this.r.record(id(recordId), a);
    const payload = recordInput({ ...current, ...b });
    if (current.client_id && payload.rut !== current.rut)
      throw new ConflictException(
        "Un cliente aprobado conserva su RUT. Solicita la corrección a administración.",
      );
    await this.r.write(a, "record_update", recordId, payload);
    return this.detail(a, recordId);
  }
  async activity(a: WorkActor, recordId: string, b: Row) {
    await this.r.record(id(recordId), a);
    if (!["CALL", "EMAIL", "WHATSAPP", "MEETING", "NOTE"].includes(String(b.kind)))
      throw new BadRequestException("Selecciona el tipo de gestión.");
    const payload = {
      requestId: id(b.requestId),
      kind: b.kind,
      body: text(b.body, "Detalle de la gestión", 4000, true),
      stage: text(b.stage, "Etapa", 30, true),
      next_action_at: stamp(b.next_action_at),
    };
    await this.r.write(a, "event_add", recordId, payload);
    return this.detail(a, recordId);
  }
  async reviewRecord(a: WorkActor, recordId: string, b: Row) {
    admin(a);
    const r = await this.r.record(id(recordId), a);
    if (b.create_client === true) recordInput(r);
    await this.r.write(a, "record_review", recordId, {
      ...review(b),
      create_client: b.create_client === true,
    });
    return this.detail(a, recordId);
  }
  async reviewOther(a: WorkActor, kind: "event" | "report", target: string, b: Row) {
    admin(a);
    await this.r.write(a, kind + "_review", id(target), review(b));
    return { saved: true };
  }
  async report(a: WorkActor, b: Row) {
    if (a.role !== "EJECUTIVA_VENTAS")
      throw new ForbiddenException("Los informes se presentan desde la cuenta del ejecutivo.");
    const from = date(b.period_from),
      to = date(b.period_to);
    if (to < from) throw new BadRequestException("Revisa el período del informe.");
    await this.r.write(a, "report_create", null, {
      requestId: id(b.requestId),
      record_id: b.record_id ? id(b.record_id) : null,
      title: text(b.title, "Título", 180, true),
      body: text(b.body, "Informe", 10000, true),
      period_from: from,
      period_to: to,
    });
    return { saved: true };
  }
  async propose(a: WorkActor, recordId: string, b: Row) {
    if (a.role !== "EJECUTIVA_VENTAS")
      throw new ForbiddenException("Las propuestas se preparan desde la cuenta del ejecutivo.");
    await this.r.record(id(recordId), a);
    if (!Array.isArray(b.items) || !b.items.length || b.items.length > 30)
      throw new BadRequestException("Agrega entre 1 y 30 servicios.");
    const items = b.items.map((raw: unknown) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw))
        throw new BadRequestException("Ítem inválido.");
      const item = raw as Row;
      const plan = item.planId ? publicPlans.find((p) => p.id === item.planId) : null;
      if (item.planId && !plan) throw new BadRequestException("El plan no está vigente.");
      const description = text(item.description ?? plan?.name, "Servicio", 500, true),
        quantity = amount(item.quantity, "Cantidad", 0.01, 10000),
        unitPrice = amount(item.unitPrice ?? plan?.amount, "Precio propuesto", 0, 1e10),
        discountPercent = amount(item.discountPercent ?? 0, "Descuento", 0, 100);
      return {
        id: randomUUID(),
        catalog_service_id: null,
        description,
        quantity,
        unit_price: unitPrice,
        discount_percent: discountPercent,
        taxable: true,
        subtotal: Math.round(quantity * unitPrice * (1 - discountPercent / 100)),
      };
    });
    const subtotal = items.reduce((s, i) => s + Math.round(i.quantity * i.unit_price), 0),
      netAmount = items.reduce((s, i) => s + i.subtotal, 0),
      taxAmount = Math.round(netAmount * 0.19);
    const totals = {
      subtotal,
      discountTotal: subtotal - netAmount,
      netAmount,
      taxRate: 19,
      taxAmount,
      totalAmount: netAmount + taxAmount,
    };
    if (totals.totalAmount <= 0 || totals.totalAmount > 1e12)
      throw new BadRequestException(
        "La propuesta debe tener un total positivo dentro del límite permitido.",
      );
    if (!["ONE_TIME", "SUBSCRIPTION"].includes(String(b.billingType)))
      throw new BadRequestException("Selecciona pago único o mensual.");
    const validUntil = date(b.validUntil);
    if (validUntil < new Date().toISOString().slice(0, 10))
      throw new BadRequestException("La vigencia de la propuesta ya terminó.");
    const quote = {
      currency: "CLP",
      subtotal: totals.subtotal,
      discount_total: totals.discountTotal,
      net_amount: totals.netAmount,
      tax_rate: totals.taxRate,
      tax_amount: totals.taxAmount,
      total_amount: totals.totalAmount,
      billing_type: b.billingType,
      valid_until: validUntil,
      payment_terms: text(b.paymentTerms, "Forma de pago", 1500, true),
      commercial_terms: text(b.commercialTerms, "Alcance y condiciones", 5000, true),
      notes: text(b.notes, "Observaciones", 2000),
    };
    const quoteId = await this.r.write(a, "proposal_create", recordId, {
      requestId: id(b.requestId),
      quote,
      items,
    });
    return this.r.quote(quoteId, a);
  }
  async reviewProposal(a: WorkActor, quoteId: string, b: Row) {
    admin(a);
    await this.r.quote(id(quoteId), a);
    await this.r.write(a, "proposal_review", quoteId, review(b));
    return this.r.quote(quoteId, a);
  }
  async share(a: WorkActor, quoteId: string, b: Row) {
    await this.r.quote(id(quoteId), a);
    await this.r.write(a, "proposal_share", quoteId, {
      reason: text(b.reason, "Detalle de la entrega", 2000, true),
    });
    return this.r.quote(quoteId, a);
  }
  async accept(a: WorkActor, quoteId: string, b: Row) {
    admin(a);
    await this.r.quote(id(quoteId), a);
    await this.r.write(a, "acceptance_validate", quoteId, {
      reason: text(b.reason, "Respaldo de aceptación", 2000, true),
    });
    return this.r.quote(quoteId, a);
  }
  async validateProfit(a: WorkActor, recordId: string, b: Row) {
    admin(a);
    if (b.source_kind !== "INSTALLMENT" && b.source_kind !== "INVOICE")
      throw new BadRequestException("Selecciona un cobro confirmado.");
    await this.r.write(a, "profit_validate", id(recordId), {
      source_kind: b.source_kind,
      source_id: id(b.source_id),
      validated_cost: amount(b.validated_cost, "Costo neto validado"),
      cost_note: text(b.cost_note, "Respaldo de costos", 2000, true),
    });
    return { saved: true };
  }
  async complete(a: WorkActor, recordId: string, b: Row) {
    admin(a);
    await this.r.write(a, "complete", id(recordId), {
      reason: text(b.reason, "Validación de cierre", 2000, true),
    });
    return this.detail(a, recordId);
  }
  async document(a: WorkActor, quoteId: string) {
    const safe = await this.r.quote(id(quoteId), a),
      quote = await this.commercial.getQuote(quoteId);
    if (!quote) throw new ConflictException("Propuesta no disponible.");
    const record = await this.r.record(String(safe.record_id), a);
    const preview = ![
      "APPROVED",
      "READY_TO_SEND",
      "SENT",
      "NEGOTIATING",
      "ACCEPTED",
      "CONVERTED",
    ].includes(quote.status);
    if (!preview && record.review_status !== "APPROVED")
      throw new ConflictException(
        "El cliente tiene datos pendientes de validación de administración.",
      );
    return this.pdf.render(quote, {
      preview,
      hideBankDetails: a.role === "EJECUTIVA_VENTAS",
      numericDates: true,
      recipient: {
        rut: String(record.rut ?? ""),
        businessActivity: String(record.business_activity ?? ""),
        address: [record.address, record.commune, record.city].filter(Boolean).join(", "),
        phone: String(record.phone ?? ""),
      },
    });
  }
  async export(a: WorkActor, query: Record<string, string | undefined>) {
    const board = await this.board(a, query),
      owner = new Map(board.owners.map((o) => [o.id, o.name]));
    const rows: unknown[][] = [
      [
        "Ejecutivo",
        "Empresa",
        "Contacto",
        "RUT",
        "Necesidad",
        "Detalle",
        "Etapa",
        "Validación",
        "Alta cliente",
        "Registro",
        "Próximo seguimiento",
        "Propuestas",
        "Comisión ganada CLP",
      ],
    ];
    for (const r of board.records) {
      const proposals = board.proposals.filter((p) => p.record_id === r.id);
      rows.push([
        owner.get(String(r.owner_id)) ?? "Mi cartera",
        r.company_name,
        r.contact_name,
        r.rut,
        r.interest,
        r.notes,
        r.stage,
        r.review_status,
        r.client_id ? "Sí" : "No",
        dayInChile(r.created_at).split("-").reverse().join("-"),
        r.next_action_at
          ? new Intl.DateTimeFormat("es-CL", {
              timeZone: "America/Santiago",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }).format(new Date(String(r.next_action_at)))
          : "",
        proposals.length,
        board.earnings
          .filter((e) => e.status === "EARNED" && proposals.some((p) => p.quote_id === e.quote_id))
          .reduce((t, e) => t + e.commission_amount, 0),
      ]);
    }
    return "\ufeff" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
  }
}
