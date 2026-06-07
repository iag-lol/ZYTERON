import { NextResponse } from "next/server";
import { getAccountingDashboardData } from "@/lib/admin/accounting";
import { generateAccountingPdfReport } from "@/lib/admin/accounting-pdf";

function normalizePeriod(value?: string | null) {
  const candidate = String(value || "").trim();
  return /^[0-9]{4}-[0-9]{2}$/.test(candidate) ? candidate : "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = normalizePeriod(url.searchParams.get("period")) || undefined;
  const data = await getAccountingDashboardData(period);
  const pdfBytes = await generateAccountingPdfReport(data);
  const pdfBody = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
  const fileName = `contador-auditor-${data.selectedPeriod}.pdf`;

  return new NextResponse(pdfBody, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
