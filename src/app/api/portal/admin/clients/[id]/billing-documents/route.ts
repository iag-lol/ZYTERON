import { NextResponse } from "next/server";
import { z } from "zod";
import { commercialAdmin } from "@/lib/full-control/commercial-api-guard";
import { prisma } from "@/lib/prisma";
import { billingTargetSchema, assertInvoicePdf } from "@/lib/payments/billing-document-policy";
import {
  assertBillingTarget,
  clientBillingDocuments,
  linkBillingDocument,
} from "@/lib/payments/billing-documents";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logPortalAdminAction } from "@/lib/portal/audit";

type Context = { params: Promise<{ id: string }> };
async function owner(context: Context) {
  const id = z.uuid().parse((await context.params).id);
  const [link] = await prisma.$queryRaw<
    Array<{ user_id: string }>
  >`SELECT user_id FROM zyteron_legacy_client_link WHERE client_id=${id}::uuid`;
  if (!link) throw Error("Este cliente todavía no tiene una cuenta de portal vinculada.");
  return link.user_id;
}
export async function GET(req: Request, context: Context) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  try {
    const userId = await owner(context);
    const target = billingTargetSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
    await assertBillingTarget(prisma, userId, target);
    const [files, available] = await Promise.all([
      clientBillingDocuments(prisma, userId),
      prisma.clientDocument.findMany({
        where: { userId, mimeType: "application/pdf", storagePath: { not: null } },
        select: { id: true, title: true, fileName: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return NextResponse.json(
      {
        userId,
        files: files.filter(
          (file) =>
            file.targetType === target.targetType &&
            file.targetSource === target.targetSource &&
            file.targetId === target.targetId,
        ),
        available,
      },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron consultar las facturas." },
      { status: 400 },
    );
  }
}
export async function POST(req: Request, context: Context) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  try {
    const userId = await owner(context);
    const body = billingTargetSchema
      .extend({ documentId: z.string().trim().min(1).max(100) })
      .parse(await req.json());
    await assertBillingTarget(prisma, userId, body);
    const file = await prisma.clientDocument.findFirst({
      where: {
        id: body.documentId,
        userId,
        mimeType: "application/pdf",
        storagePath: { not: null },
      },
    });
    if (!file?.storagePath)
      return NextResponse.json(
        { error: "Factura no encontrada para este cliente." },
        { status: 404 },
      );
    const { supabase } = createSupabaseServerClient();
    const downloaded = await supabase.storage.from("client-files").download(file.storagePath);
    if (downloaded.error || !downloaded.data)
      throw Error("No se pudo validar el archivo de la factura.");
    assertInvoicePdf(new Uint8Array(await downloaded.data.arrayBuffer()), file.mimeType || "");
    await linkBillingDocument(prisma, userId, file.id, body, auth.actorId);
    await logPortalAdminAction({
      actorId: auth.actorId,
      targetUserId: userId,
      action: "BILLING_DOCUMENT_LINK",
      entityType: "ClientDocument",
      entityId: file.id,
      details: {
        targetType: body.targetType,
        targetSource: body.targetSource,
        targetId: body.targetId,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo vincular la factura." },
      { status: 400 },
    );
  }
}
