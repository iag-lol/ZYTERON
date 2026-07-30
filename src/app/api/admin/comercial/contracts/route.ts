import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { CONTRACT_TYPES, MAX_COMMISSION_PCT } from "@/config/contracts";
import { recordAudit } from "@/lib/commercial/audit";
import { getContractContext, saveDraft } from "@/lib/commercial/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Configuración contractual que el administrador puede ajustar. */
export const contractConfigSchema = z.object({
  contractType: z.enum(CONTRACT_TYPES),
  city: z.string().trim().min(2).max(80),
  contractDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha del contrato inválida."),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  functionalRole: z.string().trim().min(3).max(120),
  commissionPercentage: z.number().min(0).max(MAX_COMMISSION_PCT),
  commissionBase: z.string().trim().min(3).max(300),
  noticeDays: z.number().int().min(0).max(365),
  commissionTailDays: z.number().int().min(0).max(730),
  validity: z.string().trim().min(3).max(120),
  signatureMethod: z.string().trim().max(120),
  corporateEmail: z.string().trim().max(160).optional().or(z.literal("")),
  includeBankAnnex: z.boolean(),
  observations: z.string().trim().max(2000).optional().or(z.literal("")),
  representativeName: z.string().trim().min(3).max(140),
  representativeRut: z.string().trim().min(3).max(20),
});

export function normalizeConfig(input: z.infer<typeof contractConfigSchema>) {
  return {
    ...input,
    startDate: input.startDate || input.contractDate,
    corporateEmail: input.corporateEmail || "",
    observations: input.observations || "",
  };
}

/** Contexto completo de la sección "Contrato y documentación" de una ficha. */
export async function GET(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;

  const ownerId = new URL(req.url).searchParams.get("ownerId");
  if (!ownerId) return NextResponse.json({ error: "Indica el ejecutivo." }, { status: 400 });

  let context;
  try {
    context = await getContractContext(ownerId);
  } catch (cause) {
    // Tablas sin migrar o Supabase mal configurado: se informa en pantalla en
    // vez de dejar caer un 500 sin explicación.
    return NextResponse.json(
      {
        error:
          cause instanceof Error
            ? `No se pudo cargar la sección de contrato: ${cause.message}`
            : "No se pudo cargar la sección de contrato.",
      },
      { status: 503 },
    );
  }
  if (!context) return NextResponse.json({ error: "Usuario comercial no encontrado." }, { status: 404 });

  const actor = "session" in auth ? auth.session.user.id : "legacy-admin";
  await recordAudit({
    actorId: actor,
    entity: "contract",
    entityId: context.active?.id ?? null,
    entityLabel: context.user.name,
    action: "form_opened",
    summary: `Se abrió la sección de contrato de ${context.user.name}.`,
    ownerId,
  });

  return NextResponse.json(context);
}

const draftSchema = z.object({
  ownerId: z.string().uuid(),
  config: contractConfigSchema,
});

/** Crea o actualiza el borrador con la configuración revisada. */
export async function POST(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;

  const parsed = draftSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }

  const actor = { id: "session" in auth ? auth.session.user.id : "legacy-admin" };
  const result = await saveDraft(actor, parsed.data.ownerId, normalizeConfig(parsed.data.config));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, id: result.id });
}
