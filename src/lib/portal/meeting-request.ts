import { z } from "zod";
import { paymentCivilDate } from "@/lib/payments/payment-projection";

export const portalRequestSchema = z
  .object({
    requestId: z.string().uuid().optional(),
    type: z.enum([
      "NUEVA_WEB",
      "REDISENO",
      "SOPORTE",
      "INTEGRACION",
      "CAMBIOS",
      "COTIZACION",
      "MEETING",
      "PROFILE_UPDATE",
    ]),
    title: z.string().trim().min(4).max(140),
    details: z.string().trim().min(10).max(5000),
    preferredDate: z
      .string()
      .refine(
        (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && paymentCivilDate(v) === v,
        "Revisa la fecha solicitada.",
      )
      .optional(),
    preferredTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Revisa la hora solicitada.")
      .optional(),
    context: z.string().trim().max(200).optional(),
    attachmentUrl: z
      .string()
      .trim()
      .url()
      .refine((v) => {
        try {
          const u = new URL(v);
          return u.protocol === "https:" && !u.username && !u.password;
        } catch {
          return false;
        }
      }, "Usa un enlace HTTPS válido.")
      .optional()
      .or(z.literal("")),
    attachmentName: z.string().trim().max(140).optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (
      (v.preferredDate || v.preferredTime) &&
      (v.type !== "MEETING" || !v.preferredDate || !v.preferredTime)
    )
      ctx.addIssue({
        code: "custom",
        message: "Indica la fecha y la hora de la reunión.",
        path: ["preferredDate"],
      });
  });
export function meetingRequestDetails(
  value: z.infer<typeof portalRequestSchema>,
  now = new Date().toISOString(),
) {
  if (value.type !== "MEETING" || !value.preferredDate) return value.details;
  const today = paymentCivilDate(now)!;
  if (value.preferredDate < today)
    throw new Error("La fecha solicitada no puede estar en el pasado.");
  return [
    `Fecha solicitada: ${value.preferredDate.split("-").reverse().join("-")}`,
    `Hora solicitada: ${value.preferredTime} (America/Santiago)`,
    value.context ? `Proyecto o servicio: ${value.context}` : "Consulta general",
    "",
    value.details,
  ].join("\n");
}
export function requestedMeetingDate(details: string) {
  const match = details.match(/^Fecha solicitada: (\d{2})-(\d{2})-(\d{4})\n/);
  if (!match) return null;
  const date = `${match[3]}-${match[2]}-${match[1]}`;
  return paymentCivilDate(date) === date ? date : null;
}
export const meetingRequestStatus = (status: string) =>
  ({
    PENDING: "Por confirmar",
    IN_PROGRESS: "En coordinación",
    COMPLETED: "Solicitud atendida",
    REJECTED: "No disponible",
  })[status] || "En revisión";
