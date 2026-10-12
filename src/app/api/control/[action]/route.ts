import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { quoteTotals } from "@/lib/client-experience/quote-totals";
import { prisma } from "@/lib/prisma";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { boundedJson } from "@/lib/security/public-intake";
import { buildQuoteMeta, parseQuoteMessage, serializeQuoteMessage } from "@/lib/admin/quote";
import { normalizeQuoteMetaPayment } from "@/lib/payments/quote-payments";
import { enableQueuedQuoteStage } from "@/lib/payments/quote-payment-workflow";
const id = z.string().min(1).max(100);
const schemas = {
  project: z
    .object({
      id: id.optional(),
      clientId: id,
      title: z.string().trim().min(4).max(160),
      description: z.string().trim().max(5000).default(""),
      scope: z.string().trim().max(5000).default(""),
      status: z.enum(["PLANNED", "IN_PROGRESS", "DONE", "CANCELLED"]),
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .or(z.literal("")),
      endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .or(z.literal("")),
    })
    .strict(),
  ticket: z
    .object({
      id,
      status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_CLIENT", "RESOLVED", "CLOSED"]),
      message: z.string().trim().max(5000).default(""),
      internal: z.boolean().default(false),
    })
    .strict(),
  lead: z.object({ id, status: z.enum(["NEW", "IN_PROGRESS", "CLOSED", "LOST"]) }).strict(),
  quote: z
    .object({
      id: id.optional(),
      userId: id,
      items: z
        .array(
          z
            .object({
              description: z.string().trim().min(2).max(300),
              detail: z.string().trim().max(2000).optional(),
              unit: z.string().trim().max(40).optional(),
              discountPct: z.number().min(0).max(100).optional(),
              qty: z.number().positive().max(10000),
              unitPrice: z.number().int().nonnegative().max(1000000000),
            })
            .strict(),
        )
        .min(1)
        .max(40),
      includeIva: z.boolean(),
      billingType: z.enum(["ONE_TIME", "SUBSCRIPTION"]),
      notes: z.string().trim().max(3000).default(""),
    })
    .strict(),
  enable: z.object({ id, stageKey: z.enum(["FULL", "INITIAL", "FINAL", "DELIVERY"]) }).strict(),
};
export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;
  const { action } = await params;
  const schema = schemas[action as keyof typeof schemas];
  if (!schema) return NextResponse.json({ error: "Acción no disponible." }, { status: 404 });
  try {
    const parsed = schema.safeParse(await boundedJson(req, 32768));
    if (!parsed.success)
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Revisa los datos." },
        { status: 400 },
      );
    const actorId = auth.legacy ? null : auth.session.user.id;
    if (action === "enable") {
      const v = schemas.enable.parse(parsed.data);
      const quote = await prisma.quote.findUnique({
        where: { id: v.id },
        select: { userId: true, total: true, status: true },
      });
      if (!quote?.userId || quote.total <= 0 || quote.status === "LOST")
        throw new Error("QUOTE_NOT_PAYABLE");
      await enableQueuedQuoteStage({ quoteId: v.id, stageKey: v.stageKey, req });
      return NextResponse.json({ ok: true });
    }
    const result = await prisma.$transaction(
      async (db) => {
        if (action === "project") {
          const v = schemas.project.parse(parsed.data);
          const u = await db.user.findFirst({
            where: { id: v.clientId, role: "CLIENT" },
            select: { id: true },
          });
          if (!u) throw new Error("CLIENT_INVALID");
          if (
            v.id &&
            !(await db.project.findFirst({
              where: { id: v.id, clientId: v.clientId },
              select: { id: true },
            }))
          )
            throw new Error("PROJECT_INVALID");
          const start = v.startDate ? new Date(v.startDate + "T00:00:00Z") : null,
            end = v.endDate ? new Date(v.endDate + "T00:00:00Z") : null;
          if (start && end && end < start) throw new Error("DATE_INVALID");
          const data = {
            clientId: v.clientId,
            title: v.title,
            description: v.description,
            scope: v.scope,
            status: v.status,
            startDate: start,
            endDate: end,
          };
          const p = v.id
            ? await db.project.update({ where: { id: v.id }, data, select: { id: true } })
            : await db.project.create({ data, select: { id: true } });
          await db.clientAuditLog.create({
            data: {
              actorId,
              targetUserId: v.clientId,
              action: v.id ? "CONTROL_PROJECT_UPDATED" : "CONTROL_PROJECT_CREATED",
              entityType: "Project",
              entityId: p.id,
            },
          });
          return p;
        }
        if (action === "ticket") {
          const v = schemas.ticket.parse(parsed.data);
          const t = await db.supportTicket.findUnique({
            where: { id: v.id },
            select: { userId: true, title: true },
          });
          if (!t) throw new Error("TICKET_INVALID");
          await db.supportTicket.update({ where: { id: v.id }, data: { status: v.status } });
          if (v.message)
            await db.supportTicketMessage.create({
              data: {
                ticketId: v.id,
                userId: actorId,
                authorRole: "ADMIN",
                message: v.message,
                isInternal: v.internal,
              },
            });
          if (!v.internal)
            await db.clientNotification.create({
              data: {
                userId: t.userId,
                title: "Tu solicitud tiene una actualización",
                body: v.message.slice(0, 240) || t.title,
                link: "/clientes/panel/asistencia",
              },
            });
          await db.clientAuditLog.create({
            data: {
              actorId,
              targetUserId: t.userId,
              action: "CONTROL_TICKET_UPDATED",
              entityType: "SupportTicket",
              entityId: v.id,
            },
          });
          return { id: v.id };
        }
        if (action === "lead") throw new Error("READ_ONLY_INTAKE");
        const v = schemas.quote.parse(parsed.data);
        const user = await db.user.findFirst({
          where: { id: v.userId, role: "CLIENT" },
          select: { id: true, name: true, email: true, company: true, phone: true },
        });
        if (!user) throw new Error("CLIENT_INVALID");
        const current = v.id ? await db.quote.findUnique({ where: { id: v.id } }) : null;
        if (v.id && (!current || (current.userId && current.userId !== v.userId)))
          throw new Error("QUOTE_INVALID");
        if (current) {
          const allocated = await db.paymentAllocation.count({
            where: { receivable: { quoteId: current.id }, payment: { status: "CONFIRMED" } },
          });
          const obligations = await db.receivable.count({
            where: { quoteId: current.id, status: { notIn: ["CANCELLED", "VOID"] } },
          });
          if (allocated || obligations || ["WON", "PAID"].includes(current.status || ""))
            throw new Error("QUOTE_LOCKED");
        }
        const existing = parseQuoteMessage(current?.message);
        if (
          existing.payment?.subscription?.status === "ACTIVE" ||
          (existing.payment?.stages || []).some((s) => s.status === "PROCESSING")
        )
          throw new Error("QUOTE_LOCKED");
        const meta = normalizeQuoteMetaPayment(
          buildQuoteMeta({
            ...existing,
            items: v.items.map((i, n) => ({ ...i, id: `item-${n + 1}`, unit: i.unit || "unidad" })),
            includeIva: v.includeIva,
            ivaRate: 0.19,
            ...quoteTotals(v.items, v.includeIva),
            notes: v.notes,
            payment: {
              ...existing.payment,
              enabled: false,
              billingType: v.billingType,
              defaultChannel: "FLOW",
              channelConfigured: true,
              planMode:
                v.billingType === "SUBSCRIPTION" ? "FULL" : existing.payment?.planMode || "FULL",
              stages: undefined,
            },
          }),
        );
        if (
          !Number.isSafeInteger(meta.grandTotal) ||
          meta.grandTotal <= 0 ||
          meta.grandTotal > 1000000000
        )
          throw new Error("AMOUNT_INVALID");
        const values = {
          userId: user.id,
          name: user.name || user.email,
          email: user.email,
          company: user.company,
          phone: user.phone,
          message: serializeQuoteMessage(meta),
          subtotal: meta.subtotal,
          discount: meta.totalDescuento,
          total: meta.grandTotal,
          status: "PENDING" as const,
        };
        const q = current
          ? await db.quote.update({ where: { id: current.id }, data: values, select: { id: true } })
          : await db.quote.create({ data: { ...values, id: randomUUID() }, select: { id: true } });
        await db.clientAuditLog.create({
          data: {
            actorId,
            targetUserId: user.id,
            action: current ? "CONTROL_QUOTE_UPDATED" : "CONTROL_QUOTE_CREATED",
            entityType: "Quote",
            entityId: q.id,
          },
        });
        return q;
      },
      { timeout: 15000 },
    );
    return NextResponse.json({ ok: true, ...result }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    const message =
      e instanceof Error && e.message === "QUOTE_LOCKED"
        ? "Esta cotización tiene cobros, pagos o cierre comercial. Sus importes no se pueden modificar aquí."
        : "No se pudo guardar. Revisa los vínculos, importes y fechas.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
