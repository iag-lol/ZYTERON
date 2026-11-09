import { z } from "zod";
import { getPortalSession } from "@/lib/auth/portal-session";
import { prisma } from "@/lib/prisma";
import {
  buildCheckoutMeta,
  parseCheckoutMeta,
  setCheckoutFlowCreation,
  type CheckoutMeta,
} from "@/lib/checkout/orders";
import { formatRut, isValidRut } from "@/lib/checkout/rut";
import { assertFlowCheckoutReady, createFlowPayment } from "@/lib/payments/flow";
import { CATALOG_VERSION, calculateManualQuote, selectionSchema } from "@/lib/manual-quote/catalog";
import {
  manualInput,
  manualJson,
  manualFailure,
  manualOrder,
  ManualError,
  type ManualDraft,
} from "@/lib/manual-quote/server";

const payload = z
  .object({
    quoteId: z.uuid(),
    expectedTotal: z.number().int().positive(),
    selection: selectionSchema.extend({ version: z.string().min(1).max(40) }),
    accepted: z.literal(true),
    billing: z
      .object({
        rut: z.string().max(20).refine(isValidRut, "Ingresa un RUT válido."),
        address: z.string().trim().min(8).max(260),
        documentType: z.enum(["BOLETA", "FACTURA"]),
        companyName: z.string().trim().max(160),
        companyRut: z.string().max(20),
        businessLine: z.string().trim().max(240),
      })
      .strict(),
  })
  .strict();
