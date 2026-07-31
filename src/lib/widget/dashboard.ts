import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const TIME_ZONE = "America/Santiago";

type LeadRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  message: string | null;
  type: string | null;
  createdAt: string;
};

type ConversationRow = {
  id: string;
  customer_name: string | null;
  profile_name: string | null;
  phone: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  lead_status: string;
  priority: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  content: string | null;
  message_type: string;
  created_at: string;
};

type CommercialLeadRow = {
  id: string;
  owner_id: string;
  name: string;
  validation_status: string;
  commercial_status: string;
  next_follow_up_at: string | null;
  created_at: string;
};

type CommercialOwnerRow = {
  id: string;
  name: string;
  role: string;
};

function dateParts(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .reduce<Record<string, number>>((parts, part) => {
      if (part.type !== "literal") parts[part.type] = Number(part.value);
      return parts;
    }, {});
}

/** Inicio del día local de Santiago expresado como UTC, respetando horario de verano. */
export function santiagoTodayStart(now = new Date()) {
  const local = dateParts(now, TIME_ZONE);
  const desiredUtc = Date.UTC(local.year, local.month - 1, local.day);
  const probe = new Date(desiredUtc);
  const probeLocal = dateParts(probe, TIME_ZONE);
  const probeAsUtc = Date.UTC(
    probeLocal.year,
    probeLocal.month - 1,
    probeLocal.day,
    probeLocal.hour,
    probeLocal.minute,
    probeLocal.second,
  );
  return new Date(desiredUtc - (probeAsUtc - desiredUtc)).toISOString();
}

function compact(value?: string | null, max = 120) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function countOrZero(result: { count: number | null }) {
  return result.count ?? 0;
}

export type WidgetDashboardSnapshot = Awaited<ReturnType<typeof buildWidgetDashboardSnapshot>>;

