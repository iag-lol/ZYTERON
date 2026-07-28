import { NextResponse } from "next/server";
import { getCommercialUserForApi } from "@/lib/commercial/session";
import {
  getLeadByOwner,
  listLeadActivities,
  updateLeadByOwner,
} from "@/lib/commercial/store";
import { commercialLeadSchema } from "../route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCommercialUserForApi();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { id } = await ctx.params;
  const lead = await getLeadByOwner(user.id, id);
  if (!lead) return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
  const activities = await listLeadActivities(user.id, id);
  return NextResponse.json({ lead, activities });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCommercialUserForApi();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = commercialLeadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Datos inválidos." },
      { status: 400 },
    );
  }
  const result = await updateLeadByOwner(user.id, id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
