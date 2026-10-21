import { NextResponse } from "next/server";
import { commercialAdmin } from "@/lib/full-control/commercial-api-guard";
import { setupZyteronTemplates } from "@/lib/whatsapp/templates";
export async function POST(req: Request) {
  const auth = await commercialAdmin(req);
  if (auth.error) return auth.error;
  try {
    return NextResponse.json({ templates: await setupZyteronTemplates() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "META_UNAVAILABLE" },
      { status: 503 },
    );
  }
}
