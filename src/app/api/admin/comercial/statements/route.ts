import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { issueStatement, listStatements, previewStatement } from "@/lib/commercial/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  → lista de liquidaciones (filtrable).
 * GET ?preview=1&ownerId&period → simula qué quedaría incluido antes de emitir.
 * POST → emite la liquidación del periodo con las comisiones aprobadas.
 */
export async function GET(req: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const url = new URL(req.url);
  const ownerId = url.searchParams.get("ownerId") || undefined;
  const period = url.searchParams.get("period") || undefined;

  if (url.searchParams.get("preview") === "1") {
    if (!ownerId || !period) {
      return NextResponse.json({ error: "Indica ejecutivo y periodo." }, { status: 400 });
    }
    const preview = await previewStatement(ownerId, period);
    return NextResponse.json(preview);
  }

  const statements = await listStatements({
    ownerId,
    period,
    status: url.searchParams.get("status") || undefined,
  });
  return NextResponse.json({ statements });
}

const schema = z.object({
  ownerId: z.string().uuid("Selecciona un ejecutivo válido."),
  period: z.string().regex(/^\d{4}-\d{2}$/, "El periodo debe tener formato AAAA-MM."),
  retentionPct: z.number().min(0).max(50).optional(),
  adjustments: z.number().int().optional(),
  adjustmentsNote: z.string().trim().max(500).optional().or(z.literal("")),
  folio: z.string().trim().max(60).optional().or(z.literal("")),
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
  const result = await issueStatement(actor, {
    ...parsed.data,
    adjustmentsNote: parsed.data.adjustmentsNote || null,
    folio: parsed.data.folio || null,
    notes: parsed.data.notes || null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, id: result.id });
}
