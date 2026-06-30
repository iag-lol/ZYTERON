import { NextResponse } from "next/server";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import { z } from "zod";

const requestSchema = z.object({
  applicationCode: z.string().min(1),
  token: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = requestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { applicationCode, token } = result.data;
    const supabase = getBecasSupabaseClient();

    // Find the application by code
    const { data: application, error: fetchError } = await supabase
      .from("scholarship_applications")
      .select("id, status, withdrawal_token_hash, campaign_id")
      .eq("application_code", applicationCode)
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: "Postulación no encontrada" }, { status: 404 });
    }

    if (application.status === 'withdrawn') {
      return NextResponse.json({ error: "Esta postulación ya ha sido retirada" }, { status: 400 });
    }

    if (application.withdrawal_token_hash !== token) {
      // Intentionally vague error message for security
      return NextResponse.json({ error: "No autorizado para realizar esta acción" }, { status: 403 });
    }

    // Process withdrawal
    const { error: updateError } = await supabase
      .from("scholarship_applications")
      .update({
        status: 'withdrawn',
        public_gallery_consent: false,
        public_instagram_consent: false,
        marketing_consent: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", application.id);

    if (updateError) {
      console.error("Update error:", updateError);
      return NextResponse.json({ error: "No se pudo retirar la postulación" }, { status: 500 });
    }

    // Hide from public gallery if it existed
    await supabase
      .from("scholarship_public_profiles")
      .update({
        status: 'removed',
        removed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("application_id", application.id);

    // Record Audit Log
    await supabase.from("scholarship_audit_logs").insert({
      action_type: "application_withdrawn",
      entity_type: "scholarship_applications",
      entity_id: application.id,
      campaign_id: application.campaign_id,
      metadata: { reason: "User requested withdrawal via token" }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
