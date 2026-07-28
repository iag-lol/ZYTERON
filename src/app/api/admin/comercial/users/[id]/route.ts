import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { updateCommercialUser, resetCommercialPassword, deleteCommercialUser } from "@/lib/commercial/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(2).max(140).optional(),
  email: z.string().trim().max(160).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  role: z.enum(["executive", "portfolio", "partner"]).optional(),
  status: z.enum(["active", "suspended", "invited"]).optional(),
  commission_pct: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional().nullable(),
  newPassword: z.string().min(6).max(200).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const { newPassword, ...fields } = parsed.data;

  if (newPassword) {
    const r = await resetCommercialPassword(id, newPassword);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  }
  if (Object.keys(fields).length > 0) {
    const r = await updateCommercialUser(id, fields);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const r = await deleteCommercialUser(id);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
