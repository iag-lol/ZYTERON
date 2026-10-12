import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { portalAuthOptions } from "@/lib/auth/portal-auth";
import { getScopedPortalDatabase } from "@/lib/portal/scoped-db";

export async function GET() {
  const session = await getServerSession(portalAuthOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const prisma = getScopedPortalDatabase(session.user.id);
  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.clientNotification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.clientNotification.count({
        where: { userId: session.user.id, isRead: false },
      }),
    ]);

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        type: n.type,
        link: n.link,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    });
  } catch (error) {
    void error;
    const message = "No se pudieron obtener las notificaciones.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
