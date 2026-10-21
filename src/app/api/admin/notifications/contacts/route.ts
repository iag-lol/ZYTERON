import { commercialAdmin } from "@/lib/full-control/commercial-api-guard";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { contactNotificationStatus } from "@/lib/notifications/contact-outbox";
import { verifyWhatsappAccount } from "@/lib/whatsapp/templates";
import { parseNotificationRecipients } from "@/lib/notifications/contact-format";
import { prisma } from "@/lib/prisma";
export async function GET() {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  try {
    return NextResponse.json(await contactNotificationStatus(), {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "No fue posible consultar las alertas." }, { status: 503 });
  }
}
const schema = z
  .object({
    emailRecipients: z.array(z.email()).max(10),
    whatsappRecipients: z.array(z.string().regex(/^\d{8,15}$/)).max(10),
    wabaId: z
      .string()
      .regex(/^\d{5,30}$/)
      .or(z.literal("")),
    template: z
      .string()
      .regex(/^[a-z0-9_]*$/)
      .max(512),
    language: z.string().regex(/^[a-z]{2}(?:_[A-Z]{2})?$/),
  })
  .strict();
export async function PUT(req: Request) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Revisa los correos y teléfonos con código de país." },
      { status: 400 },
    );
  try {
    const d = parsed.data;
    if (d.wabaId) await verifyWhatsappAccount(d.wabaId);
    await prisma.$executeRaw`UPDATE zyteron_contact_settings SET email_recipients=${parseNotificationRecipients(d.emailRecipients.join(","), "EMAIL")}::text[],whatsapp_recipients=${parseNotificationRecipients(d.whatsappRecipients.join(","), "WHATSAPP")}::text[],waba_id=${d.wabaId || null},whatsapp_template=${d.template || null},whatsapp_language=${d.language},updated_at=now() WHERE id=true`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar." },
      { status: 400 },
    );
  }
}
