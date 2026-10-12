import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { serializeContactLeadDetails } from "@/lib/admin/contact-lead";
import { sendLeadAlertEmail } from "@/lib/notifications/lead-alert";
import { sendAdminWhatsappNotification } from "@/lib/notifications/admin-whatsapp";
import { getPortalSession } from "@/lib/auth/portal-session";
import {
  boundedJson,
  publicRateLimit,
  withPublicSubmission,
  intakeFailure,
} from "@/lib/security/public-intake";
import {
  BINARY_CHOICE_LABELS,
  QUOTE_REQUEST_WHATSAPP_PUBLIC,
  buildQuoteRequestMeta,
  budgetRangeToEstimate,
  generateQuoteCode,
  quoteRequestSchema,
  serializeQuoteRequestMeta,
  type QuoteRequestMeta,
} from "@/lib/quote-requests";
function buildQuoteLeadSummary(meta: QuoteRequestMeta) {
  const lines = [
    `Código solicitud: ${meta.quoteCode || "Sin código"}`,
    `Tipo de proyecto: ${meta.projectTypeLabel || "Solicitud web"}`,
    `Empresa o negocio: ${meta.contactCompany || meta.businessName || "No informado"}`,
    `Rubro: ${meta.businessRubro || "No informado"}`,
    `Ciudad: ${meta.businessCity || "No informada"}`,
    `Presupuesto: ${meta.budgetRangeLabel || "No definido"}`,
    `Plazo: ${meta.deadlineLabel || "No definido"}`,
    `Urgencia: ${meta.urgencyLabel || "No definida"}`,
    `Tiene sitio web: ${BINARY_CHOICE_LABELS[meta.hasWebsite || "no-se"]}`,
    `Tiene logo: ${BINARY_CHOICE_LABELS[meta.hasLogo || "no-se"]}`,
    `Tiene dominio: ${BINARY_CHOICE_LABELS[meta.hasDomain || "no-se"]}`,
    `Tiene contenido: ${BINARY_CHOICE_LABELS[meta.hasContent || "no-se"]}`,
    meta.currentWebsite ? `Sitio actual: ${meta.currentWebsite}` : "",
    "",
    "Respuestas del formulario:",
    ...(meta.projectAnswers || []).map((item) => `- ${item.label}: ${item.value}`),
    meta.projectComment ? "" : "",
    meta.projectComment ? `Comentario del proyecto: ${meta.projectComment}` : "",
    meta.additionalMessage ? `Mensaje adicional: ${meta.additionalMessage}` : "",
  ];

  return lines.filter(Boolean).join("\n");
}

function buildQuoteLeadMessage(meta: QuoteRequestMeta) {
  return serializeContactLeadDetails({
    company: meta.contactCompany || meta.businessName,
    service: meta.projectTypeLabel || "Solicitud web",
    brief: buildQuoteLeadSummary(meta),
    submittedFrom: meta.submittedFrom,
    projectType: meta.projectTypeLabel,
    budget: meta.budgetRangeLabel,
    expectedDate: meta.deadlineLabel,
    projectFor: meta.businessRubro,
    needType: meta.urgencyLabel,
    selectedPlan: meta.projectTypeLabel,
    cartLines: [
      `Código: ${meta.quoteCode || "Sin código"}`,
      `Presupuesto: ${meta.budgetRangeLabel || "No definido"}`,
      `Plazo: ${meta.deadlineLabel || "No definido"}`,
      `Urgencia: ${meta.urgencyLabel || "No definida"}`,
    ],
    cartTotal: budgetRangeToEstimate(meta.budgetRange || "no-claro"),
  });
}

export async function POST(req: Request) {
  try {
    const parsed = quoteRequestSchema.safeParse(await boundedJson(req));
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    const data = parsed.data;
    if (data.honeypot)
      return NextResponse.json({
        ok: true,
        reference: "filtered",
        quoteId: "filtered",
        whatsappUrl: QUOTE_REQUEST_WHATSAPP_PUBLIC,
      });
    const limit = await publicRateLimit(req, "quote", 6);
    if (!limit.allowed)
      return NextResponse.json(
        { error: "Espera un minuto antes de enviar otra solicitud." },
        { status: 429, headers: { "retry-after": "60" } },
      );
    const quoteId = randomUUID(),
      leadId = randomUUID(),
      quoteCode = await generateQuoteCode(),
      submittedAt = new Date().toISOString();
    const meta = buildQuoteRequestMeta({
      ...data,
      quoteCode,
      submittedAt,
      submittedFrom: req.headers.get("referer") || undefined,
    });
    const estimate = budgetRangeToEstimate(data.budgetRange),
      email = data.contactEmail.trim().toLowerCase(),
      phone = meta.contactWhatsappE164 || data.contactWhatsapp.trim(),
      company = (data.contactCompany || data.businessName).trim();
    const session = await getPortalSession();
    const ownerId =
      session?.user.emailVerifiedAt &&
      session.user.accountStatus === "ACTIVE" &&
      session.user.email?.toLowerCase() === email
        ? session.user.id
        : null;
    const saved = await withPublicSubmission("quote", data.clientSubmissionId, data, async (db) => {
      await db.quote.create({
        data: {
          id: quoteId,
          userId: ownerId,
          name: data.contactName.trim(),
          email,
          phone,
          company,
          message: serializeQuoteRequestMeta(meta),
          subtotal: estimate,
          discount: 0,
          total: estimate,
          status: "PENDING",
        },
      });
      await db.lead.create({
        data: {
          id: leadId,
          userId: ownerId,
          name: data.contactName.trim(),
          email,
          phone,
          source: "COTIZADOR_WEB",
          message: buildQuoteLeadMessage(meta),
          type: "PACKAGE_BUILDER",
        },
      });
      return {
        ok: true,
        reference: quoteCode,
        quoteId,
        whatsappUrl: QUOTE_REQUEST_WHATSAPP_PUBLIC,
      };
    });
    if (saved.created) {
      try {
        await sendLeadAlertEmail({
          leadId,
          source: "COTIZADOR_WEB",
          submittedAtIso: submittedAt,
          name: data.contactName.trim(),
          email,
          phone,
          company,
          service: meta.projectTypeLabel || "Solicitud web",
          message: buildQuoteLeadSummary(meta),
          planPrice: estimate,
          total: estimate,
        });
      } catch {
        /* La cotización y el lead ya están confirmados juntos. */
      }
      try {
        await sendAdminWhatsappNotification(
          "Nueva solicitud de cotización " +
            quoteCode +
            " · " +
            data.contactName +
            "\nhttps://www.zyteron.cl/administracion/cotizaciones/" +
            quoteId,
        );
      } catch {
        /* No se repite la cotización por un aviso fallido. */
      }
    }
    return NextResponse.json(saved.value, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return intakeFailure(error);
  }
}
