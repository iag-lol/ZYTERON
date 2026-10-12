import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { serializeContactLeadDetails } from "@/lib/admin/contact-lead";
import { getPortalSession } from "@/lib/auth/portal-session";
import {
  boundedJson,
  publicRateLimit,
  withPublicSubmission,
  intakeFailure,
} from "@/lib/security/public-intake";
import { buildQuoteMeta, serializeQuoteMessage } from "@/lib/admin/quote";
import { sendLeadAlertEmail } from "@/lib/notifications/lead-alert";
import { registerWebLeadSafe } from "@/lib/sales-ai/web-leads";

const lineItemSchema = z.object({
  id: z.string().trim().max(120).optional(),
  name: z.string().trim().min(2).max(180),
  price: z.number().nonnegative().max(1000000000),
  quantity: z.number().int().min(1).max(99).default(1),
});

const payloadSchema = z.object({
  clientSubmissionId: z.string().uuid().optional(),
  website: z.string().max(200).optional(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(8).max(32),
  company: z.string().trim().min(2).max(140),
  projectType: z.string().trim().min(2).max(120),
  budget: z.string().trim().max(80).optional().or(z.literal("")),
  expectedDate: z.string().trim().max(40).optional().or(z.literal("")),
  needDomain: z.enum(["si", "no", "no-se"]),
  needHosting: z.enum(["si", "no", "no-se"]),
  needPayments: z.enum(["si", "no", "no-se"]),
  needAdminPanel: z.enum(["si", "no", "no-se"]),
  needCustomSystem: z.enum(["si", "no", "no-se"]),
  needTaxDocument: z.enum(["si", "no", "no-se"]),
  projectFor: z.string().trim().max(120).optional().or(z.literal("")),
  needType: z.string().trim().max(120).optional().or(z.literal("")),
  features: z.array(z.string().trim().max(120)).max(60).optional(),
  pageCount: z.string().trim().max(40).optional().or(z.literal("")),
  contentReady: z.string().trim().max(80).optional().or(z.literal("")),
  domainHosting: z.string().trim().max(80).optional().or(z.literal("")),
  taxDocument: z.string().trim().max(40).optional().or(z.literal("")),
  budgetRange: z.string().trim().max(40).optional().or(z.literal("")),
  recommendedPlan: z.string().trim().max(180).optional().or(z.literal("")),
  estimatedFrom: z.number().nonnegative().max(1000000000).optional(),
  estimatedRange: z.string().trim().max(120).optional().or(z.literal("")),
  service: z.string().trim().max(500).optional().or(z.literal("")),
  message: z.string().trim().max(4000).optional().or(z.literal("")),
  planName: z.string().trim().min(2).max(180).optional().or(z.literal("")),
  planPrice: z.number().nonnegative().max(1000000000).optional(),
  extras: z.array(lineItemSchema).max(40).optional(),
  subtotal: z.number().nonnegative().max(1000000000).optional(),
  discountTotal: z.number().nonnegative().max(1000000000).default(0),
  iva: z.number().nonnegative().max(1000000000).default(0),
  total: z.number().nonnegative().max(1000000000).optional(),
});

function normalizeOptional(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function humanizeChoice(value: "si" | "no" | "no-se") {
  if (value === "si") return "Sí";
  if (value === "no") return "No";
  return "No definido";
}

export async function POST(req: Request) {
  try {
    const body = await boundedJson(req);
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json({ error: issue?.message || "Datos inválidos" }, { status: 400 });
    }

    const data = parsed.data;
    if (data.website) return NextResponse.json({ ok: true, reference: "filtered" });
    const rate = await publicRateLimit(req, "package-quote", 6);
    if (!rate.allowed)
      return NextResponse.json(
        { error: "Espera un minuto antes de volver a enviar." },
        { status: 429, headers: { "retry-after": "60" } },
      );
    const extras = data.extras || [];
    const planName =
      data.planName?.trim() || data.recommendedPlan?.trim() || "Proyecto personalizado";
    const planPrice = typeof data.planPrice === "number" ? data.planPrice : data.estimatedFrom || 0;

    const extrasSummary = extras
      .map(
        (extra) =>
          `${extra.name} x${extra.quantity} (${formatCurrency(extra.price * extra.quantity)})`,
      )
      .join(" | ");

    const serviceSummary =
      data.service?.trim() || `Cotizador web: ${planName} + ${extras.length} extra(s)`;

    const subtotal = typeof data.subtotal === "number" ? data.subtotal : planPrice;
    const discountTotal = typeof data.discountTotal === "number" ? data.discountTotal : 0;
    const iva = typeof data.iva === "number" ? data.iva : Math.round(subtotal * 0.19);
    const total =
      typeof data.total === "number" ? data.total : Math.max(0, subtotal - discountTotal) + iva;

    const detailLines = [
      `Plan base: ${planName} (${formatCurrency(planPrice)})`,
      `Tipo de proyecto: ${data.projectType}`,
      `Presupuesto estimado: ${data.budget?.trim() || "No definido"}`,
      `Fecha esperada: ${data.expectedDate?.trim() || "No definida"}`,
      `Necesita dominio: ${humanizeChoice(data.needDomain)}`,
      `Necesita hosting: ${humanizeChoice(data.needHosting)}`,
      `Necesita pagos online: ${humanizeChoice(data.needPayments)}`,
      `Necesita panel administrativo: ${humanizeChoice(data.needAdminPanel)}`,
      `Necesita sistema a medida: ${humanizeChoice(data.needCustomSystem)}`,
      `Requiere documento tributario: ${humanizeChoice(data.needTaxDocument)}`,
      data.projectFor?.trim() ? `Tipo de cliente: ${data.projectFor.trim()}` : "",
      data.needType?.trim() ? `Necesidad principal: ${data.needType.trim()}` : "",
      data.pageCount?.trim() ? `Páginas/secciones: ${data.pageCount.trim()}` : "",
      data.contentReady?.trim() ? `Contenido disponible: ${data.contentReady.trim()}` : "",
      data.domainHosting?.trim() ? `Dominio/hosting: ${data.domainHosting.trim()}` : "",
      data.taxDocument?.trim() ? `Documento tributario solicitado: ${data.taxDocument.trim()}` : "",
      data.budgetRange?.trim() ? `Rango presupuesto: ${data.budgetRange.trim()}` : "",
      data.recommendedPlan?.trim()
        ? `Plan recomendado por cotizador: ${data.recommendedPlan.trim()}`
        : "",
      data.estimatedRange?.trim() ? `Rango estimado cotizador: ${data.estimatedRange.trim()}` : "",
      data.features?.length ? `Funcionalidades seleccionadas: ${data.features.join(", ")}` : "",
      `Extras: ${extrasSummary || "Sin extras"}`,
      `Subtotal: ${formatCurrency(subtotal)}`,
      `Descuentos: ${formatCurrency(discountTotal)}`,
      `IVA: ${formatCurrency(iva)}`,
      `Total final: ${formatCurrency(total)}`,
      data.message?.trim() ? `Necesidad cliente: ${data.message.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const cartLines = [
      `Plan: ${planName} (${formatCurrency(planPrice)})`,
      ...extras.map(
        (item) => `${item.name} x${item.quantity} (${formatCurrency(item.price * item.quantity)})`,
      ),
      `Subtotal: ${formatCurrency(subtotal)}`,
      `Descuentos: ${formatCurrency(discountTotal)}`,
      `IVA: ${formatCurrency(iva)}`,
      `Total: ${formatCurrency(total)}`,
    ];

    const leadMessage = serializeContactLeadDetails({
      company: data.company,
      service: serviceSummary,
      brief: detailLines,
      projectType: data.projectType,
      budget: data.budget,
      expectedDate: data.expectedDate,
      needDomain: data.needDomain,
      needHosting: data.needHosting,
      needPayments: data.needPayments,
      needAdminPanel: data.needAdminPanel,
      needCustomSystem: data.needCustomSystem,
      needTaxDocument: data.needTaxDocument,
      projectFor: data.projectFor,
      needType: data.needType,
      featureList: data.features,
      pageCount: data.pageCount,
      contentReady: data.contentReady,
      domainHosting: data.domainHosting,
      taxDocument: data.taxDocument,
      budgetRange: data.budgetRange,
      recommendedPlan: data.recommendedPlan,
      estimatedFrom:
        typeof data.estimatedFrom === "number" && Number.isFinite(data.estimatedFrom)
          ? String(Math.round(data.estimatedFrom))
          : undefined,
      estimatedRange: data.estimatedRange,
      selectedPlan: planName,
      selectedExtras: extras.map((item) => item.name),
      cartLines,
      cartTotal: total,
      submittedFrom: req.headers.get("referer") || undefined,
    });

    const leadId = randomUUID();
    const createdAt = new Date().toISOString();
    const quoteId = randomUUID(),
      email = data.email.toLowerCase();
    const session = await getPortalSession();
    const userId =
      session?.user.accountStatus === "ACTIVE" &&
      session.user.emailVerifiedAt &&
      session.user.email?.toLowerCase() === email
        ? session.user.id
        : null;
    const saved = await withPublicSubmission(
      "package-quote",
      data.clientSubmissionId || randomUUID(),
      data,
      async (db) => {
        await db.lead.create({
          data: {
            id: leadId,
            userId,
            name: data.name,
            email,
            phone: normalizeOptional(data.phone),
            source: "COTIZADOR_WEB",
            message: leadMessage,
            type: "PACKAGE_BUILDER",
          },
        });
        // Client-supplied estimates are a request, never a payable amount.
        const meta = {
          ...buildQuoteMeta({
            items: [],
            notes: detailLines,
            quoteNumber: "SOL-" + quoteId.slice(0, 8).toUpperCase(),
            paymentTerms:
              "Solicitud en revisión. Zyteron debe confirmar alcance y precio antes de habilitar un pago.",
          }),
          kind: "WEB_QUOTE_REQUEST",
          source: "COTIZADOR_WEB",
          requestStage: "NUEVA",
          projectType: data.projectType,
          projectTypeLabel: planName,
          projectSummary: serviceSummary,
          contactName: data.name,
          contactEmail: email,
          contactCompany: data.company,
          clientSubmissionId: data.clientSubmissionId,
        };
        await db.quote.create({
          data: {
            id: quoteId,
            userId,
            name: data.name,
            email,
            phone: normalizeOptional(data.phone),
            company: data.company,
            message: serializeQuoteMessage(meta),
            subtotal: 0,
            total: 0,
            status: "PENDING",
          },
        });
        return { ok: true, reference: leadId.slice(0, 8).toUpperCase(), quoteId };
      },
    );
    if (saved.created) {
      try {
        await sendLeadAlertEmail({
          leadId,
          source: "COTIZADOR_WEB",
          submittedAtIso: createdAt,
          name: data.name,
          email: data.email,
          phone: normalizeOptional(data.phone),
          company: normalizeOptional(data.company),
          service: serviceSummary,
          message: detailLines,
          submittedFrom: req.headers.get("referer") || null,
          planName,
          planPrice,
          subtotal,
          discountTotal,
          iva,
          total,
          extras: extras.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            total: item.price * item.quantity,
          })),
        });
      } catch (emailError) {
        console.error("[package-builder] lead alert email failed:", emailError);
      }

      // Espejo en el CRM comercial. El cotizador es la señal de intención más
      // alta del sitio, por eso el prospecto entra directamente como INTERESADO.
      registerWebLeadSafe({
        formOrigin: "Cotizador web",
        leadId,
        name: data.name,
        email: data.email,
        phone: normalizeOptional(data.phone),
        company: data.company,
        service: serviceSummary,
        message: `${planName} · total estimado ${formatCurrency(total)}`,
      });
    }
    return NextResponse.json(saved.value, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return intakeFailure(error);
  }
}
