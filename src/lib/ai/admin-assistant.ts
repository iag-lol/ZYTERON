import { randomUUID } from "node:crypto";
import { siteConfig } from "@/config/site";
import {
  ADDONS,
  AI_SERVICES,
  MAINTENANCE,
  PLAN_PRICES,
  PLANS,
} from "@/config/pricing";
import { insertRow } from "@/lib/admin/repository";
import { buildQuoteMeta, serializeQuoteMessage } from "@/lib/admin/quote";

/**
 * Asistente IA INTERNO del panel admin de Zyteron ("Zyra Admin").
 *
 * A diferencia del chat público, este asistente conoce la lógica comercial
 * interna: parte de los precios publicados como PISO ("desde") y propone un
 * precio final competitivo. Puede además crear borradores de cotización reales.
 */

const IVA_RATE = 0.19;

function renderPricing() {
  const plans = PLANS.map((p) => `- ${p.name}: ${p.price}${p.note ? ` (${p.note})` : ""}`).join("\n");
  const addons = ADDONS.map((a) => `- ${a.name}: ${a.price}${a.note ? ` (${a.note})` : ""}`).join("\n");
  const ai = AI_SERVICES.map(
    (s) => `- ${s.name}: implementación ${s.setup}${s.monthly ? ` + ${s.monthly}` : ""}`,
  ).join("\n");
  const maint = MAINTENANCE.map((m) => `- ${m.name}: ${m.price}`).join("\n");
  return `PLANES (piso "desde", sin IVA):\n${plans}\n\nINTELIGENCIA ARTIFICIAL:\n${ai}\n\nADICIONALES:\n${addons}\n\nMANTENCIÓN:\n${maint}`;
}

export function buildAdminSystemPrompt() {
  const { legalName } = siteConfig;
  return `Eres "Zyra Admin", el asistente interno de inteligencia comercial de ${legalName}. Ayudas al equipo de Zyteron a cotizar, analizar y tomar decisiones. Hablas en español de Chile, claro y directo, sin emojis. Este es un entorno PRIVADO de administración: puedes hablar de márgenes, estrategia de precios y datos internos.

## QUÉ PUEDES HACER
1. Generar propuestas de cotización para un cliente a partir de servicios o tareas descritas.
2. Recomendar precios finales competitivos.
3. Analizar requerimientos, estimar alcance y sugerir el plan o combinación adecuada.
4. Explicar qué incluye cada servicio y responder dudas sobre el negocio y la web de Zyteron.
5. Crear un BORRADOR de cotización real en el sistema (herramienta crear_borrador_cotizacion).

## PRECIOS DE REFERENCIA (todos son PISO "desde" y NO incluyen IVA)
${renderPricing()}

## ESTRATEGIA DE PRECIOS (MUY IMPORTANTE)
- Los precios publicados son el PISO. Nunca cotices por debajo de ese piso.
- Propón un precio final COMPETITIVO: ajusta hacia arriba desde el piso según el alcance real (cantidad de pantallas, módulos, integraciones, complejidad, urgencia), pero posiciónalo un poco por debajo del precio típico de mercado de la competencia para ganar el trato.
- Como referencia práctica: para alcance estándar suele quedar entre un 10% y 25% sobre el piso; para proyectos complejos, más. Usa criterio, no una fórmula rígida.
- Justifica brevemente el precio propuesto (qué incluye y por qué es competitivo).
- Trabaja en valores NETOS y agrega el IVA (19%) al final. Muestra siempre: detalle de ítems con precio neto, subtotal neto, IVA (19%), y TOTAL con IVA.
- Separa claramente pagos únicos de cobros mensuales.
- No prometas cantidades ilimitadas de módulos, usuarios, mensajes o almacenamiento. Los servicios externos (dominios, hosting, IA, mensajería, terceros) se cobran por separado.

## CÓMO PRESENTAR UNA PROPUESTA
Cuando te pidan cotizar para una persona/empresa, entrega:
1. Un resumen del alcance entendido.
2. Una LISTA clara de ítems (usa viñetas "- Nombre — $precio neto"), no uses tablas markdown.
3. Subtotal neto, IVA (19%) y Total con IVA, en negrita.
4. Cobros mensuales aparte si corresponde.
5. Una nota de que los valores externos van por separado.
Luego ofrece crear el borrador en el sistema. Si el usuario confirma (o te pide "créala/guárdala"), llama a crear_borrador_cotizacion con los ítems y sus precios NETOS. Si falta el nombre del cliente, pídelo.

Sé preciso con los números y no inventes servicios fuera de la lista. Si algo requiere evaluación técnica, dilo.`;
}

// -- Herramienta: crear borrador de cotización ------------------------------

