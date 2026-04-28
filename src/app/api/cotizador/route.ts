import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { serializeContactLeadDetails } from "@/lib/admin/contact-lead";
import { insertRow } from "@/lib/admin/repository";

const lineItemSchema = z.object({
  id: z.string().trim().max(120).optional(),
  name: z.string().trim().min(2).max(180),
  price: z.number().nonnegative(),
  quantity: z.number().int().min(1).max(99).default(1),
});

const payloadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  company: z.string().trim().max(140).optional().or(z.literal("")),
  service: z.string().trim().max(500).optional().or(z.literal("")),
  message: z.string().trim().max(4000).optional().or(z.literal("")),
  planName: z.string().trim().min(2).max(180),
  planPrice: z.number().nonnegative(),
  extras: z.array(lineItemSchema).max(40),
  subtotal: z.number().nonnegative(),
  discountTotal: z.number().nonnegative().default(0),
  iva: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
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
  const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!rawUrl || !anonKey) {
    throw new Error("SUPABASE_URL o SUPABASE_ANON_KEY no configurados para fallback de formularios.");
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
    const extrasSummary = data.extras
      .map((extra) => `${extra.name} x${extra.quantity} (${formatCurrency(extra.price * extra.quantity)})`)
      .join(" | ");

    const serviceSummary =
      data.service?.trim() ||
      `Cotizador web: ${data.planName} + ${data.extras.length} extra(s) · Total ${formatCurrency(data.total)}`;

    const detailLines = [
      `Plan base: ${data.planName} (${formatCurrency(data.planPrice)})`,
      `Extras: ${extrasSummary || "Sin extras"}`,
      `Subtotal: ${formatCurrency(data.subtotal)}`,
      `Descuentos: ${formatCurrency(data.discountTotal)}`,
      `IVA: ${formatCurrency(data.iva)}`,
      `Total final: ${formatCurrency(data.total)}`,
      data.message?.trim() ? `Necesidad cliente: ${data.message.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const cartLines = [
      `Plan: ${data.planName} (${formatCurrency(data.planPrice)})`,
      ...data.extras.map((item) => `${item.name} x${item.quantity} (${formatCurrency(item.price * item.quantity)})`),
      `Subtotal: ${formatCurrency(data.subtotal)}`,
      `Descuentos: ${formatCurrency(data.discountTotal)}`,
      `IVA: ${formatCurrency(data.iva)}`,
      `Total: ${formatCurrency(data.total)}`,
    ];

    const leadMessage = serializeContactLeadDetails({
      company: data.company,
      service: serviceSummary,
      brief: detailLines,
      selectedPlan: data.planName,
      selectedExtras: data.extras.map((item) => item.name),
      cartLines,
      cartTotal: data.total,
      submittedFrom: req.headers.get("referer") || undefined,
    });

    const leadId = randomUUID();
    await insertPackageLeadWithFallback({
      id: leadId,
      name: data.name,
      email: data.email,
      phone: normalizeOptional(data.phone),
      source: "COTIZADOR_WEB",
      message: leadMessage,
      type: "PACKAGE_BUILDER",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, reference: leadId.slice(0, 8).toUpperCase() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar la cotización web.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
