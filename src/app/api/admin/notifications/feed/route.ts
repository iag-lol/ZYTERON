import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { prisma } from "@/lib/prisma";
import type { ContactEvent } from "@/lib/notifications/contact-format";
export async function GET() {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  try {
    const rows = await prisma.$queryRaw<
      Array<{ event_key: string; payload: ContactEvent; created_at: string }>
    >`SELECT event_key,payload,created_at FROM zyteron_contact_events ORDER BY created_at DESC LIMIT 30`;
    return NextResponse.json(
      {
        items: rows.map((r) => ({
          id: r.event_key,
          title: r.payload.title,
          body: r.payload.body,
          name: r.payload.name,
          href: r.payload.href,
          createdAt: r.created_at,
          kind: r.payload.kind,
        })),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "No fue posible cargar los contactos." }, { status: 503 });
  }
}
