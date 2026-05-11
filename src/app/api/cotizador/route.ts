import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { serializeContactLeadDetails } from "@/lib/admin/contact-lead";
import { insertRow } from "@/lib/admin/repository";
import { sendLeadAlertEmail } from "@/lib/notifications/lead-alert";

const lineItemSchema = z.object({
  id: z.string().trim().max(120).optional(),
  name: z.string().trim().min(2).max(180),
  price: z.number().nonnegative(),
  quantity: z.number().int().min(1).max(99).default(1),
});

const payloadSchema = z.object({
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
  estimatedFrom: z.number().nonnegative().optional(),
  estimatedRange: z.string().trim().max(120).optional().or(z.literal("")),
  service: z.string().trim().max(500).optional().or(z.literal("")),
  message: z.string().trim().max(4000).optional().or(z.literal("")),
  planName: z.string().trim().min(2).max(180).optional().or(z.literal("")),
  planPrice: z.number().nonnegative().optional(),
  extras: z.array(lineItemSchema).max(40).optional(),
  subtotal: z.number().nonnegative().optional(),
  discountTotal: z.number().nonnegative().default(0),
  iva: z.number().nonnegative().default(0),
  total: z.number().nonnegative().optional(),
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

function normalizeSupabaseUrl(rawUrl: string) {
  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  const suffixes = ["/rest/v1", "/auth/v1", "/storage/v1"];
  const lowered = trimmed.toLowerCase();

  for (const suffix of suffixes) {
    if (lowered.endsWith(suffix)) {
      return trimmed.slice(0, -suffix.length);
    }
  }

  return trimmed;
}

function isRlsInsertError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  return normalized.includes("row-level security") || normalized.includes("42501");
}

function createSupabaseAnonServerClient() {
  const rawUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!rawUrl || !anonKey) {
    throw new Error(
      "Faltan variables de Supabase para fallback de formularios. Define SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY (o SUPABASE_PUBLISHABLE_KEY).",
    );
  }

  const url = normalizeSupabaseUrl(rawUrl);
  return createClient(url, anonKey, {
    global: { headers: { "X-Client-Info": "zyteron-public-form-fallback" } },
  });
}

async function insertPackageLeadWithFallback(payload: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  source: string;
  message: string;
  type: "PACKAGE_BUILDER";
  createdAt: string;
}) {
  try {
    await insertRow("Lead", payload, "id");
    return payload.id;
  } catch (error) {
    if (!isRlsInsertError(error)) {
      throw error;
    }

    const supabase = createSupabaseAnonServerClient();
    const { data, error: insertError } = await supabase
      .from("Lead")
      .insert(payload)
      .select("id")
      .single();

    if (insertError) {
      throw new Error(insertError.message || "No se pudo registrar el lead en fallback anon.");
    }

    return String(data?.id || payload.id);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json({ error: issue?.message || "Datos inválidos" }, { status: 400 });
    }

    const data = parsed.data;
    const extras = data.extras || [];
    const planName = data.planName?.trim() || data.recommendedPlan?.trim() || "Proyecto personalizado";
    const planPrice = typeof data.planPrice === "number" ? data.planPrice : data.estimatedFrom || 0;

    const extrasSummary = extras
      .map((extra) => `${extra.name} x${extra.quantity} (${formatCurrency(extra.price * extra.quantity)})`)
      .join(" | ");

    const serviceSummary =
      data.service?.trim() ||
      `Cotizador web: ${planName} + ${extras.length} extra(s)`;

    const subtotal = typeof data.subtotal === "number" ? data.subtotal : planPrice;
    const discountTotal = typeof data.discountTotal === "number" ? data.discountTotal : 0;
    const iva = typeof data.iva === "number" ? data.iva : Math.round(subtotal * 0.19);
    const total = typeof data.total === "number" ? data.total : Math.max(0, subtotal - discountTotal) + iva;

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
      data.recommendedPlan?.trim() ? `Plan recomendado por cotizador: ${data.recommendedPlan.trim()}` : "",
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
      ...extras.map((item) => `${item.name} x${item.quantity} (${formatCurrency(item.price * item.quantity)})`),
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
    await insertPackageLeadWithFallback({
      id: leadId,
      name: data.name,
      email: data.email,
      phone: normalizeOptional(data.phone),
      source: "COTIZADOR_WEB",
      message: leadMessage,
      type: "PACKAGE_BUILDER",
      createdAt,
    });

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

    return NextResponse.json({ ok: true, reference: leadId.slice(0, 8).toUpperCase() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la cotización web.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
