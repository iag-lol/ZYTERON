import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  inboxAttention,
  inboxDate,
  inboxIdentity,
  inboxNeedsReply,
  inboxUnread,
  mergeInboxMessages,
  refreshInboxDetail,
  type InboxConversation,
  type InboxDetail,
  type InboxMessage,
} from "./model";
const row: InboxConversation = {
  id: "abcdef-1",
  publicId: "abcdef-1",
  key: "web/abcdef-1",
  source: "web",
  name: "Cliente",
  company: null,
  email: null,
  phone: null,
  subject: "Consulta",
  reference: "SOL-ABCDEF",
  channel: "WEB_CHAT",
  status: "OPEN",
  priority: "NORMAL",
  preview: "Hola",
  lastActor: "CLIENT",
  updatedAt: "2026-10-28T13:00:00.000Z",
  createdAt: "2026-10-28T12:00:00.000Z",
  lastIncomingAt: "2026-10-28T13:00:00.000Z",
  readAt: null,
  replyInProgress: false,
  awaitingReply: true,
  clientId: null,
};
const message = (id: string, date = "2026-10-28T13:00:00.000Z"): InboxMessage => ({
  id,
  body: id,
  actor: "CLIENT",
  sender: "Cliente",
  createdAt: date,
  internal: false,
});
const detail = (messages: InboxMessage[], hasMore = false): InboxDetail => ({
  conversation: row,
  messages,
  hasMore,
  nextBefore: hasMore ? { date: messages[0].createdAt, id: messages[0].id } : null,
});
test("identidad: contacto, empresa, correo y visitante estable", () => {
  assert.equal(inboxIdentity({ ...row, name: " Rubén ", company: "Fenice" }), "Rubén");
  assert.equal(inboxIdentity({ ...row, name: " ", company: "Fenice" }), "Fenice");
  assert.equal(
    inboxIdentity({ ...row, name: null, email: "cliente@example.test" }),
    "cliente@example.test",
  );
  assert.equal(inboxIdentity({ ...row, name: null }), "Visitante · ABCDEF");
});
test("lectura se calcula con el último mensaje del cliente y no con una respuesta IA", () => {
  assert.equal(inboxUnread(row), true);
  assert.equal(
    inboxUnread({
      ...row,
      readAt: row.lastIncomingAt,
      lastActor: "AI",
      updatedAt: "2026-10-28T14:00:00.000Z",
    }),
    false,
  );
  assert.equal(inboxUnread({ ...row, readAt: "2026-10-28T12:59:59.000Z" }), true);
  assert.equal(inboxUnread({ ...row, lastIncomingAt: null }), false);
});
test("IA en curso y respuesta terminada son estados distintos", () => {
  assert.equal(inboxAttention({ ...row, replyInProgress: true }).label, "Zara está respondiendo");
  assert.equal(inboxNeedsReply({ ...row, replyInProgress: true }), false);
  assert.equal(
    inboxAttention({ ...row, lastActor: "AI", awaitingReply: false }).label,
    "Respondió Zara",
  );
  assert.equal(
    inboxAttention({ ...row, lastActor: "TEAM", awaitingReply: false }).label,
    "Respondió el equipo",
  );
  assert.equal(inboxAttention(row).label, "Por responder");
  for (const status of ["CLOSED", "RESOLVED", "CANCELLED", "COMPLETED", "REJECTED"]) {
    assert.equal(inboxNeedsReply({ ...row, status }), false);
    assert.equal(inboxAttention({ ...row, status }).label, "Finalizada");
  }
});
test("historial combina sin duplicar, conserva notas y ordena empates por id", () => {
  const result = mergeInboxMessages(
    [message("b"), message("a")],
    [{ ...message("b"), body: "actualizado" }, message("c", "2026-10-28T13:01:00.000Z")],
  );
  assert.deepEqual(
    result.map((r) => r.id),
    ["a", "b", "c"],
  );
  assert.equal(result[1].body, "actualizado");
});
test("actualización conserva páginas antiguas cuando el historial sigue conectado", () => {
  const previous = detail([message("a"), message("b")], true),
    incoming = detail([message("b"), message("c")], true);
  const result = refreshInboxDetail(previous, incoming);
  assert.deepEqual(
    result.messages.map((m) => m.id),
    ["a", "b", "c"],
  );
  assert.deepEqual(result.nextBefore, previous.nextBefore);
  assert.equal(refreshInboxDetail(detail([message("a"), message("b")]), incoming).hasMore, false);
});
test("tras una ausencia larga vuelve a habilitar paginación y evita un hueco silencioso", () => {
  const result = refreshInboxDetail(detail([message("old")]), detail([message("new")], true));
  assert.equal(result.hasMore, true);
  assert.deepEqual(
    result.messages.map((m) => m.id),
    ["new"],
  );
});
test("fechas chilenas y hora de 24 horas", () => {
  assert.equal(inboxDate("2026-10-28T03:05:00.000Z"), "00:05");
  assert.match(inboxDate("2026-10-28T03:05:00.000Z", true), /28-10-2026.*00:05/);
});
