import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { VALIDATION_INFO } from "@/config/commercial";
import { notifyCommercialUser, recordAudit } from "@/lib/commercial/audit";
import {
  COMMERCIAL_PROGRESS_STATUSES,
  COMMERCIAL_VALIDATION_STATUSES,
  evaluateCommercialLead,
  getCommercialLeadForAdmin,
} from "@/lib/commercial/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z
  .object({
    validationStatus: z.enum(COMMERCIAL_VALIDATION_STATUSES),
    adminNotes: z.string().trim().max(4000).optional().or(z.literal("")),
    commercialStatus: z.enum(COMMERCIAL_PROGRESS_STATUSES).optional(),
  })
  .refine(
    (data) =>
      !["rejected", "duplicate"].includes(data.validationStatus) ||
      Boolean(data.adminNotes?.trim()),
    { message: "Indica el motivo cuando el registro no califica o está duplicado." },
  );

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const result = await getCommercialLeadForAdmin(id);
  if (!result) return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
  return NextResponse.json(result);
}

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
  const actor = "session" in auth ? auth.session.user.id : "legacy-admin";
  const before = await getCommercialLeadForAdmin(id);
  const result = await evaluateCommercialLead(id, actor, {
    ...parsed.data,
    adminNotes: parsed.data.adminNotes || null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  if (before) {
    const label = VALIDATION_INFO[parsed.data.validationStatus]?.label ?? parsed.data.validationStatus;
    await recordAudit({
      actorId: actor,
      entity: "lead",
      entityId: id,
      entityLabel: before.lead.name,
      action: "evaluated",
      summary: `Registro "${before.lead.name}" clasificado como ${label}.`,
      meta: { from: before.lead.validation_status, to: parsed.data.validationStatus },
      ownerId: before.lead.owner_id,
    });
    if (parsed.data.validationStatus !== before.lead.validation_status) {
      await notifyCommercialUser({
        ownerId: before.lead.owner_id,
        kind: "evaluation",
        title: `${before.lead.name}: ${label}`,
        body:
          parsed.data.adminNotes?.trim() ||
          VALIDATION_INFO[parsed.data.validationStatus]?.description ||
          "Zyteron actualizó la evaluación de este registro.",
        link: "/portal-comercial/cartera",
      });
    }
  }
  return NextResponse.json({ ok: true });
}
