import { getPortalSession } from "@/lib/auth/portal-session";
import { sendFinancialCode } from "@/lib/payments/financial-challenge";
import { requestSubscriptionCancellation } from "@/lib/payments/recurring-lifecycle";
import { limitedJson } from "@/lib/payments/request-body";
import { z } from "zod";
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send-code") }).strict(),
  z.object({ action: z.literal("send-start-code") }).strict(),
  z
    .object({
      action: z.literal("cancel"),
      challengeId: z.string().uuid(),
      code: z.string().regex(/^\d{6}$/),
    })
    .strict(),
]);
export async function POST(req: Request, ctx: { params: Promise<{ quoteId: string }> }) {
  const session = await getPortalSession();
  if (!session?.user.id || session.user.accountStatus !== "ACTIVE" || !session.user.emailVerifiedAt)
    return Response.json({ error: "No autenticado" }, { status: 401 });
  if (Number(req.headers.get("content-length") || 0) > 2048)
    return Response.json({ error: "Solicitud demasiado grande" }, { status: 413 });
  const body = bodySchema.safeParse(await limitedJson(req).catch(() => null));
  if (!body.success) return Response.json({ error: "Solicitud inválida" }, { status: 400 });
  const { quoteId } = await ctx.params;
  try {
    if (body.data.action === "send-code" || body.data.action === "send-start-code")
      return Response.json(
        await sendFinancialCode(
          session.user.id,
          quoteId,
          body.data.action === "send-code" ? "CANCEL_SUBSCRIPTION" : "START_SUBSCRIPTION",
        ),
      );
    await requestSubscriptionCancellation({
      userId: session.user.id,
      quoteId,
      challengeId: body.data.challengeId,
      code: body.data.code,
    });
    return Response.json({
      ok: true,
      message: "Cancelación registrada. Conservas el período efectivamente pagado.",
    });
  } catch {
    return Response.json(
      {
        error:
          "No se pudo completar la solicitud. Revisa el código o vuelve a consultar el estado; tu período pagado se conserva.",
      },
      { status: 409 },
    );
  }
}