export async function POST(req: Request) {
  try {
    const parsed = payload.safeParse(await manualInput(req, "manual-checkout", 10));
    if (!parsed.success)
      throw new ManualError(
        parsed.error.issues[0]?.message || "Revisa los datos de pago y acepta el alcance.",
      );
    const { order } = await manualOrder();
    if (parsed.data.quoteId !== order.id)
      throw new ManualError("La cotización activa cambió. Recarga antes de pagar.", 409);
    const session = await getPortalSession();
    if (
      !session?.user?.id ||
      session.user.accountStatus !== "ACTIVE" ||
      !session.user.emailVerifiedAt ||
      session.user.email?.toLowerCase() !== order.email.toLowerCase()
    )
      throw new ManualError("Verifica tu correo e inicia sesión antes de pagar.", 401);
    const { billing, selection } = parsed.data;
    if (
      billing.documentType === "FACTURA" &&
      (!billing.companyName || !billing.businessLine || !isValidRut(billing.companyRut))
    )
      throw new ManualError("Completa razón social, giro y RUT de la empresa para factura.");
    try {
      assertFlowCheckoutReady();
    } catch {
      throw new ManualError(
        "La pasarela de pago no está disponible en este momento. Tu cotización queda guardada; contáctanos para coordinar el pago.",
        503,
      );
    }
    const meta = await prisma.$transaction(async (db) => {
      await db.$queryRaw`SELECT id FROM "Quote" WHERE id=${order.id} FOR UPDATE`;
      const fresh = await db.quote.findUnique({ where: { id: order.id } });
      if (!fresh) throw new ManualError("Pedido no disponible.", 404);
      const stored = JSON.parse(fresh.message || "{}");
      if (stored.type === "PRODUCT_CHECKOUT") {
        const existing = parseCheckoutMeta(fresh.message);
        if (!existing?.manualQuote || fresh.userId !== session.user.id)
          throw new ManualError("Pedido no disponible para esta cuenta.", 403);
        if (existing.flow.status === 2)
          throw new ManualError("Este pedido ya está pagado. Puedes revisarlo en tu cuenta.", 409);
        if ([3, 4].includes(existing.flow.status || 0))
          throw new ManualError(
            "El intento terminó sin pago. Inicia una nueva cotización para volver a contratar.",
            409,
          );
        if (JSON.stringify(existing.manualQuote.snapshot.selection) !== JSON.stringify(selection))
          throw new ManualError(
            "El pedido tiene un alcance reservado diferente. Recarga para revisar su resumen.",
            409,
          );
        if (parsed.data.expectedTotal !== existing.total)
          throw new ManualError("Revisa el total del alcance reservado antes de pagar.", 409);
        return existing;
      }
      let current;
      try {
        current = calculateManualQuote(selection);
      } catch {
        throw new ManualError(
          "El catálogo cambió. Revisa y guarda tu selección antes de pagar.",
          409,
        );
      }
      if (parsed.data.expectedTotal !== current.total)
        throw new ManualError("El precio cambió. Revisa el total actualizado antes de pagar.", 409);
      const draft = stored as ManualDraft;
      if (
        draft.type !== "MANUAL_QUOTE" ||
        draft.snapshot.version !== CATALOG_VERSION ||
        JSON.stringify(draft.snapshot.selection) !== JSON.stringify(selection)
      )
        throw new ManualError(
          "La selección cambió. Guarda y revisa el resumen antes de pagar.",
          409,
        );
      const snapshot = { ...draft, snapshot: current, acceptedAt: new Date().toISOString() };
      const items = [
        {
          productId: "manual-plan:" + current.base.id,
          slug: current.base.id,
          name: current.base.name,
          quantity: 1,
          listPrice: current.base.amount,
          finalUnitPrice: current.base.amount,
          lineTotal: current.base.amount,
        },
        ...current.addons.map((a) => ({
          productId: "manual-addon:" + a.id,
          slug: a.id,
          name: a.name,
          quantity: a.quantity,
          listPrice: a.amount,
          finalUnitPrice: a.amount,
          lineTotal: a.lineTotal,
        })),
      ];
      const checkout: CheckoutMeta = {
        ...buildCheckoutMeta({
          customer: {
            buyerName: order.name,
            buyerEmail: order.email,
            buyerPhone: order.phone,
            buyerRut: formatRut(billing.rut),
            address: billing.address,
            documentType: billing.documentType,
            companyName: billing.documentType === "FACTURA" ? billing.companyName : null,
            companyRut: billing.documentType === "FACTURA" ? formatRut(billing.companyRut) : null,
            companyBusinessLine: billing.documentType === "FACTURA" ? billing.businessLine : null,
            comments: `Cotizador manual ${CATALOG_VERSION}. Alcance aceptado y guardado con el pedido. Plazo: ${current.days.join(" a ")} días hábiles desde pago, contenidos y accesos completos.`,
          },
          items,
          subtotal: current.net,
          discount: 0,
          netSubtotal: current.net,
          taxRate: 0.19,
          taxAmount: current.tax,
          total: current.total,
        }),
        manualQuote: snapshot,
      };
      await db.quote.update({
        where: { id: order.id },
        data: {
          userId: session.user.id,
          message: JSON.stringify(checkout),
          subtotal: current.net,
          total: current.total,
        },
      });
      await db.lead.update({
        where: { id: draft.leadId },
        data: {
          userId: session.user.id,
          message: `Cotización manual #${order.id.slice(0, 8).toUpperCase()}. ${current.base.name}. Alcance aceptado. Correo verificado. Total con IVA: $${current.total.toLocaleString("es-CL")}. Pago pendiente.`,
        },
      });
      return checkout;
    });
    const flow = await createFlowPayment({
      commerceOrder: order.id,
      subject: `Proyecto Zyteron #${order.id.slice(0, 8).toUpperCase()}`,
      amount: meta.total,
      email: order.email,
      urlConfirmation: "https://www.zyteron.cl/api/checkout/flow/confirmation",
      urlReturn: "https://www.zyteron.cl/api/checkout/flow/return",
      paymentMethod: 9,
      timeout: 3600,
      optional: JSON.stringify({ source: "manual-quote", version: CATALOG_VERSION }),
    });
    const checkoutUrl = `${flow.url}?token=${encodeURIComponent(flow.token)}`;
    await setCheckoutFlowCreation({
      orderId: order.id,
      token: flow.token,
      flowOrder: flow.flowOrder,
      checkoutUrl,
    });
    return manualJson({ ok: true, checkoutUrl, orderId: order.id, total: meta.total });
  } catch (error) {
    if (error instanceof Error && error.message === "PAYMENT_CREATION_REQUIRES_RECONCILIATION")
      return manualJson(
        {
          error:
            "El intento de pago necesita revisión. Tu pedido está guardado; contacta a Zyteron con su referencia antes de iniciar otro cobro.",
        },
        409,
      );
    return manualFailure(error);
  }
}
