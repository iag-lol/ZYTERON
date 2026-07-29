import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { recordAudit, notifyCommercialUser } from "@/lib/commercial/audit";
import { listCommercialUsers, createCommercialUser } from "@/lib/commercial/store";
import { ROLE_INFO } from "@/config/commercial";

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
  position: z.string().trim().max(120).optional().or(z.literal("")),
  contractType: z.enum(["honorarios", "colaborador", "partner"]).optional().or(z.literal("")),
  startedAt: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  goalMonthlyLeads: z.number().int().min(0).max(1000).optional(),
  goalMonthlyWon: z.number().int().min(0).max(1000).optional(),
  goalMonthlyAmount: z.number().int().min(0).optional(),
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
    position: parsed.data.position || null,
    contractType: parsed.data.contractType || null,
    startedAt: parsed.data.startedAt || null,
    goalMonthlyLeads: parsed.data.goalMonthlyLeads,
    goalMonthlyWon: parsed.data.goalMonthlyWon,
    goalMonthlyAmount: parsed.data.goalMonthlyAmount,
    createdBy: actor,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  await recordAudit({
    actorId: actor,
    entity: "user",
    entityId: result.id,
    entityLabel: parsed.data.name,
    action: "created",
    summary: `Se creó el acceso de ${parsed.data.name} (${ROLE_INFO[parsed.data.role]?.label ?? parsed.data.role}) con ${parsed.data.commissionPct ?? 0}% de comisión.`,
    meta: { rut: parsed.data.rut, role: parsed.data.role },
    ownerId: result.id,
  });
  await notifyCommercialUser({
    ownerId: result.id as string,
    kind: "info",
    title: "Bienvenido al portal comercial de Zyteron",
    body: "Cambia tu contraseña inicial, completa tu ficha personal y revisa el Centro de conocimiento antes de comenzar a prospectar.",
    link: "/portal-comercial/perfil",
  });
  return NextResponse.json({ ok: true, id: result.id });
}
