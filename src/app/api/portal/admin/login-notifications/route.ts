import { NextResponse } from "next/server";
import { commercialAdmin } from "@/lib/full-control/commercial-api-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  const counts = await prisma.$queryRaw<Array<{ state: string; count: number }>>`
    SELECT state,count(*)::int AS count FROM public.zyteron_portal_login_notifications GROUP BY state`;
  const recent = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT n.id,n.user_id,u.name,u.company,n.occurred_at,n.recipient,n.provider,n.state,n.attempts,n.error_code,n.accepted_at
    FROM public.zyteron_portal_login_notifications n JOIN public."User" u ON u.id=n.user_id
    ORDER BY n.occurred_at DESC LIMIT 50`;
  return NextResponse.json(
    {
      recipient: "contacto@zyteron.cl",
      configured: Boolean(
        process.env.RESEND_API_KEY && (process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM),
      ),
      counts,
      recent,
    },
    { headers: { "Cache-Control": "private,no-store" } },
  );
}
