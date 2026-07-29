import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { buildEmailDraft, sendContractEmail } from "@/lib/commercial/contract-email";
import { getContract } from "@/lib/commercial/contracts";
import { getCommercialUserForAdmin } from "@/lib/commercial/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Datos con los que se abre el modal de envío (destinatario, asunto, cuerpo). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const contract = await getContract(id);
  if (!contract) return NextResponse.json({ error: "Contrato no encontrado." }, { status: 404 });
  const user = await getCommercialUserForAdmin(contract.owner_id);
  if (!user) return NextResponse.json({ error: "Usuario comercial no encontrado." }, { status: 404 });

  return NextResponse.json({ draft: buildEmailDraft(contract, { name: user.name, email: user.email }) });
}

const schema = z.object({
  recipient: z.string().trim().email("El correo del destinatario no es válido."),
  cc: z.string().trim().max(160).optional().or(z.literal("")),
  subject: z.string().trim().min(3).max(200),
  body: z.string().trim().min(20).max(20000),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }

  const actor = { id: "session" in auth ? auth.session.user.id : "legacy-admin" };
  const result = await sendContractEmail(actor, id, {
    recipient: parsed.data.recipient,
    cc: parsed.data.cc || null,
    subject: parsed.data.subject,
    body: parsed.data.body,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, messageId: result.messageId });
}
