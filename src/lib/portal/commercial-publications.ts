import "server-only";
import type { Prisma } from "@prisma/client";
export async function scopedCommercial(db: Prisma.TransactionClient) {
  const [quotes, invoices, plans] = await Promise.all([
    db.$queryRaw<
      Array<{
        id: string;
        quote_number: string;
        company_name: string;
        status: string;
        currency: string;
        total_amount: number;
        created_at: Date;
        billing_type: string | null;
        document_id: string | null;
      }>
    >`SELECT id,quote_number,company_name,status,currency,total_amount,created_at,billing_type,document_id FROM quotes ORDER BY created_at DESC LIMIT 200`,
    db.$queryRaw<
      Array<{
        id: string;
        invoice_number: string;
        description: string | null;
        currency: string;
        total_amount: number;
        balance_due: number;
        issue_date: Date | null;
        due_date: Date | null;
      }>
    >`SELECT id,invoice_number,description,currency,total_amount,balance_due,issue_date,due_date FROM invoices ORDER BY issue_date DESC NULLS LAST`,
    db.$queryRaw<
      Array<{
        quote_id: string;
        label: string;
        amount: number;
        next_due: string;
        anchor_date: string;
        status: string;
        created_at: Date;
      }>
    >`SELECT quote_id,label,amount,next_due::text,anchor_date::text,status,created_at FROM zyteron_monthly_plans ORDER BY created_at DESC LIMIT 100`,
  ]);
  return { quotes, invoices, plans };
}
export { nativeProposalVisible } from "./quote-visibility";
export async function canonicalProposalFile(userId: string, quoteId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(quoteId)) return null;
  const { clientDatabase } = await import("./scoped-db");
  const [quote] = await clientDatabase(
    userId,
    (db) =>
      db.$queryRaw<
        Array<{ document_id: string | null }>
      >`SELECT document_id FROM quotes WHERE id=${quoteId}::uuid`,
  );
  if (!quote?.document_id) return null;
  const { prisma } = await import("@/lib/prisma");
  // The sent proposal grants access to its own issued PDF, including a document not listed separately.
  const [file] = await prisma.$queryRaw<
    Array<{ filename: string; storage_path: string }>
  >`SELECT v.filename,v.storage_path FROM documents d JOIN document_versions v ON v.id=d.current_version_id WHERE d.id=${quote.document_id}::uuid AND d.classification IN ('PUBLIC','CLIENT') AND d.status NOT IN ('ARCHIVED','TRASHED','QUARANTINED','CANCELLED') AND v.status='AVAILABLE' AND v.mime_type='application/pdf' AND v.malware_status NOT IN ('INFECTED','SUSPICIOUS','SCAN_FAILED','PENDING')`;
  return file || null;
}
