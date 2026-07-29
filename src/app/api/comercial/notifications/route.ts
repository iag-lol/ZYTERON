import { NextResponse } from "next/server";
import { z } from "zod";
import { getCommercialUserForApi } from "@/lib/commercial/session";
import { listNotifications, markNotificationsRead } from "@/lib/commercial/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCommercialUserForApi();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const result = await listNotifications(user.id);
  return NextResponse.json(result);
}

const schema = z.object({ id: z.string().uuid().optional() });

/** Marca como leída una notificación puntual o todas las del ejecutivo. */
export async function POST(req: Request) {
  const user = await getCommercialUserForApi();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const parsed = schema.safeParse((await req.json().catch(() => ({}))) ?? {});
  await markNotificationsRead(user.id, parsed.success ? parsed.data.id : undefined);
  return NextResponse.json({ ok: true });
}
