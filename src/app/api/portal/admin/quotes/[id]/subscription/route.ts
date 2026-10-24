import { NextResponse } from "next/server";
import { z } from "zod";
import { commercialAdmin } from "@/lib/full-control/commercial-api-guard";
import { boundedJson } from "@/lib/security/public-intake";
import {
  cancelAdminSubscription,
  subscriptionControl,
} from "@/lib/full-control/subscription-control";
type Context = { params: Promise<{ id: string }> };
export async function GET(req: Request, { params }: Context) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  try {
    const id = z.uuid().parse((await params).id),
      clientId = z.uuid().parse(new URL(req.url).searchParams.get("clientId"));
    return NextResponse.json(await subscriptionControl(id, clientId), {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "No fue posible consultar la renovación del cliente." },
      { status: 409 },
    );
  }
}
export async function POST(req: Request, { params }: Context) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  try {
    const id = z.uuid().parse((await params).id);
    const body = z
      .object({ clientId: z.uuid(), reason: z.string().trim().min(3).max(500) })
      .strict()
      .parse(await boundedJson(req, 2048));
    return NextResponse.json(
      await cancelAdminSubscription(id, body.clientId, body.reason, auth.actorId ?? null),
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "No fue posible solicitar la cancelación. Revisa la vinculación de la suscripción y actualiza el panel.",
      },
      { status: 409 },
    );
  }
}
