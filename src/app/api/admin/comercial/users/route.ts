import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { listCommercialUsers, createCommercialUser } from "@/lib/commercial/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const users = await listCommercialUsers();
  return NextResponse.json({ users });
}

const schema = z.object({
  rut: z.string().min(3).max(20),
  name: z.string().trim().min(2).max(140),
  email: z.string().trim().email().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  role: z.enum(["executive", "portfolio", "partner"]),
  password: z.string().min(6).max(200),
  commissionPct: z.number().min(0).max(100).optional(),
});

export async function POST(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }
  const actor = "session" in auth ? auth.session.user.id : "legacy-admin";
  const result = await createCommercialUser({
    rut: parsed.data.rut,
    name: parsed.data.name,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    role: parsed.data.role,
    password: parsed.data.password,
    commissionPct: parsed.data.commissionPct,
    createdBy: actor,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, id: result.id });
}
