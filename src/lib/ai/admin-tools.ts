import { getQuotes, getClients, getSales } from "@/lib/admin/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listConversations } from "@/lib/whatsapp/store";
import type { OpenAITool } from "@/lib/ai/openai-runtime";

/**
 * Herramientas de SOLO LECTURA que conectan al asistente interno con los datos
 * reales del sistema (leads, cotizaciones, ventas, clientes, WhatsApp).
 * Ninguna escribe; todas están diseñadas para no lanzar nunca.
 */

function clp(n: number) {
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n || 0);
  } catch {
    return `$${Math.round(n || 0)}`;
  }
}

function j(value: unknown) {
  try {
    return JSON.stringify(value).slice(0, 7000);
  } catch {
    return "{}";
  }
}

function includesQuery(haystack: string, q?: string) {
  if (!q) return true;
  return haystack.toLowerCase().includes(q.trim().toLowerCase());
}

async function fetchLeads(limit = 500): Promise<Record<string, unknown>[]> {
  try {
    const { supabase } = createSupabaseServerClient();
    const { data } = await supabase
      .schema("public")
      .from("Lead")
      .select("name,email,phone,source,message,type,createdAt")
      .order("createdAt", { ascending: false })
      .limit(limit);
    return (data as Record<string, unknown>[]) ?? [];
  } catch {
    return [];
  }
}

function startOfPeriod(period: string): number {
  const now = new Date();
  if (period === "hoy") return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (period === "semana") return Date.now() - 7 * 24 * 60 * 60 * 1000;
  if (period === "mes") return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  if (period === "anio" || period === "año") return new Date(now.getFullYear(), 0, 1).getTime();
  return 0; // 'todo'
}

// -- Definición de las herramientas -----------------------------------------

