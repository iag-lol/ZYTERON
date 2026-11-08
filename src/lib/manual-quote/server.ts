import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { boundedJson, publicRateLimit } from "@/lib/security/public-intake";
import { readManualGrant, MANUAL_COOKIE } from "./grant";
import type { ManualSnapshot } from "./catalog";

export type ManualDraft = {
  type: "MANUAL_QUOTE";
  snapshot: ManualSnapshot;
  leadId: string;
  createdAt: string;
  acceptedAt?: string;
};
export class ManualError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function manualJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" },
  });
}
export function manualFailure(error: unknown) {
  if (error instanceof ManualError) return manualJson({ error: error.message }, error.status);
  if (error instanceof Error && error.message === "REQUEST_KEY_CONFLICT")
    return manualJson(
      { error: "Este intento cambió. Actualiza la página y vuelve a comenzar." },
      409,
    );
  return manualJson(
    { error: "No pudimos completar este paso. Tu selección se conserva; vuelve a intentarlo." },
    503,
  );
}
export async function manualInput(req: Request, namespace: string, max = 10) {
  const origin = req.headers.get("origin");
  if (
    origin &&
    origin !== new URL(req.url).origin &&
    !["https://www.zyteron.cl", "https://zyteron.cl"].includes(origin)
  )
    throw new ManualError("Origen de solicitud inválido.", 403);
  if (!(await publicRateLimit(req, namespace, max)).allowed)
    throw new ManualError("Espera un minuto antes de volver a intentar.", 429);
  return boundedJson(req, 16000);
}
export async function manualOrder() {
  const id = readManualGrant((await cookies()).get(MANUAL_COOKIE)?.value);
  if (!id) throw new ManualError("Tu cotización venció. Vuelve a iniciarla para continuar.", 401);
  const order = await prisma.quote.findUnique({ where: { id } });
  if (!order?.message) throw new ManualError("Cotización no disponible.", 404);
  const meta = JSON.parse(order.message);
  const draft: ManualDraft | undefined = meta.type === "MANUAL_QUOTE" ? meta : meta.manualQuote;
  if (!draft || Date.now() - new Date(draft.createdAt).getTime() > 7 * 86400000)
    throw new ManualError(
      "Esta cotización venció. Inicia una nueva para revisar los precios.",
      410,
    );
  return { order, meta, draft };
}
