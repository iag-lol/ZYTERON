import "server-only";
import { prisma } from "@/lib/prisma";
import { buildTemplateMessage, type WhatsappTemplate } from "./template-format";

const env = (name: string) =>
  String(process.env[name] || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .trim();
export async function metaGraph(path: string, init: RequestInit = {}) {
  const token = env("META_WHATSAPP_TOKEN");
  if (!token) throw Error("META_TOKEN_REQUIRED");
  const response = await fetch(`https://graph.facebook.com/v21.0/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(12000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw Error(`META_${data?.error?.code || response.status}`);
  return data;
}
export async function whatsappAccountId() {
  if (env("META_WHATSAPP_WABA_ID")) return env("META_WHATSAPP_WABA_ID");
  const [settings] = await prisma.$queryRaw<
    Array<{ waba_id: string | null }>
  >`SELECT waba_id FROM zyteron_contact_settings WHERE id=true`;
  return settings?.waba_id || "";
}
export async function verifyWhatsappAccount(id: string) {
  if (!/^\d{5,30}$/.test(id)) throw Error("WABA_ID_INVALID");
  const data = await metaGraph(`${id}/phone_numbers?fields=id&limit=100`);
  if (!data?.data?.some((p: { id: string }) => p.id === env("META_WHATSAPP_PHONE_ID")))
    throw Error("WABA_PHONE_MISMATCH");
}
export async function listWhatsappTemplates(): Promise<WhatsappTemplate[]> {
  const id = await whatsappAccountId();
  if (!id) throw Error("WABA_ID_REQUIRED");
  const templates: WhatsappTemplate[] = [];
  let after = "";
  for (let page = 0; page < 10; page++) {
    const data = await metaGraph(
      `${id}/message_templates?fields=id,name,status,language,category,parameter_format,components&limit=100${after ? "&after=" + encodeURIComponent(after) : ""}`,
    );
    templates.push(...(data?.data || []));
    if (!data?.paging?.next || !data?.paging?.cursors?.after) break;
    after = data.paging.cursors.after;
  }
  return templates;
}
export async function sendApprovedTemplate(
  to: string,
  name: string,
  language: string,
  values: Record<string, string>,
) {
  const template = (await listWhatsappTemplates()).find(
    (t) => t.name === name && t.language === language && t.status === "APPROVED",
  );
  if (!template) throw Error("APPROVED_TEMPLATE_REQUIRED");
  const built = buildTemplateMessage(template, values);
  const data = await metaGraph(`${env("META_WHATSAPP_PHONE_ID")}/messages`, {
    method: "POST",
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to.replace(/\D/g, ""),
      type: "template",
      template: {
        name,
        language: { code: language },
        ...(built.components.length ? { components: built.components } : {}),
      },
    }),
  });
  if (!data?.messages?.[0]?.id) throw Error("META_MESSAGE_NOT_ACCEPTED");
  return { id: String(data.messages[0].id), preview: built.preview };
}

export async function setupZyteronTemplates() {
  const id = await whatsappAccountId();
  if (!id) throw Error("WABA_ID_REQUIRED");
  await verifyWhatsappAccount(id);
  const existing = await listWhatsappTemplates();
  const definitions = [
    {
      name: "zyteron_alerta_contacto",
      body: "Tienes una nueva interacción en Zyteron Control. Detalle: {{1}}. Revisa la conversación y gestiona el seguimiento desde tu panel. Este aviso corresponde a las alertas de contacto que activaste.",
      examples: [
        "Nuevo mensaje recibido de un cliente. Revisa el panel de Zyteron para responder.",
      ],
    },
    {
      name: "zyteron_seguimiento_solicitud",
      body: "Hola {{1}}, te escribimos de Zyteron por tu solicitud {{2}}. Necesitamos confirmar un dato para continuar con la atención. ¿Puedes responder este mensaje? Gracias.",
      examples: ["María", "de desarrollo web"],
    },
  ];
  const result = [];
  for (const d of definitions) {
    const found = existing.find((t) => t.name === d.name && t.language === "es_CL");
    if (found) {
      result.push({ name: d.name, status: found.status });
      continue;
    }
    const response = await metaGraph(`${id}/message_templates`, {
      method: "POST",
      body: JSON.stringify({
        name: d.name,
        language: "es_CL",
        category: "UTILITY",
        components: [{ type: "BODY", text: d.body, example: { body_text: [d.examples] } }],
      }),
    });
    result.push({ name: d.name, status: response?.status || "PENDING" });
  }
  return result;
}
