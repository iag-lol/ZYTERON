import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { insertRow } from "@/lib/admin/repository";
import { sendLeadAlertEmail } from "@/lib/notifications/lead-alert";
import { isMetaWhatsappConfigured, sendMetaWhatsappMessage } from "@/lib/notifications/meta-whatsapp";
import { siteConfig } from "@/config/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cotización rápida desde la página de planes.
 *
 * Pide lo mínimo —nombre, WhatsApp y tipo de negocio— y hace tres cosas:
 *   1. Registra el contacto en `Lead`, que es la tabla publicada en tiempo
 *      real: por eso la campana del panel se entera al instante.
 *   2. Envía el aviso por correo con Resend.
 *   3. Avisa por WhatsApp al número de la empresa.
 *
 * El registro del lead manda: si el correo o el WhatsApp fallan, el contacto
 * ya quedó guardado y el formulario responde bien. Nunca se pierde un cliente
 * por una notificación caída.
 */

// Rate limit simple por IP: evita que un bot llene la tabla de leads.
type Entry = { hits: number; first: number };
declare global {
  var zyteronQuickQuoteRL: Map<string, Entry> | undefined;
}
const rl = globalThis.zyteronQuickQuoteRL ?? new Map<string, Entry>();
globalThis.zyteronQuickQuoteRL = rl;
const WINDOW = 60_000;
const MAX = 5;

function clientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function limited(addr: string) {
  const now = Date.now();
  const entry = rl.get(addr);
  if (!entry || now - entry.first > WINDOW) {
    rl.set(addr, { hits: 1, first: now });
    return false;
  }
  if (entry.hits >= MAX) return true;
  entry.hits += 1;
  return false;
}

const schema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre.").max(120),
  whatsapp: z
    .string()
    .trim()
    .min(8, "Ingresa un WhatsApp válido.")
    .max(24)
    .regex(/^[\d\s+()-]+$/, "El WhatsApp solo debe tener números."),
  businessType: z.string().trim().min(2, "Cuéntanos qué tipo de negocio tienes.").max(120),
  plan: z.string().trim().max(120).optional().or(z.literal("")),
  // Campo trampa: los bots lo rellenan, las personas no lo ven.
  website: z.string().max(0).optional(),
});

/** Deja el número en formato internacional chileno para WhatsApp. */
function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("56")) return `+${digits}`;
  if (digits.length === 9) return `+56${digits}`;
  if (digits.length === 8) return `+569${digits}`;
  return `+${digits}`;
}

export async function POST(req: Request) {
  if (limited(clientIp(req))) {
    return NextResponse.json({ error: "Demasiados envíos. Espera un minuto." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Revisa los datos ingresados." },
      { status: 400 },
    );
  }
  // Trampa activada: se responde bien para no darle pistas al bot.
  if (parsed.data.website) return NextResponse.json({ ok: true });

  const { name, whatsapp, businessType, plan } = parsed.data;
  const phone = toE164(whatsapp);
  const leadId = randomUUID();
  const submittedAt = new Date().toISOString();
  const planLabel = plan?.trim() || "No indicado";

  const message = [
    `Tipo de negocio: ${businessType}`,
    `Plan de interés: ${planLabel}`,
    `WhatsApp: ${phone}`,
    "Solicitud enviada desde el formulario corto de la página de planes.",
  ].join("\n");

  try {
    await insertRow(
      "Lead",
      {
        id: leadId,
        name,
        // La tabla exige correo; el canal real de este formulario es WhatsApp.
        email: `${phone.replace(/\D/g, "")}@whatsapp.zyteron.cl`,
        phone,
        source: "COTIZADOR_WEB",
        message,
        type: "PACKAGE_BUILDER",
        createdAt: submittedAt,
      },
      "id",
    );
  } catch (cause) {
    console.error("[cotizacion-rapida] no se pudo registrar el lead:", cause);
    return NextResponse.json(
      { error: "No pudimos registrar tu solicitud. Intenta nuevamente en unos minutos." },
      { status: 500 },
    );
  }

  // Avisos en paralelo. Si alguno falla, el lead ya está guardado.
  const [emailResult, whatsappResult] = await Promise.allSettled([
    sendLeadAlertEmail({
      leadId,
      source: "COTIZADOR_WEB",
      submittedAtIso: submittedAt,
      name,
      email: "—",
      phone,
      industry: businessType,
      service: planLabel,
      message,
    }),
    isMetaWhatsappConfigured()
      ? sendMetaWhatsappMessage(
          process.env.META_WHATSAPP_TO?.trim() || siteConfig.contact.whatsapp,
          [
            "🔔 Nueva solicitud desde Planes",
            "",
            `Nombre: ${name}`,
            `WhatsApp: ${phone}`,
            `Negocio: ${businessType}`,
            `Plan: ${planLabel}`,
            "",
            "Responde directo a este número.",
          ].join("\n"),
        )
      : Promise.resolve({ ok: false, error: "WhatsApp no configurado" }),
  ]);

  if (emailResult.status === "rejected") {
    console.warn("[cotizacion-rapida] fallo el correo:", emailResult.reason);
  }
  if (whatsappResult.status === "rejected") {
    console.warn("[cotizacion-rapida] fallo el WhatsApp:", whatsappResult.reason);
  }

  return NextResponse.json({ ok: true });
}
