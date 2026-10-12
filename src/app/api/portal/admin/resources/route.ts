import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { prisma } from "@/lib/prisma";
import { ensureLegacyClientLink } from "@/lib/portal/legacy-link";
import { boundedJson, intakeFailure } from "@/lib/security/public-intake";
const schema = z
  .object({
    userId: z.string().min(1).max(100),
    kind: z.enum(["SERVICE", "EVENT"]),
    quoteId: z.string().max(100).optional().or(z.literal("")),
    projectId: z.string().max(100).optional().or(z.literal("")),
    id: z.string().uuid().optional(),
    title: z.string().trim().min(3).max(140),
    description: z.string().trim().max(3000).default(""),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    renewal: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal("")),
    price: z.number().int().nonnegative().max(1000000000).default(0),
    frequency: z.enum(["ONE_TIME", "MONTHLY", "QUARTERLY", "ANNUAL"]).default("ONE_TIME"),
    status: z
      .enum([
        "QUOTED",
        "PENDING_ACTIVATION",
        "ACTIVE",
        "SUSPENDED",
        "PENDING_RENEWAL",
        "CANCELLED",
        "EXPIRED",
      ])
      .default("PENDING_ACTIVATION"),
    published: z.boolean().default(false),
  })
  .strict();
function validDate(value: string) {
  const d = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
export async function POST(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;
  try {
    const parsed = schema.safeParse(await boundedJson(req, 16384));
    if (!parsed.success)
      return NextResponse.json({ error: "Revisa los campos del recurso." }, { status: 400 });
    const v = parsed.data;
    if (!validDate(v.date) || (v.renewal && (!validDate(v.renewal) || v.renewal < v.date)))
      return NextResponse.json({ error: "Revisa las fechas." }, { status: 400 });
    const result = await prisma.$transaction(async (db) => {
      const clientId = await ensureLegacyClientLink(db, v.userId),
        id = v.id || randomUUID();
      if (v.kind === "SERVICE") {
        if (
          v.quoteId &&
          !(await db.quote.findFirst({
            where: { id: v.quoteId, userId: v.userId },
            select: { id: true },
          }))
        )
          throw new Error("RESOURCE_LINK_INVALID");
        if (
          v.projectId &&
          !(await db.project.findFirst({
            where: { id: v.projectId, clientId: v.userId },
            select: { id: true },
          }))
        )
          throw new Error("RESOURCE_LINK_INVALID");
        if (v.id) {
          const owned = await db.$queryRaw<
            Array<{ id: string }>
          >`SELECT id FROM client_services WHERE id=${v.id}::uuid AND client_id=${clientId}::uuid FOR UPDATE`;
          if (!owned.length) throw new Error("RESOURCE_NOT_FOUND");
          await db.$executeRaw`UPDATE client_services SET legacy_quote_id=${v.quoteId || null},legacy_project_id=${v.projectId || null},service_name=${v.title},sla=${v.description || null},start_date=${v.date}::date,renewal_date=${v.renewal || null}::date,agreed_price=${v.price},billing_frequency=${v.frequency},billing_type=${v.frequency},status=${v.status},portal_visible=${v.published},updated_at=now() WHERE id=${id}::uuid AND client_id=${clientId}::uuid`;
        } else
          await db.$executeRaw`INSERT INTO client_services(id,client_id,legacy_quote_id,legacy_project_id,service_id,service_name,sla,start_date,renewal_date,agreed_price,currency,billing_frequency,billing_type,status,portal_visible) VALUES(${id}::uuid,${clientId}::uuid,${v.quoteId || null},${v.projectId || null},${"legacy-web-" + id},${v.title},${v.description || null},${v.date}::date,${v.renewal || null}::date,${v.price},'CLP',${v.frequency},${v.frequency},${v.status},${v.published})`;
      } else {
        if (v.id) {
          const owned = await db.$queryRaw<
            Array<{ id: string }>
          >`SELECT id FROM client_events WHERE id=${v.id}::uuid AND client_id=${clientId}::uuid FOR UPDATE`;
          if (!owned.length) throw new Error("RESOURCE_NOT_FOUND");
          await db.$executeRaw`UPDATE client_events SET title=${v.title},description=${v.description},occurred_at=${v.date}::date,visibility=${v.published ? "CLIENT_VISIBLE" : "INTERNAL_ONLY"} WHERE id=${id}::uuid AND client_id=${clientId}::uuid`;
        } else
          await db.$executeRaw`INSERT INTO client_events(id,client_id,event_type,title,description,occurred_at,visibility) VALUES(${id}::uuid,${clientId}::uuid,'MEETING',${v.title},${v.description},${v.date}::date,${v.published ? "CLIENT_VISIBLE" : "INTERNAL_ONLY"})`;
      }
      await db.clientAuditLog.create({
        data: {
          actorId: auth.legacy ? null : auth.session.user.id,
          targetUserId: v.userId,
          action: "ADMIN_RESOURCE_" + (v.id ? "UPDATED" : "CREATED"),
          entityType: v.kind,
          entityId: id,
        },
      });
      return { id };
    });
    return NextResponse.json({ ok: true, ...result }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return intakeFailure(error);
  }
}
