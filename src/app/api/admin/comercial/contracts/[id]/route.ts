import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import {
  closeContract,
  createNewVersion,
  getContract,
  issueContract,
  listEmailLogs,
  markReceived,
  reviewSignature,
} from "@/lib/commercial/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const contract = await getContract(id);
  if (!contract) return NextResponse.json({ error: "Contrato no encontrado." }, { status: 404 });
  return NextResponse.json({ contract, emails: await listEmailLogs(id) });
}

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("issue") }),
  z.object({ action: z.literal("received") }),
  z.object({ action: z.literal("version"), reason: z.string().trim().min(3, "Indica el motivo de la nueva versión.") }),
  z.object({ action: z.literal("cancel"), reason: z.string().trim().min(3, "Indica el motivo de la anulación.") }),
  z.object({ action: z.literal("terminate"), reason: z.string().trim().min(3, "Indica el motivo del término.") }),
  z.object({ action: z.literal("validate") }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(3, "Indica qué debe corregirse.") }),
]);

/** Acciones sobre el documento. Cada una respeta el estado actual. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Acción inválida." }, { status: 400 });
  }

  const actor = { id: "session" in auth ? auth.session.user.id : "legacy-admin" };
  const body = parsed.data;

  const result =
    body.action === "issue"
      ? await issueContract(actor, id)
      : body.action === "received"
        ? await markReceived(actor, id)
        : body.action === "version"
          ? await createNewVersion(actor, id, body.reason)
          : body.action === "cancel"
            ? await closeContract(actor, id, "cancel", body.reason)
            : body.action === "terminate"
              ? await closeContract(actor, id, "terminate", body.reason)
              : body.action === "validate"
                ? await reviewSignature(actor, id, "validate")
                : await reviewSignature(actor, id, "reject", body.reason);

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
