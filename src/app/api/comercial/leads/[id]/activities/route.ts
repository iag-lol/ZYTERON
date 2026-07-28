import { NextResponse } from "next/server";
import { z } from "zod";
import { getCommercialUserForApi } from "@/lib/commercial/session";
import {
  addLeadActivity,
  COMMERCIAL_ACTIVITY_TYPES,
  COMMERCIAL_PROGRESS_STATUSES,
} from "@/lib/commercial/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  activityType: z.enum(COMMERCIAL_ACTIVITY_TYPES),
  outcome: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().min(3, "Describe brevemente el avance.").max(4000),
  progressStatus: z.enum(COMMERCIAL_PROGRESS_STATUSES),
  occurredAt: z.iso.datetime({ offset: true }).optional().or(z.literal("")),
  nextFollowUpAt: z.iso.datetime({ offset: true }).optional().or(z.literal("")),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCommercialUserForApi();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Datos inválidos." },
      { status: 400 },
    );
  }
  const result = await addLeadActivity(user.id, user.id, id, {
    ...parsed.data,
    occurredAt: parsed.data.occurredAt || null,
    nextFollowUpAt: parsed.data.nextFollowUpAt || null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
