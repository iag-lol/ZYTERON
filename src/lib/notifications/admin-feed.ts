import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildWidgetDashboardSnapshot } from "@/lib/widget/dashboard";

type QuoteRow = {
  id: string;
  name: string | null;
  company: string | null;
  total: number | null;
  createdAt: string;
};

function compact(value: unknown, max = 140) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function money(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function buildAdminNotificationFeed() {
  const db = createSupabaseServerClient().supabase.schema("public");
  const [snapshot, quotesResult] = await Promise.all([
    buildWidgetDashboardSnapshot(),
    db.from("Quote").select("id,name,company,total,createdAt").order("createdAt", { ascending: false }).limit(8),
  ]);

  const leadItems = snapshot.recentContacts.map((lead) => {
    const source = lead.channel.toUpperCase();
    const kind = source === "CHAT_IA" ? "web" : source === "COTIZADOR_WEB" || source === "QUOTE_REQUEST" ? "quote" : "contact";
    return {
      id: `lead:${lead.id}`,
      kind,
      title: kind === "quote" ? `Nueva solicitud: ${lead.name}` : kind === "web" ? `Nuevo mensaje web: ${lead.name}` : `Nuevo contacto: ${lead.name}`,
      subtitle: compact(lead.preview) || "Nueva oportunidad desde el sitio web",
      createdAt: lead.createdAt,
      href: kind === "quote" ? "/admin/cotizaciones" : lead.href,
    };
  });

  const quoteItems = ((quotesResult.data ?? []) as QuoteRow[]).map((quote) => ({
    id: `quote:${quote.id}`,
    kind: "quote",
    title: `Nueva cotización: ${quote.name?.trim() || "Cliente"}`,
    subtitle: [compact(quote.company), money(quote.total)].filter(Boolean).join(" · ") || "Cotización recibida",
    createdAt: quote.createdAt,
    href: "/admin/cotizaciones",
  }));

  const whatsappItems = snapshot.recentMessages.map((message) => ({
    id: `whatsapp:${message.id}`,
    kind: "whatsapp",
    title: `WhatsApp: ${message.name}`,
    subtitle: compact(message.preview) || "Nuevo mensaje recibido",
    createdAt: message.createdAt,
    href: message.href,
  }));

  const commercialItems = snapshot.recentClients.map((lead) => {
    const kind = lead.ownerRole === "partner" ? "partner" : "executive";
    return {
      id: `commercial:${lead.id}`,
      kind,
      title: `${kind === "partner" ? "Partner" : "Ejecutivo"}: nuevo cliente`,
      subtitle: `${lead.name} · ${lead.ownerName}`,
      createdAt: lead.createdAt,
      href: lead.href,
    };
  });

  const items = [...leadItems, ...quoteItems, ...whatsappItems, ...commercialItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 30);

  return {
    generatedAt: snapshot.generatedAt,
    partial: snapshot.partial || Boolean(quotesResult.error),
    metrics: snapshot.metrics,
    items,
  };
}