export const ADMIN_DATA_TOOLS: OpenAITool[] = [
  {
    type: "function",
    function: {
      name: "resumen_negocio",
      description:
        "Entrega un resumen general del negocio: total de leads, cotizaciones por estado y valor del pipeline, ventas del mes y estado de WhatsApp. Úsala cuando pregunten cómo va el negocio o pidan un panorama.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_leads",
      description: "Busca leads/contactos entrantes (formulario, cotizador, chat, WhatsApp). Filtra por nombre, correo o teléfono.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Texto para filtrar (nombre, correo, teléfono)." },
          limite: { type: "number", description: "Máximo de resultados (por defecto 15)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_cotizaciones",
      description: "Lista o filtra cotizaciones. Puede filtrar por estado (PENDING, SENT, WON, LOST) o por cliente.",
      parameters: {
        type: "object",
        properties: {
          estado: { type: "string", description: "PENDING | SENT | WON | LOST" },
          query: { type: "string", description: "Nombre o empresa del cliente." },
          limite: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_ventas",
      description: "Suma y detalla las ventas registradas en un período.",
      parameters: {
        type: "object",
        properties: {
          periodo: { type: "string", description: "hoy | semana | mes | anio | todo (por defecto mes)." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_clientes",
      description: "Busca clientes registrados por nombre, empresa, correo o teléfono.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          limite: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_whatsapp",
      description: "Busca conversaciones de WhatsApp por nombre o teléfono y muestra su estado, modo IA y estado del lead.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          limite: { type: "number" },
        },
      },
    },
  },
];

const DATA_TOOL_NAMES = new Set(ADMIN_DATA_TOOLS.map((t) => t.function.name as string));

export function isAdminDataTool(name: string) {
  return DATA_TOOL_NAMES.has(name);
}

// -- Ejecución ---------------------------------------------------------------

export async function runAdminDataTool(name: string, argsJson: string): Promise<string> {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(argsJson || "{}");
  } catch {
    args = {};
  }
  const query = typeof args.query === "string" ? args.query : undefined;
  const limit = Math.min(Number(args.limite) || 15, 40);

  try {
    switch (name) {
      case "resumen_negocio": {
        const [leads, quotes, sales, convs] = await Promise.all([
          fetchLeads(1000),
          getQuotes(),
          getSales(),
          listConversations(1000),
        ]);
        const week = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const leads7 = leads.filter((l) => new Date(String(l.createdAt)).getTime() >= week).length;
        const byStatus: Record<string, number> = {};
        let pipeline = 0;
        for (const q of quotes as Array<Record<string, unknown>>) {
          const st = String(q.status || "PENDING");
          byStatus[st] = (byStatus[st] || 0) + 1;
          if (st === "PENDING" || st === "SENT") pipeline += Number(q.totalAmount) || 0;
        }
        const monthStart = startOfPeriod("mes");
        const salesMonth = (sales as Array<Record<string, unknown>>).filter(
          (s) => new Date(String(s.createdAt)).getTime() >= monthStart,
        );
        const salesMonthSum = salesMonth.reduce((a, s) => a + (Number(s.total) || 0), 0);
        const waOpen = convs.filter((c) => c.status === "open").length;
        const waUnread = convs.reduce((a, c) => a + (c.unread_count || 0), 0);

        return j({
          leads: { total: leads.length, ultimos_7_dias: leads7 },
          cotizaciones: { total: quotes.length, por_estado: byStatus, valor_pipeline_abierto: clp(pipeline) },
          ventas_mes: { cantidad: salesMonth.length, total: clp(salesMonthSum) },
          whatsapp: { conversaciones_abiertas: waOpen, mensajes_sin_leer: waUnread },
        });
      }

      case "buscar_leads": {
        const leads = await fetchLeads(1000);
        const rows = leads
          .filter((l) => includesQuery(`${l.name ?? ""} ${l.email ?? ""} ${l.phone ?? ""} ${l.message ?? ""}`, query))
          .slice(0, limit)
          .map((l) => ({
            nombre: l.name,
            telefono: l.phone,
            correo: l.email,
            origen: l.source,
            fecha: l.createdAt,
            mensaje: String(l.message ?? "").slice(0, 200),
          }));
        return j({ total_encontrados: rows.length, leads: rows });
      }

      case "consultar_cotizaciones": {
        const estado = typeof args.estado === "string" ? args.estado.toUpperCase() : undefined;
        const quotes = (await getQuotes()) as Array<Record<string, unknown>>;
        const rows = quotes
          .filter((q) => (estado ? String(q.status).toUpperCase() === estado : true))
          .filter((q) => includesQuery(`${q.name ?? ""} ${q.company ?? ""}`, query))
          .slice(0, limit)
          .map((q) => ({
            cliente: q.name,
            empresa: q.company,
            total: clp(Number(q.totalAmount) || 0),
            estado: q.status,
            fecha: q.createdAt,
            numero: q.displayNumber,
          }));
        return j({ total_encontradas: rows.length, cotizaciones: rows });
      }

      case "consultar_ventas": {
        const period = typeof args.periodo === "string" ? args.periodo : "mes";
        const from = startOfPeriod(period);
        const sales = (await getSales()) as Array<Record<string, unknown>>;
        const filtered = sales.filter((s) => new Date(String(s.createdAt)).getTime() >= from);
        const total = filtered.reduce((a, s) => a + (Number(s.total) || 0), 0);
        const detalle = filtered.slice(0, 10).map((s) => ({
          total: clp(Number(s.total) || 0),
          descripcion: s.description,
          fecha: s.createdAt,
          metodo: s.paymentMethod,
        }));
        return j({ periodo: period, cantidad: filtered.length, total: clp(total), detalle });
      }

      case "buscar_clientes": {
        const clients = (await getClients()) as Array<Record<string, unknown>>;
        const rows = clients
          .filter((c) => includesQuery(`${c.name ?? ""} ${c.company ?? ""} ${c.email ?? ""} ${c.phone ?? ""}`, query))
          .slice(0, limit)
          .map((c) => ({
            nombre: c.name,
            empresa: c.company,
            correo: c.email,
            telefono: c.phone,
            rubro: c.industry,
          }));
        return j({ total_encontrados: rows.length, clientes: rows });
      }

      case "buscar_whatsapp": {
        const convs = await listConversations(1000);
        const rows = convs
          .filter((c) => includesQuery(`${c.customer_name ?? ""} ${c.profile_name ?? ""} ${c.phone}`, query))
          .slice(0, limit)
          .map((c) => ({
            nombre: c.customer_name || c.profile_name || `+${c.phone}`,
            telefono: `+${c.phone}`,
            ultimo_mensaje: c.last_message,
            estado: c.status,
            modo_ia: c.mode,
            estado_lead: c.lead_status,
            sin_leer: c.unread_count,
          }));
        return j({ total_encontradas: rows.length, conversaciones: rows });
      }

      default:
        return "Herramienta de datos no reconocida.";
    }
  } catch (err) {
    console.error("[admin-tools] error en", name, err);
    return "No se pudo consultar ese dato en este momento.";
  }
}
