import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { boundedJson } from "@/lib/security/public-intake";
import { publishClientCommunication } from "@/lib/portal/client-communication";
const schema = z
  .object({
    userId: z.string().trim().min(1).max(100),
    subject: z.string().trim().min(3).max(140),
    message: z.string().trim().min(5).max(5000),
    channel: z.literal("PORTAL").optional(),
  })
  .strict();
export async function POST(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;
  try {
    const parsed = schema.safeParse(await boundedJson(req, 16384));
    if (!parsed.success)
      return NextResponse.json(
        { error: "Revisa el destinatario, asunto y mensaje." },
        { status: 400 },
      );
    const c = await publishClientCommunication(
      parsed.data,
      auth.legacy ? null : auth.session.user.id,
      req.headers.get("idempotency-key"),
    );
    return NextResponse.json({
      ok: true,
      id: c.id,
      createdAt: c.createdAt.toISOString(),
      delivery: "PORTAL",
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return NextResponse.json(
      {
        error:
          code === "IDEMPOTENCY_CONFLICT"
            ? "Esta operación ya guardó un mensaje diferente."
            : code === "CLIENT_NOT_FOUND"
              ? "Cliente no encontrado."
              : "No se pudo publicar el mensaje.",
      },
      {
        status:
          code === "CLIENT_NOT_FOUND"
            ? 404
            : code === "IDEMPOTENCY_CONFLICT"
              ? 409
              : code === "IDEMPOTENCY_INVALID"
                ? 400
                : 500,
      },
    );
  }
}
