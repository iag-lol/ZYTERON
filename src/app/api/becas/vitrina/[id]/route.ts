import { NextRequest, NextResponse } from "next/server";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";

const ALLOWED_STATUSES = ["published", "hidden", "removed"] as const;
type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { status } = body as { status?: string };

  if (!status || !ALLOWED_STATUSES.includes(status as AllowedStatus)) {
    return NextResponse.json(
      { error: `Estado inválido. Valores permitidos: ${ALLOWED_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const supabase = getBecasSupabaseClient();

  const update: Record<string, unknown> = { status };
  if (status === "published") {
    update.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("scholarship_public_profiles")
    .update(update)
    .eq("id", id);

  if (error) {
    console.error("[vitrina PATCH]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status });
}
