import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { commercialDb } from "@/lib/commercial/store";
import { updateStatement } from "@/lib/commercial/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Detalle de una liquidación con las comisiones que la componen. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const { data: statement } = await commercialDb()
    .from("commercial_statements")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!statement) return NextResponse.json({ error: "Liquidación no encontrada." }, { status: 404 });
  const { data: commissions } = await commercialDb()
    .from("commercial_commissions")
    .select("*")
    .eq("statement_id", id)
    .order("created_at", { ascending: true });
  return NextResponse.json({ statement, commissions: commissions ?? [] });
}

const schema = z.object({
  status: z.enum(["draft", "issued", "paid", "cancelled"]).optional(),
  folio: z.string().trim().max(60).optional().nullable(),
  paymentMethod: z.string().trim().max(60).optional().nullable(),
  paymentReference: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  adjustments: z.number().int().optional(),
  adjustmentsNote: z.string().trim().max(500).optional().nullable(),
  retentionPct: z.number().min(0).max(50).optional(),
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
  const result = await updateStatement(actor, id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
