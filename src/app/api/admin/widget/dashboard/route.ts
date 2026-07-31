import { NextResponse } from "next/server";
import { buildWidgetDashboardSnapshot } from "@/lib/widget/dashboard";
import { verifyWidgetSession, widgetBearerToken } from "@/lib/widget/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!verifyWidgetSession(widgetBearerToken(req))) {
    return NextResponse.json(
      { error: "Sesión vencida. Abre Zyteron Widget para iniciar sesión nuevamente." },
      { status: 401, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }

  try {
    return NextResponse.json(await buildWidgetDashboardSnapshot(), {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[widget] dashboard error:", error);
    return NextResponse.json(
      { error: "No fue posible actualizar el widget en este momento." },
      { status: 503, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }
}
