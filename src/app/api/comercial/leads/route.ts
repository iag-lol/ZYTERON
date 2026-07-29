import { NextResponse } from "next/server";
import { z } from "zod";
import { getCommercialUserForApi } from "@/lib/commercial/session";
import { recordAudit } from "@/lib/commercial/audit";
import { listLeadsByOwner, createLead } from "@/lib/commercial/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCommercialUserForApi();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const leads = await listLeadsByOwner(user.id);
  return NextResponse.json({ leads });
}

export const commercialLeadSchema = z
  .object({
    kind: z.enum(["person", "company"]).default("person"),
    name: z.string().trim().min(2, "Ingresa el nombre o razón social.").max(200),
    rut: z.string().trim().max(20).optional().or(z.literal("")),
    contact_name: z.string().trim().max(140).optional().or(z.literal("")),
    email: z.string().trim().email("El correo no es válido.").max(160).optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    region: z.string().trim().max(80).optional().or(z.literal("")),
    comuna: z.string().trim().max(80).optional().or(z.literal("")),
    website: z.string().trim().max(200).optional().or(z.literal("")),
    industry: z.string().trim().max(120).optional().or(z.literal("")),
    service: z.string().trim().max(200).optional().or(z.literal("")),
    budget: z.string().trim().max(120).optional().or(z.literal("")),
    deadline: z.string().trim().max(120).optional().or(z.literal("")),
    interest: z.enum(["bajo", "medio", "alto"]).optional().or(z.literal("")),
    description: z.string().trim().max(4000).optional().or(z.literal("")),
    source: z.string().trim().max(120).optional().or(z.literal("")),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: "Ingresa al menos un correo o teléfono de contacto.",
  });

export async function POST(req: Request) {
  const user = await getCommercialUserForApi();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const parsed = commercialLeadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }

  const result = await createLead(user.id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  await recordAudit({
    actorType: "commercial",
    actorId: user.id,
    actorName: user.name,
    entity: "lead",
    entityId: result.id,
    entityLabel: parsed.data.name,
    action: "created",
    summary: `${user.name} registró el contacto "${parsed.data.name}" para evaluación.`,
    meta: { service: parsed.data.service || null, source: parsed.data.source || null },
    ownerId: user.id,
  });
  return NextResponse.json({ ok: true, id: result.id });
}