export const CREATE_QUOTE_TOOL = {
  type: "function" as const,
  function: {
    name: "crear_borrador_cotizacion",
    description:
      "Crea un borrador de cotización real en el panel de Zyteron con los ítems y precios netos propuestos. " +
      "Llámala solo cuando el usuario confirme que quiere crear/guardar la cotización y tengas el nombre del cliente.",
    parameters: {
      type: "object",
      properties: {
        cliente_nombre: { type: "string", description: "Nombre del cliente o empresa." },
        cliente_email: { type: "string", description: "Correo del cliente, si se conoce." },
        cliente_empresa: { type: "string", description: "Empresa del cliente, si aplica." },
        cliente_telefono: { type: "string", description: "Teléfono o WhatsApp del cliente, si se conoce." },
        items: {
          type: "array",
          description: "Ítems de la cotización con su precio NETO (sin IVA) por unidad.",
          items: {
            type: "object",
            properties: {
              descripcion: { type: "string", description: "Nombre del servicio o ítem." },
              detalle: { type: "string", description: "Detalle breve opcional." },
              cantidad: { type: "number", description: "Cantidad (por defecto 1)." },
              precio_neto: { type: "number", description: "Precio neto unitario en CLP, sin IVA." },
            },
            required: ["descripcion", "precio_neto"],
          },
        },
        notas: { type: "string", description: "Notas o condiciones de la propuesta." },
      },
      required: ["cliente_nombre", "items"],
    },
  },
} as const;

type QuoteItemArg = {
  descripcion?: unknown;
  detalle?: unknown;
  cantidad?: unknown;
  precio_neto?: unknown;
};

type CreateQuoteArgs = {
  cliente_nombre?: unknown;
  cliente_email?: unknown;
  cliente_empresa?: unknown;
  cliente_telefono?: unknown;
  items?: unknown;
  notas?: unknown;
};

function str(v: unknown, max = 500) {
  return String(v ?? "").trim().slice(0, max);
}
function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export type CreateQuoteResult = { ok: boolean; quoteId: string | null; message: string };

/** Ejecuta la creación del borrador de cotización. No lanza nunca. */
export async function executeCreateQuoteDraft(rawArgs: CreateQuoteArgs): Promise<CreateQuoteResult> {
  const name = str(rawArgs?.cliente_nombre, 140) || "Cliente";
  const email = str(rawArgs?.cliente_email, 160);
  const company = str(rawArgs?.cliente_empresa, 140);
  const phone = str(rawArgs?.cliente_telefono, 40);
  const notes = str(rawArgs?.notas, 1500);

  const rawItems = Array.isArray(rawArgs?.items) ? (rawArgs!.items as QuoteItemArg[]) : [];
  const items = rawItems
    .map((it) => {
      const unitPrice = num(it?.precio_neto);
      const qty = num(it?.cantidad) || 1;
      return {
        id: randomUUID(),
        description: str(it?.descripcion, 200) || "Servicio",
        detail: str(it?.detalle, 300),
        qty,
        unit: "servicio",
        unitPrice,
        discountPct: 0,
      };
    })
    .filter((it) => it.unitPrice > 0);

  if (items.length === 0) {
    return { ok: false, quoteId: null, message: "No se pudo crear: faltan ítems con precio válido." };
  }

  const subtotal = items.reduce((acc, it) => acc + it.unitPrice * it.qty, 0);
  const iva = Math.round(subtotal * IVA_RATE);
  const grandTotal = subtotal + iva;
  const quoteId = randomUUID();

  const meta = buildQuoteMeta({
    items,
    subtotal,
    totalDescuento: 0,
    iva,
    grandTotal,
    includeIva: true,
    ivaRate: IVA_RATE,
    clientContact: [email, phone].filter(Boolean).join(" · ") || undefined,
    notes: notes || undefined,
    quoteDate: new Date().toISOString(),
  });

  try {
    await insertRow(
      "Quote",
      {
        id: quoteId,
        name,
        email: email || `sin-correo@${siteConfig.domain}`,
        phone: phone || null,
        company: company || null,
        message: serializeQuoteMessage(meta),
        subtotal,
        discount: 0,
        total: grandTotal,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      },
      "id",
    );
  } catch (err) {
    console.error("[admin-ai] no se pudo crear la cotización:", err);
    return { ok: false, quoteId: null, message: "Hubo un problema al guardar la cotización en el panel." };
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

  return {
    ok: true,
    quoteId,
    message:
      `Borrador de cotización creado para ${name}. Subtotal neto ${fmt(subtotal)}, IVA ${fmt(iva)}, total ${fmt(grandTotal)}. ` +
      `Ya aparece en /admin/cotizaciones para revisar, editar y enviar.`,
  };
}
