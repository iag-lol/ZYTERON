import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { listInbox } from "@/lib/inbox/store";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;
  const p = new URL(req.url).searchParams;
  const offset = Number(p.get("offset") || 0),
    limit = Number(p.get("limit") || 50),
    filter = p.get("filter") || "all",
    q = p.get("q") || "";
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 500 ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 10000 ||
    q.length > 160 ||
    !["all", "web", "unread", "waiting", "ai"].includes(filter)
  )
    return NextResponse.json({ error: "Consulta inválida." }, { status: 400 });
  try {
    return NextResponse.json(
      await listInbox(auth.session.user.id, q.trim(), filter, offset, limit),
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    console.error("[inbox/list]", error);
    return NextResponse.json(
      { error: "No fue posible cargar las conversaciones. Vuelve a intentar." },
      { status: 503 },
    );
  }
}
