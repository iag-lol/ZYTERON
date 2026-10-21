import "server-only";
import { prisma } from "@/lib/prisma";
import { parseQuoteMessage, serializeQuoteMessage, enrichQuoteRecord } from "@/lib/admin/quote";
import { generateQuotePdf } from "@/lib/admin/quote-pdf";
export async function sendNativeProposal(quoteId: string, actorId: string | null) {
  const key = process.env.RESEND_API_KEY,
    from = process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM;
  if (!key || !from) throw Error("Configura el correo comercial antes de enviar.");
  await prisma.$transaction(
    async (db) => {
      await db.$queryRaw`SELECT id FROM "Quote" WHERE id=${quoteId} FOR UPDATE`;
      const q = await db.quote.findUniqueOrThrow({ where: { id: quoteId } }),
        m = parseQuoteMessage(q.message) as ReturnType<typeof parseQuoteMessage> & {
          controlState?: string;
        };
      const exists = await db.$queryRaw<
        Array<{ id: string }>
      >`SELECT id FROM zyteron_proposal_delivery WHERE quote_id=${quoteId}`;
      if (exists.length) return;
      if (m.controlState !== "READY_TO_SEND" || q.total <= 0 || q.userId || !q.email.includes("@"))
        throw Error("Revisa la propuesta aprobada y su destinatario.");
      const e = enrichQuoteRecord({ ...q, createdAt: q.createdAt.toISOString() });
      const pdf = await generateQuotePdf({
        quoteId: q.id,
        clientName: q.name,
        clientEmail: q.email,
        clientCompany: q.company,
        clientPhone: q.phone,
        status: q.status,
        createdAt: q.createdAt.toISOString(),
        meta: m,
      });
      const payload = JSON.stringify({
        from,
        to: [q.email],
        subject: `Cotización ${e.displayNumber} · Zyteron`,
        text: `Hola ${q.name},\n\nAdjuntamos la propuesta comercial ${e.displayNumber}. Total: ${q.total.toLocaleString("es-CL")} CLP. Puedes responder este correo para revisar el alcance o solicitar cambios.\n\nZyteron SpA`,
        attachments: [
          { filename: e.displayNumber + ".pdf", content: Buffer.from(pdf).toString("base64") },
        ],
      });
      await db.$executeRaw`INSERT INTO zyteron_proposal_delivery(quote_id,payload) VALUES(${quoteId},${payload}::jsonb)`;
    },
    { timeout: 20000 },
  );
  return prisma.$transaction(
    async (db) => {
      await db.$queryRaw`SELECT id FROM "Quote" WHERE id=${quoteId} FOR UPDATE`;
      const [op] = await db.$queryRaw<
        Array<{ id: string; payload: unknown; state: string; first_attempt_at: Date }>
      >`SELECT * FROM zyteron_proposal_delivery WHERE quote_id=${quoteId} FOR UPDATE`;
      if (op.state === "ACCEPTED") return { ok: true, sent: true };
      if (
        op.state === "REVIEW_REQUIRED" ||
        Date.now() - op.first_attempt_at.getTime() > 23 * 3600000
      )
        throw Error("El envío requiere revisar su estado en el proveedor antes de reintentar.");
      const q = await db.quote.findUniqueOrThrow({ where: { id: quoteId } }),
        m = parseQuoteMessage(q.message) as ReturnType<typeof parseQuoteMessage> & {
          controlState?: string;
        };
      if (m.controlState !== "READY_TO_SEND" || q.status === "LOST")
        throw Error("La propuesta cambió de estado. Revisa su versión.");
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
          "Idempotency-Key": "zyteron/proposal/" + op.id,
        },
        body: JSON.stringify(op.payload),
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || typeof data?.id !== "string")
        throw Error(
          "No fue posible confirmar el envío del correo. Reintenta desde la misma propuesta.",
        );
      await db.$executeRaw`UPDATE zyteron_proposal_delivery SET state='ACCEPTED',provider_id=${data.id} WHERE id=${op.id}::uuid`;
      await db.quote.update({
        where: { id: quoteId },
        data: {
          status: "SENT",
          message: serializeQuoteMessage({
            ...m,
            controlState: "SENT",
            sentAt: new Date().toISOString(),
          } as typeof m),
        },
      });
      await db.clientAuditLog.create({
        data: {
          actorId,
          action: "QUOTE_PROPOSAL_SENT",
          entityType: "Quote",
          entityId: quoteId,
          details: { providerMessageId: data.id },
        },
      });
      return { ok: true, sent: true };
    },
    { timeout: 20000 },
  );
}
