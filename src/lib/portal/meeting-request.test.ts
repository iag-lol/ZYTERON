import { test } from "node:test";
import assert from "node:assert/strict";
import {
  portalRequestSchema,
  meetingRequestDetails,
  requestedMeetingDate,
  meetingRequestStatus,
} from "./meeting-request";
const input = {
  type: "MEETING",
  title: "Revisión del proyecto",
  details: "Revisar los avances de la plataforma.",
  preferredDate: "2026-10-26",
  preferredTime: "15:30",
  context: "Fleet Control",
};
test("meeting accepts a general consultation without any active service and preserves human readable scheduling", () => {
  const parsed = portalRequestSchema.parse({ ...input, context: "" });
  const details = meetingRequestDetails(parsed, "2026-10-24T12:00:00Z");
  assert.match(details, /Fecha solicitada: 26-10-2026/);
  assert.match(details, /Hora solicitada: 15:30 \(America\/Santiago\)/);
  assert.match(details, /Consulta general/);
  assert.equal(requestedMeetingDate(details), "2026-10-26");
  assert.equal(meetingRequestStatus("PENDING"), "Por confirmar");
});
test("meeting rejects invalid dates, missing time, past dates and incorrect time", () => {
  for (const patch of [
    { preferredDate: "2026-02-30" },
    { preferredTime: undefined },
    { preferredTime: "25:10" },
    { preferredDate: "26-10-2026" },
  ])
    assert.equal(portalRequestSchema.safeParse({ ...input, ...patch }).success, false);
  assert.throws(
    () => meetingRequestDetails(portalRequestSchema.parse(input), "2026-10-27T12:00:00Z"),
    /pasado/,
  );
  assert.equal(requestedMeetingDate("Fecha solicitada: 31-02-2026\nHora solicitada: 10:00"), null);
});
test("existing portal requests retain their details and cannot acquire a meeting time accidentally", () => {
  const parsed = portalRequestSchema.parse({
    type: "SOPORTE",
    title: input.title,
    details: input.details,
  });
  assert.equal(meetingRequestDetails(parsed), input.details);
  assert.equal(portalRequestSchema.safeParse({ ...input, type: "SOPORTE" }).success, false);
  assert.equal(requestedMeetingDate(input.details), null);
});
