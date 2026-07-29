import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { createCommission, listCommissions } from "@/lib/commercial/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const url = new URL(req.url);
  const commissions = await listCommissions({
    ownerId: url.searchParams.get("ownerId") || undefined,
    period: url.searchParams.get("period") || undefined,
    status: url.searchParams.get("status") || undefined,
  });
  return NextResponse.json({ commissions });
}

const schema = z.object({
  ownerId: z.string().uuid("Selecciona un ejecutivo válido."),
  clientName: z.string().trim().max(200).optional().or(z.literal("")),
  projectRef: z.string().trim().max(120).optional().or(z.literal("")),
  concept: z.string().trim().max(200).optional().or(z.literal("")),
  leadId: z.string().uuid().optional().or(z.literal("")),
  baseAmount: z.number().int().min(0, "La base debe ser un monto positivo."),
  percentage: z.number().min(0).max(100),
  period: z.string().regex(/^\d{4}-\d{2}$/, "El periodo debe tener formato AAAA-MM."),
  status: z.enum(["pending", "approved"]).optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Datos inválidos." },
      { status: 400 },
    );
  }
  const actor = { id: "session" in auth ? auth.session.user.id : "legacy-admin" };
  const result = await createCommission(actor, {
    ...parsed.data,
    clientName: parsed.data.clientName || null,
    projectRef: parsed.data.projectRef || null,
    concept: parsed.data.concept || null,
    leadId: parsed.data.leadId || null,
    notes: parsed.data.notes || null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, id: result.id });
}
