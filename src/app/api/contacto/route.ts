import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { serializeContactLeadDetails } from "@/lib/admin/contact-lead";
import { sendLeadAlertEmail } from "@/lib/notifications/lead-alert";
import { registerWebLeadSafe } from "@/lib/sales-ai/web-leads";
import { getPortalSession } from "@/lib/auth/portal-session";
import {
  boundedJson,
  publicRateLimit,
  withPublicSubmission,
  intakeFailure,
} from "@/lib/security/public-intake";
const contactSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre completo").max(120, "Nombre demasiado largo"),
  email: z.string().trim().email("Email inválido").max(160, "Email demasiado largo"),
  phone: z.string().trim().min(8, "Ingresa un teléfono válido").max(32, "Teléfono demasiado largo"),
  company: z.string().trim().max(140, "Empresa demasiado larga").optional().or(z.literal("")),
  projectType: z
    .string()
    .trim()
    .min(2, "Selecciona tipo de proyecto")
    .max(120, "Tipo de proyecto inválido"),
  budget: z.string().trim().max(80, "Presupuesto demasiado largo").optional().or(z.literal("")),
  service: z.string().trim().max(500, "Servicio demasiado largo").optional().or(z.literal("")),
  marketingSource: z
    .string()
    .trim()
    .max(600, "Origen comercial demasiado largo")
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(10, "Describe brevemente tu requerimiento")
    .max(4000, "Mensaje demasiado largo"),
  clientSubmissionId: z.string().trim().min(16).max(100).optional(),
  website: z.string().max(200).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  try {
    const parsed = contactSchema.safeParse(await boundedJson(req));
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    const data = parsed.data;
    if (data.website) return NextResponse.json({ ok: true, reference: "filtered" });
    const limit = await publicRateLimit(req, "contact", 6);
    if (!limit.allowed)
      return NextResponse.json(
        { error: "Espera un minuto antes de enviar otra solicitud." },
        { status: 429, headers: { "retry-after": "60" } },
      );
    const session = await getPortalSession();
    const ownerId =
      session?.user.emailVerifiedAt &&
      session.user.accountStatus === "ACTIVE" &&
      session.user.email?.toLowerCase() === data.email.toLowerCase()
        ? session.user.id
        : null;
    const leadId = randomUUID(),
      createdAt = new Date().toISOString(),
      service = data.service || data.projectType;
    const details = serializeContactLeadDetails({
      company: data.company,
      service,
      brief: data.message,
      submittedFrom: req.headers.get("referer") || undefined,
      projectType: data.projectType,
      budget: data.budget,
    });
    const stored = await withPublicSubmission(
      "contact",
      data.clientSubmissionId || randomUUID(),
      data,
      async (db) => {
        await db.lead.create({
          data: {
            id: leadId,
            userId: ownerId,
            name: data.name,
            email: data.email.toLowerCase(),
            phone: data.phone,
            source: "CONTACTO_WEB",
            message: details,
            type: "CONTACT",
          },
        });
        return { ok: true, reference: leadId.slice(0, 8).toUpperCase() };
      },
    );
    if (stored.created) {
      try {
        await sendLeadAlertEmail({
          leadId,
          source: "CONTACTO_WEB",
          submittedAtIso: createdAt,
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company || null,
          service,
          message: data.message,
        });
      } catch {
        /* Registro confirmado; fallo de aviso no vuelve a crear el lead. */
      }
      registerWebLeadSafe({
        formOrigin: "Formulario de contacto",
        leadId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company || null,
        service,
        message: data.message,
      });
    }
    return NextResponse.json(stored.value, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return intakeFailure(error);
  }
}
