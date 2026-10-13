import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { boundedJson } from "@/lib/security/public-intake";
import { isAllowedMutationOrigin, configuredRequestOrigins } from "@/lib/security/request-origin";
import { setWebsiteQuoteBilling } from "@/lib/full-control/quote-billing-action";
import { websiteQuoteCollections } from "./collections";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;
  const id = z
    .string()
    .uuid()
    .safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "Cotización inválida." }, { status: 400 });
  try {
    const rows = await websiteQuoteCollections(id.data);
    return rows
      ? NextResponse.json({ rows }, { headers: { "cache-control": "no-store" } })
      : NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar los cobros." }, { status: 503 });
  }
}
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;
  if (
    !isAllowedMutationOrigin({
      requestOrigin: new URL(req.url).origin,
      origin: req.headers.get("origin"),
      referer: req.headers.get("referer"),
      secFetchSite: req.headers.get("sec-fetch-site"),
      allowedOrigins: configuredRequestOrigins(),
    })
  )
    return NextResponse.json({ error: "Origen no autorizado." }, { status: 403 });
  try {
    const id = z
      .string()
      .uuid()
      .parse((await params).id);
    const { frequency } = z
      .object({ frequency: z.enum(["ONE_TIME", "MONTHLY"]) })
      .strict()
      .parse(await boundedJson(req, 1024));
    return NextResponse.json(
      await setWebsiteQuoteBilling(id, frequency, auth.legacy ? null : auth.session.user.id),
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    return NextResponse.json(
      {
        error:
          code === "QUOTE_BILLING_LOCKED"
            ? "La modalidad ya está comprometida: prepara una nueva versión sin modificar pagos, autorizaciones ni documentos existentes."
            : code === "QUOTE_NOT_FOUND"
              ? "Esta cotización usa su calendario de Finanzas para definir la frecuencia."
              : "No se pudo guardar la modalidad. Revisa los datos.",
      },
      { status: code === "QUOTE_BILLING_LOCKED" ? 409 : code === "QUOTE_NOT_FOUND" ? 404 : 400 },
    );
  }
}
