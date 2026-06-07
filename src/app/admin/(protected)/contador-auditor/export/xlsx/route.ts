import { NextResponse } from "next/server";
import { buildAccountingWorkbook } from "@/lib/admin/accounting-export";
import { getAccountingDashboardData } from "@/lib/admin/accounting";

function normalizePeriod(value?: string | null) {
  const candidate = String(value || "").trim();
  return /^[0-9]{4}-[0-9]{2}$/.test(candidate) ? candidate : "";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = normalizePeriod(url.searchParams.get("period")) || undefined;
  const data = await getAccountingDashboardData(period);
  const workbook = buildAccountingWorkbook(data);
  const fileName = `contador-auditor-${data.selectedPeriod}.xlsx`;

  return new NextResponse(workbook, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
