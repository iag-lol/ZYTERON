import { NextResponse } from "next/server";
import { z } from "zod";
import { getCommercialUserForApi } from "@/lib/commercial/session";
import { ACTIVITY_INFO, PROGRESS_INFO } from "@/config/commercial";
import { recordAudit } from "@/lib/commercial/audit";
import {
  addLeadActivity,
  COMMERCIAL_ACTIVITY_TYPES,
  COMMERCIAL_PROGRESS_STATUSES,
  getLeadByOwner,
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
  const lead = await getLeadByOwner(user.id, id);
  const result = await addLeadActivity(user.id, user.id, id, {
    ...parsed.data,
    occurredAt: parsed.data.occurredAt || null,
    nextFollowUpAt: parsed.data.nextFollowUpAt || null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  await recordAudit({
    actorType: "commercial",
    actorId: user.id,
    actorName: user.name,
    entity: "lead",
    entityId: id,
    entityLabel: lead?.name ?? id,
    action: "activity_logged",
    summary: `${user.name} informó ${ACTIVITY_INFO[parsed.data.activityType]?.label.toLocaleLowerCase("es") ?? parsed.data.activityType} en "${lead?.name ?? "un contacto"}" → ${PROGRESS_INFO[parsed.data.progressStatus]?.label ?? parsed.data.progressStatus}.`,
    meta: { from: lead?.commercial_status ?? null, to: parsed.data.progressStatus },
    ownerId: user.id,
  });
  return NextResponse.json({ ok: true });
}
