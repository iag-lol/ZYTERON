import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/auth/portal-session";
import { clientDatabase } from "@/lib/portal/scoped-db";
export async function GET(req: Request) {
  const session = await getPortalSession();
  if (!session?.user.id) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 80) || "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  try {
    const [projects, documents] = await clientDatabase(session.user.id, (db) =>
      Promise.all([
        db.project.findMany({
          where: { clientId: session.user.id, title: { contains: q, mode: "insensitive" } },
          select: { id: true, title: true },
          take: 10,
        }),
        db.clientDocument.findMany({
          where: { userId: session.user.id, title: { contains: q, mode: "insensitive" } },
          select: { id: true, title: true, category: true },
          take: 10,
        }),
      ]),
    );
    return NextResponse.json(
      {
        results: [
          ...projects.map((p) => ({
            title: p.title,
            subtitle: "Proyecto",
            path: "/clientes/panel/proyectos",
          })),
          ...documents.map((d) => ({
            title: d.title,
            subtitle: d.category,
            path: "/clientes/panel/documentos",
          })),
        ],
      },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "No pudimos completar la búsqueda." }, { status: 503 });
  }
}
