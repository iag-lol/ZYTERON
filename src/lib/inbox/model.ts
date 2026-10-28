export type InboxSource = "web" | "ticket" | "native" | "request";
export type InboxActor = "CLIENT" | "TEAM" | "AI" | "SYSTEM";
export type InboxConversation = {
  id: string;
  publicId: string;
  key: string;
  source: InboxSource;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  subject: string;
  reference: string;
  channel: string;
  status: string;
  priority: string;
  preview: string;
  lastActor: InboxActor;
  updatedAt: string;
  createdAt: string;
  lastIncomingAt: string | null;
  readAt: string | null;
  replyInProgress: boolean;
  awaitingReply: boolean;
  clientId: string | null;
};
export type InboxMessage = {
  id: string;
  body: string;
  actor: InboxActor;
  sender: string;
  createdAt: string;
  internal: boolean;
};
export type InboxDetail = {
  conversation: InboxConversation;
  messages: InboxMessage[];
  hasMore: boolean;
  nextBefore: { date: string; id: string } | null;
};
export function inboxUnread(row: InboxConversation) {
  return Boolean(row.lastIncomingAt && (!row.readAt || row.lastIncomingAt > row.readAt));
}
export function inboxNeedsReply(row: InboxConversation) {
  return (
    !row.replyInProgress &&
    !["CLOSED", "RESOLVED", "CANCELLED", "COMPLETED", "REJECTED"].includes(row.status) &&
    (row.awaitingReply || row.lastActor === "CLIENT")
  );
}
export function inboxAttention(row: InboxConversation) {
  if (row.replyInProgress) return { label: "Zara está respondiendo", tone: "ai" as const };
  if (["CLOSED", "RESOLVED", "CANCELLED", "COMPLETED", "REJECTED"].includes(row.status))
    return { label: "Finalizada", tone: "closed" as const };
  if (inboxNeedsReply(row)) return { label: "Por responder", tone: "waiting" as const };
  if (row.lastActor === "AI") return { label: "Respondió Zara", tone: "ai" as const };
  if (row.lastActor === "TEAM") return { label: "Respondió el equipo", tone: "team" as const };
  return { label: "En seguimiento", tone: "team" as const };
}
export const inboxChannel = (row: InboxConversation) =>
  row.source === "web"
    ? "Chat web"
    : row.channel === "EMAIL"
      ? "Correo"
      : row.source === "request"
        ? "Solicitud"
        : "Soporte";
export function mergeInboxMessages(current: InboxMessage[], incoming: InboxMessage[]) {
  const rows = new Map(current.map((row) => [row.id, row]));
  for (const row of incoming) rows.set(row.id, row);
  return [...rows.values()].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
  );
}
export function inboxIdentity(input: {
  name?: string | null;
  company?: string | null;
  email?: string | null;
  id: string;
}) {
  return (
    input.name?.trim() ||
    input.company?.trim() ||
    input.email?.trim() ||
    `Visitante · ${input.id.slice(0, 6).toUpperCase()}`
  );
}
export function refreshInboxDetail(
  previous: InboxDetail | undefined,
  value: InboxDetail,
): InboxDetail {
  if (
    !previous ||
    !value.messages.some((message) => previous.messages.some((old) => old.id === message.id))
  )
    return value;
  return {
    ...value,
    messages: mergeInboxMessages(previous.messages, value.messages),
    hasMore: previous.hasMore,
    nextBefore: previous.nextBefore,
  };
}
export function inboxDate(value: string, full = false) {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    hourCycle: "h23",
    ...(full ? ({ day: "2-digit", month: "2-digit", year: "numeric" } as const) : {}),
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(value))
    .replaceAll("/", "-");
}
