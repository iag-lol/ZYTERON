import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { connectedPortalSnapshot } from "@/lib/client-experience/snapshot";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  const session = await getServerSession(portalAuthOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "No autenticado." }, { status: 401, headers });
  try {
    const data = await connectedPortalSnapshot(session.user.id);
    return NextResponse.json({ monitors: data.monitors }, { headers });
  } catch {
    return NextResponse.json(
      { error: "No se pudo consultar el monitoreo." },
      { status: 503, headers },
    );
  }
}