export async function buildWidgetDashboardSnapshot() {
  const db = createSupabaseServerClient().supabase.schema("public");
  const todayStart = santiagoTodayStart();
  const nowIso = new Date().toISOString();

  const [
    contactsTodayResult,
    webMessagesTodayResult,
    quotesTodayResult,
    recentLeadsResult,
    conversationsResult,
    inboundMessagesResult,
    commercialTodayResult,
    ownersResult,
    potentialResult,
    wonResult,
    validationPendingResult,
    followUpsResult,
  ] = await Promise.all([
    db.from("Lead").select("id", { count: "exact", head: true }).eq("type", "CONTACT").eq("source", "CONTACTO_WEB").gte("createdAt", todayStart),
    db.from("Lead").select("id", { count: "exact", head: true }).in("source", ["CONTACTO_WEB", "CHAT_IA"]).gte("createdAt", todayStart),
    db.from("Quote").select("id", { count: "exact", head: true }).gte("createdAt", todayStart),
    db.from("Lead").select("id,name,email,phone,source,message,type,createdAt").in("source", ["CONTACTO_WEB", "COTIZADOR_WEB", "QUOTE_REQUEST", "CHAT_IA"]).order("createdAt", { ascending: false }).limit(6),
    db.from("whatsapp_conversations").select("id,customer_name,profile_name,phone,last_message,last_message_at,unread_count,lead_status,priority").order("last_message_at", { ascending: false, nullsFirst: false }).limit(500),
    db.from("whatsapp_messages").select("id,conversation_id,content,message_type,created_at").eq("direction", "in").order("created_at", { ascending: false }).limit(6),
    db.from("commercial_leads").select("id,owner_id,name,validation_status,commercial_status,next_follow_up_at,created_at").gte("created_at", todayStart).order("created_at", { ascending: false }).limit(250),
    db.from("commercial_users").select("id,name,role"),
    db.from("commercial_leads").select("id", { count: "exact", head: true }).eq("validation_status", "potential"),
    db.from("commercial_leads").select("id", { count: "exact", head: true }).eq("commercial_status", "won"),
    db.from("commercial_leads").select("id", { count: "exact", head: true }).in("validation_status", ["pending", "in_review"]),
    db.from("commercial_leads").select("id", { count: "exact", head: true }).lte("next_follow_up_at", nowIso).in("commercial_status", ["contacted", "follow_up", "meeting_scheduled", "proposal_sent", "negotiation"]),
  ]);

  const errors = [contactsTodayResult.error, webMessagesTodayResult.error, quotesTodayResult.error, recentLeadsResult.error, conversationsResult.error, inboundMessagesResult.error, commercialTodayResult.error, ownersResult.error, potentialResult.error, wonResult.error, validationPendingResult.error, followUpsResult.error].filter(Boolean);
  const conversations = (conversationsResult.data ?? []) as ConversationRow[];
  const conversationById = new Map(conversations.map((conversation) => [conversation.id, conversation]));
  const inboundMessages = (inboundMessagesResult.data ?? []) as MessageRow[];
  const owners = new Map(((ownersResult.data ?? []) as CommercialOwnerRow[]).map((owner) => [owner.id, owner]));
  const commercialToday = (commercialTodayResult.data ?? []) as CommercialLeadRow[];
  const latestCommercial = commercialToday.slice(0, 6).map((lead) => {
    const owner = owners.get(lead.owner_id);
    return {
      id: lead.id,
      name: lead.name,
      ownerName: owner?.name ?? "Usuario no disponible",
      ownerRole: owner?.role ?? "unknown",
      validationStatus: lead.validation_status,
      commercialStatus: lead.commercial_status,
      createdAt: lead.created_at,
      href: "/admin/comercial?tab=leads",
    };
  });
  const whatsappPending = conversations.reduce((total, conversation) => total + Math.max(Number(conversation.unread_count) || 0, 0), 0);
  const highPriorityUnread = conversations.filter((conversation) => conversation.priority === "high" && conversation.unread_count > 0).length;
  const validationPending = countOrZero(validationPendingResult);
  const followUpsDue = countOrZero(followUpsResult);

  return {
    generatedAt: nowIso,
    timeZone: TIME_ZONE,
    partial: errors.length > 0,
    warnings: errors.length > 0 ? ["Una o más fuentes de datos no respondieron durante esta actualización."] : [],
    metrics: {
      contactsNewToday: countOrZero(contactsTodayResult),
      quotesNewToday: countOrZero(quotesTodayResult),
      whatsappPending,
      webMessagesToday: countOrZero(webMessagesTodayResult),
      partnerClientsNewToday: commercialToday.filter((lead) => owners.get(lead.owner_id)?.role === "partner").length,
      executiveClientsNewToday: commercialToday.filter((lead) => owners.get(lead.owner_id)?.role === "executive").length,
      potentialClients: countOrZero(potentialResult),
      wonClients: countOrZero(wonResult),
      pendingAlerts: whatsappPending + validationPending + followUpsDue,
    },
    alerts: { whatsappPending, highPriorityUnread, validationPending, followUpsDue },
    latestWhatsapp: inboundMessages[0]
      ? (() => {
          const message = inboundMessages[0];
          const conversation = conversationById.get(message.conversation_id);
          return {
            id: message.id,
            conversationId: message.conversation_id,
            name: conversation?.customer_name || conversation?.profile_name || conversation?.phone || "WhatsApp",
            preview: compact(message.content || `[${message.message_type}]`, 140),
            receivedAt: message.created_at,
            href: `/admin/whatsapp?conversation=${message.conversation_id}`,
          };
        })()
      : null,
    recentContacts: ((recentLeadsResult.data ?? []) as LeadRow[]).map((lead) => ({
      id: lead.id,
      name: lead.name || "Contacto web",
      channel: lead.source || lead.type || "WEB",
      preview: compact(lead.message || lead.email || lead.phone, 120),
      createdAt: lead.createdAt,
      href: `/admin/contactos/${lead.id}`,
    })),
    recentMessages: inboundMessages.map((message) => {
      const conversation = conversationById.get(message.conversation_id);
      return {
        id: message.id,
        name: conversation?.customer_name || conversation?.profile_name || conversation?.phone || "WhatsApp",
        preview: compact(message.content || `[${message.message_type}]`, 120),
        createdAt: message.created_at,
        href: `/admin/whatsapp?conversation=${message.conversation_id}`,
      };
    }),
    recentClients: latestCommercial,
    links: {
      contacts: "/admin/contactos",
      quotes: "/admin/cotizaciones",
      whatsapp: "/admin/whatsapp",
      partners: "/admin/comercial?tab=leads",
    },
  };
}
