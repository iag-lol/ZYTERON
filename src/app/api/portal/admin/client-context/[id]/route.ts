import { z } from "zod";
import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { prisma } from "@/lib/prisma";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return NextResponse.json({ error: "Cliente inválido." }, { status: 400 });
  const links = await prisma.$queryRaw<
    Array<{ user_id: string }>
  >`SELECT user_id FROM public.zyteron_legacy_client_link WHERE client_id=${id}::uuid`;
  const accounts = await prisma.user.findMany({
    where: { id: { in: links.map((l) => l.user_id) }, role: "CLIENT" },
    select: { id: true, name: true, email: true, accountStatus: true, emailVerifiedAt: true },
  });
  const messages = await prisma.clientCommunication.findMany({
    where: { userId: { in: accounts.map((a) => a.id) } },
    select: {
      id: true,
      userId: true,
      subject: true,
      message: true,
      direction: true,
      channel: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ accounts, messages }, { headers: { "cache-control": "no-store" } });
}
