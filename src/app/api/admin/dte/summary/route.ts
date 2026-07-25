import { NextResponse } from "next/server";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { getDteSummary, listDteDocuments, listCaf, getCertificateStatus } from "@/lib/dte/dte-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  try {
    const [summary, documents, caf, certificate] = await Promise.all([
      getDteSummary(),
      listDteDocuments(150),
      listCaf(),
      getCertificateStatus(),
    ]);
    return NextResponse.json({ summary, documents, caf, certificate });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error", tablesMissing: true },
      { status: 200 },
    );
  }
}
