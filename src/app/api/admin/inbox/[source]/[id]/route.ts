import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { inboxConversation, inboxDetail, markInboxRead } from "@/lib/inbox/store";
import { boundedJson } from "@/lib/security/public-intake";
import { configuredRequestOrigins, isAllowedMutationOrigin } from "@/lib/security/request-origin";
const paramsSchema = z
  .object({
    source: z.enum(["web", "ticket", "native", "request"]),
    id: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-zA-Z0-9-]+$/),
  })
  .refine(
    (p) => !["web", "ticket"].includes(p.source) || z.string().uuid().safeParse(p.id).success,
  );
type Context = { params: Promise<{ source: string; id: string }> };
export async function GET(req: Request, ctx: Context) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;
  const p = paramsSchema.safeParse(await ctx.params),
    query = new URL(req.url).searchParams;
  const date = query.get("before"),
    key = query.get("beforeId");
  if (
    !p.success ||
    (date && (!key || !z.iso.datetime().safeParse(date).success)) ||
    (key?.length || 0) > 100
  )
    return NextResponse.json({ error: "Consulta inválida." }, { status: 400 });
  try {
    const result = await inboxDetail(
      auth.session.user.id,
      p.data.source,
      p.data.id,
      date && key ? { date: new Date(date), id: key } : undefined,
    );
    return NextResponse.json(result || { error: "Conversación no encontrada." }, {
      status: result ? 200 : 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("[inbox/detail]", error);
    return NextResponse.json({ error: "No fue posible abrir la conversación." }, { status: 503 });
  }
}
export async function POST(req: Request, ctx: Context) {
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
    return NextResponse.json({ error: "Origen inválido." }, { status: 403 });
  const p = paramsSchema.safeParse(await ctx.params);
  if (!p.success) return NextResponse.json({ error: "Consulta inválida." }, { status: 400 });
  try {
    const body = z
      .object({ readAt: z.iso.datetime() })
      .strict()
      .safeParse(await boundedJson(req, 1024));
    if (!body.success) return NextResponse.json({ error: "Lectura inválida." }, { status: 400 });
    const c = await inboxConversation(auth.session.user.id, p.data.source, p.data.id);
    if (!c) return NextResponse.json({ error: "Conversación no encontrada." }, { status: 404 });
    // A newer incoming message must remain unread if it arrived after the displayed history.
    if (c.lastIncomingAt && body.data.readAt < c.lastIncomingAt)
      c.lastIncomingAt = body.data.readAt;
    await markInboxRead(auth.session.user.id, c);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[inbox/read]", error);
    return NextResponse.json({ error: "No fue posible registrar la lectura." }, { status: 503 });
  }
}
