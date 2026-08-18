import { randomUUID } from "node:crypto";
import { insertRow } from "@/lib/admin/repository";
import { dispatchChatLeadAlert, type DispatchReport } from "@/lib/notifications/chat-lead-dispatch";
import { siteConfig } from "@/config/site";

/**
 * Herramienta (function calling) que la IA del chat invoca cuando capta un
 * interés real: nombre + forma de contacto + qué necesita. El ejecutor deja
 * registro en la BD (tabla Lead, aparece en /admin/contactos y dispara la
 * notificación en tiempo real) y despacha avisos por correo y WhatsApp.
 *
 * Nunca lanza: si algo falla, devuelve un mensaje neutro para que el chat
 * siga funcionando sin errores.
 */

export const LEAD_CAPTURE_TOOL = {
  type: "function" as const,
  function: {
    name: "registrar_interes_cliente",
    description:
      "Registra en el sistema de Zyteron el interés o la solicitud de cotización de un visitante del chat. " +
      "Llama esta función APENAS tengas el nombre del cliente y una forma de contacto (correo o WhatsApp/teléfono) " +
      "junto con una idea de lo que necesita. No inventes datos: usa solo lo que el cliente entregó.",
    parameters: {
      type: "object",
      properties: {
        nombre: { type: "string", description: "Nombre del cliente o de su empresa." },
        contacto: {
          type: "string",
          description: "Forma de contacto entregada: correo electrónico y/o teléfono/WhatsApp.",
        },
        tipo_proyecto: {
          type: "string",
          description:
            "Qué necesita: web, tienda online, sistema a medida, automatización, soporte TI, SEO, etc.",
        },
        empresa: { type: "string", description: "Nombre de la empresa del cliente, si aplica." },
        rubro: { type: "string", description: "Rubro o industria del negocio del cliente." },
        telefono: { type: "string", description: "Teléfono o WhatsApp, si lo entregó (aparte del correo)." },
        plazo: { type: "string", description: "Plazo o urgencia que mencionó el cliente." },
        resumen: {
          type: "string",
          description: "Resumen breve de lo conversado y del requerimiento del cliente.",
        },
        presupuesto_estimado: {
          type: "string",
          description: "Presupuesto o rango que mencionó el cliente, si lo hay.",
        },
        es_cotizacion: {
          type: "boolean",
          description: "true si el cliente pidió cotizar formalmente; false si es solo interés inicial.",
        },
      },
      required: ["nombre", "contacto", "tipo_proyecto", "resumen"],
    },
  },
} as const;

type LeadCaptureArgs = {
  nombre?: unknown;
  contacto?: unknown;
  tipo_proyecto?: unknown;
  empresa?: unknown;
  rubro?: unknown;
  telefono?: unknown;
  plazo?: unknown;
  resumen?: unknown;
  presupuesto_estimado?: unknown;
  es_cotizacion?: unknown;
};

const EMAIL_REGEX = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_REGEX = /(\+?56)?\s?9?\s?\d[\d\s.-]{6,}/;

function str(value: unknown, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function extractEmail(text: string) {
  const match = text.match(EMAIL_REGEX);
  return match ? match[0].trim() : null;
}

function extractPhone(text: string) {
  const withoutEmail = text.replace(EMAIL_REGEX, " ");
  const match = withoutEmail.match(PHONE_REGEX);
  if (!match) return null;
  const digits = match[0].replace(/[^\d+]/g, "");
  return digits.length >= 7 ? digits : null;
}

export type LeadCaptureResult = {
  ok: boolean;
  leadId: string | null;
  dispatch: DispatchReport | null;
  message: string;
  /** Detalle del fallo si el lead no se pudo guardar en la base. */
  saveError?: string | null;
};

/** Ejecuta la captura del lead. Diseñada para NO lanzar nunca. */
export async function executeLeadCapture(rawArgs: LeadCaptureArgs): Promise<LeadCaptureResult> {
  const name = str(rawArgs?.nombre, 140) || "Cliente del chat";
  const contact = str(rawArgs?.contacto, 200);
  const projectType = str(rawArgs?.tipo_proyecto, 200) || "Consulta general";
  const company = str(rawArgs?.empresa, 140) || null;
  const industry = str(rawArgs?.rubro, 120) || null;
  const deadline = str(rawArgs?.plazo, 120) || null;
  const summary = str(rawArgs?.resumen, 2000) || "Interés captado desde el chat con IA.";
  const budget = str(rawArgs?.presupuesto_estimado, 120) || null;
  const isQuote = Boolean(rawArgs?.es_cotizacion);

  const email = extractEmail(contact);
  const phone = extractPhone(contact) || extractPhone(str(rawArgs?.telefono, 60));
  const createdAtIso = new Date().toISOString();
  const leadId = randomUUID();

  const messageParts = [
    `[Chat IA] ${isQuote ? "Solicitud de cotización" : "Interés de cliente"}`,
    `Proyecto: ${projectType}`,
    company ? `Empresa: ${company}` : null,
    industry ? `Rubro: ${industry}` : null,
    budget ? `Presupuesto: ${budget}` : null,
    deadline ? `Plazo: ${deadline}` : null,
    `Contacto: ${contact || "no especificado"}`,
    "",
    summary,
  ].filter(Boolean);

  // 1) Registro en base de datos (aparece en /admin/contactos + notificación).
  let saved = false;
  let saveError: string | null = null;
  try {
    await insertRow(
      "Lead",
      {
        id: leadId,
        name,
        email: email || `chat-lead@${siteConfig.domain}`,
        phone,
        source: "CHAT_IA",
        message: messageParts.join("\n"),
        type: "CONTACT",
        createdAt: createdAtIso,
      },
      "id",
    );
    saved = true;
  } catch (err) {
    // Un fallo aquí es grave: el aviso igual sale por correo, así que el
    // problema pasa desapercibido y el contacto no queda en el panel.
    // Se deja registro explícito para poder detectarlo en los logs.
    saveError = err instanceof Error ? err.message : String(err);
    console.error("[chat-lead] NO SE GUARDÓ EL LEAD EN LA BASE:", {
      leadId,
      email,
      error: saveError,
    });
  }

  // 2) Despacho de avisos (correo + WhatsApp) — siempre deja registro en logs.
  let dispatch: DispatchReport | null = null;
  try {
    dispatch = await dispatchChatLeadAlert({
      leadId,
      name,
      contact: contact || "no especificado",
      email,
      phone,
      company,
      industry,
      deadline,
      projectType,
      summary,
      budget,
      isQuote,
      createdAtIso,
    });
  } catch (err) {
    console.error("[chat-lead] fallo el despacho de avisos:", err);
  }

  const message = saved
    ? "Registro creado correctamente. El equipo de Zyteron recibió el aviso y contactará al cliente a la brevedad."
    : "El interés quedó registrado en el aviso al equipo, aunque hubo un problema al guardarlo en el panel.";

  return { ok: saved, leadId: saved ? leadId : null, dispatch, message, saveError };
}
