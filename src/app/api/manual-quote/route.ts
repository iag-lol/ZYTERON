import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { z } from "zod";
import { getPortalSession } from "@/lib/auth/portal-session";
import { withPublicSubmission } from "@/lib/security/public-intake";
import { runContactNotifications } from "@/lib/notifications/contact-outbox";
import { calculateManualQuote, selectionSchema } from "@/lib/manual-quote/catalog";
import { createManualGrant, MANUAL_COOKIE, MANUAL_TTL } from "@/lib/manual-quote/grant";
import {
  manualInput,
  manualJson,
  manualFailure,
  manualOrder,
  ManualError,
  type ManualDraft,
} from "@/lib/manual-quote/server";
import { prisma } from "@/lib/prisma";
import { clp } from "@/config/pricing";

const startSchema = z
  .object({
    key: z.uuid(),
    name: z.string().trim().min(3).max(120),
    email: z
      .email()
      .max(160)
      .transform((v) => v.toLowerCase()),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9\s()-]{8,25}$/, "Ingresa un teléfono válido."),
    consent: z.literal(true),
    selection: selectionSchema,
    website: z.string().max(0).optional(),
  })
  .strict();
export async function POST(req: Request) {
  try {
    const parsed = startSchema.safeParse(await manualInput(req, "manual-start", 5));
    if (!parsed.success)
      throw new ManualError("Revisa tu nombre, correo, teléfono y aceptación de privacidad.");
    const data = parsed.data;
    let snapshot;
    try {
      snapshot = calculateManualQuote(data.selection);
    } catch (error) {
      throw new ManualError((error as Error).message);
    }
    const result = await withPublicSubmission("manual-start", data.key, data, async (db) => {
      const id = randomUUID(),
        leadId = randomUUID();
      const draft: ManualDraft = {
        type: "MANUAL_QUOTE",
        snapshot,
        leadId,
        createdAt: new Date().toISOString(),
      };
      await db.quote.create({
        data: {
          id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          message: JSON.stringify(draft),
          subtotal: snapshot.net,
          total: snapshot.total,
          status: "PENDING",
        },
      });
      await db.lead.create({
        data: {
          id: leadId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          source: "COTIZADOR_MANUAL",
          type: "CONTACT",
          message: `Cotización manual #${id.slice(0, 8).toUpperCase()}. ${snapshot.base.name}. Total con IVA: ${clp(snapshot.total)}. Contacto aún no verificado. El cliente está seleccionando su proyecto; no ha pagado.`,
        },
      });
      const event = {
        kind: "MANUAL_QUOTE_STARTED",
        title: "Cliente inició una cotización manual",
        subject: `Cotización manual iniciada: ${data.name}`,
        name: data.name,
        email: data.email,
        phone: data.phone,
        replyTo: data.email,
        body: `${data.name} inició una cotización manual. Plan inicial: ${snapshot.base.name}. Total inicial con IVA: ${clp(snapshot.total)}. Referencia: ${id.slice(0, 8).toUpperCase()}. Contacto declarado, pendiente de verificar. Aún no es una compra.`,
        href: "/administracion/commercial/leads",
        occurredAt: draft.createdAt,
      };
      await db.$executeRaw`INSERT INTO zyteron_contact_events(event_key,payload) VALUES(${"manual-start:" + id},${JSON.stringify(event)}::jsonb) ON CONFLICT DO NOTHING`;
      return { ok: true, id };
    });
    after(async () => {
      try {
        await runContactNotifications();
        const deliveries = await prisma.$queryRaw<
          Array<{ channel: string; state: string; error_code: string | null }>
        >`SELECT channel,state,error_code FROM zyteron_contact_deliveries WHERE event_key=${"manual-start:" + result.value.id}`;
        console.info("MANUAL_QUOTE_NOTICE", JSON.stringify({ id: result.value.id, deliveries }));
      } catch {
        console.error("[manual-quote] Aviso pendiente en bandeja de entrega.");
      }
    });
    const response = manualJson(result.value);
    response.cookies.set(MANUAL_COOKIE, createManualGrant(result.value.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MANUAL_TTL,
    });
    return response;
  } catch (error) {
    return manualFailure(error);
  }
}
export async function GET() {
  try {
    const { order, draft, meta } = await manualOrder();
    const session = await getPortalSession();
    const ready = Boolean(
      session?.user?.id &&
      session.user.accountStatus === "ACTIVE" &&
      session.user.emailVerifiedAt &&
      session.user.email?.toLowerCase() === order.email.toLowerCase(),
    );
    return manualJson({
      ok: true,
      id: order.id,
      name: order.name,
      email: order.email,
      phone: order.phone,
      selection: draft.snapshot.selection,
      ready,
      locked: meta.type === "PRODUCT_CHECKOUT",
      paid: meta.flow?.status === 2,
      ...(ready && meta.customer
        ? {
            billing: {
              rut: meta.customer.buyerRut,
              address: meta.customer.address,
              documentType: meta.customer.documentType,
              companyName: meta.customer.companyName || "",
              companyRut: meta.customer.companyRut || "",
              businessLine: meta.customer.companyBusinessLine || "",
            },
          }
        : {}),
    });
  } catch (error) {
    return manualFailure(error);
  }
}
export async function PATCH(req: Request) {
  try {
    const parsed = z
      .object({ quoteId: z.uuid(), selection: selectionSchema })
      .strict()
      .safeParse(await manualInput(req, "manual-update", 30));
    if (!parsed.success)
      throw new ManualError("Revisa la selección y la referencia de tu cotización.");
    const input = parsed.data;
    const { order } = await manualOrder();
    let snapshot;
    try {
      if (input.quoteId !== order.id)
        throw new ManualError(
          "Otra cotización está activa en este navegador. Recarga para continuar.",
          409,
        );
      snapshot = calculateManualQuote(input.selection);
    } catch (error) {
      throw new ManualError((error as Error).message);
    }
    await prisma.$transaction(async (db) => {
      await db.$queryRaw`SELECT id FROM "Quote" WHERE id=${order.id} FOR UPDATE`;
      const fresh = await db.quote.findUnique({ where: { id: order.id } });
      const draft = JSON.parse(fresh?.message || "{}");
      if (draft.type !== "MANUAL_QUOTE")
        throw new ManualError(
          "Este pedido ya está preparado para pago. Su alcance quedó reservado.",
          409,
        );
      draft.snapshot = snapshot;
      await db.quote.update({
        where: { id: order.id },
        data: { message: JSON.stringify(draft), subtotal: snapshot.net, total: snapshot.total },
      });
    });
    return manualJson({ ok: true, snapshot });
  } catch (error) {
    return manualFailure(error);
  }
}

export async function DELETE(req: Request) {
  try {
    await manualInput(req, "manual-reset", 5);
    const response = manualJson({ ok: true });
    response.cookies.set(MANUAL_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return manualFailure(error);
  }
}
