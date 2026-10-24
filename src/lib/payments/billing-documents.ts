import "server-only";
import type { Prisma } from "@prisma/client";
import type { BillingDocument, BillingTarget } from "./billing-document-policy";

export async function assertBillingTarget(
  db: Prisma.TransactionClient,
  userId: string,
  target: BillingTarget,
) {
  const [row] = await db.$queryRaw<
    Array<{ owned: boolean }>
  >`SELECT public.zyteron_billing_target_owned(${userId},${target.targetType},${target.targetSource},${target.targetId}) AS owned`;
  if (!row?.owned) throw new Error("El pago o cobro no pertenece a este cliente.");
}

export async function linkBillingDocument(
  db: Prisma.TransactionClient,
  userId: string,
  documentId: string,
  target: BillingTarget,
  actorId: string | null,
) {
  await db.$executeRaw`INSERT INTO public.zyteron_billing_documents(document_id,user_id,target_type,target_source,target_id,created_by) VALUES(${documentId},${userId},${target.targetType},${target.targetSource},${target.targetId},${actorId}) ON CONFLICT(document_id,target_type,target_source,target_id) DO NOTHING`;
}

export async function clientBillingDocuments(
  db: Prisma.TransactionClient,
  userId: string,
): Promise<BillingDocument[]> {
  const rows = await db.$queryRaw<
    Array<{
      id: string;
      document_id: string;
      target_type: BillingTarget["targetType"];
      target_source: BillingTarget["targetSource"];
      target_id: string;
      title: string;
      fileName: string | null;
      fileSize: number | null;
      createdAt: Date;
    }>
  >`SELECT l.id,l.document_id,l.target_type,l.target_source,l.target_id,d.title,d."fileName",d."fileSize",d."createdAt" FROM public.zyteron_billing_documents l JOIN public."ClientDocument" d ON d.id=l.document_id AND d."userId"=l.user_id WHERE l.user_id=${userId} AND d."mimeType"='application/pdf' AND d."storagePath" IS NOT NULL ORDER BY l.created_at DESC`;
  return rows.map((row) => ({
    id: row.id,
    documentId: row.document_id,
    targetType: row.target_type,
    targetSource: row.target_source,
    targetId: row.target_id,
    title: row.title,
    fileName: row.fileName || "factura.pdf",
    size: row.fileSize,
    uploadedAt: row.createdAt.toISOString(),
  }));
}
