import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { deleteCommission, updateCommission } from "@/lib/commercial/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  status: z.enum(["pending", "approved", "paid", "adjusted"]).optional(),
  baseAmount: z.number().int().min(0).optional(),
  percentage: z.number().min(0).max(100).optional(),
  clientName: z.string().trim().max(200).optional().nullable(),
  projectRef: z.string().trim().max(120).optional().nullable(),
  concept: z.string().trim().max(200).optional().nullable(),
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Datos inválidos." },
      { status: 400 },
    );
  }
  const actor = { id: "session" in auth ? auth.session.user.id : "legacy-admin" };
  const result = await updateCommission(actor, id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const actor = { id: "session" in auth ? auth.session.user.id : "legacy-admin" };
  const result = await deleteCommission(actor, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
