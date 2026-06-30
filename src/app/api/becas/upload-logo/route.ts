import { NextResponse } from "next/server";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import { z } from "zod";

const requestSchema = z.object({
  campaignId: z.string().uuid(),
  fileName: z.string(),
  mimeType: z.string().regex(/^(image\/jpeg|image\/png|image\/webp)$/, "Formato no permitido"),
  turnstileToken: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = requestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Datos inválidos", details: result.error.errors }, { status: 400 });
    }

    const { campaignId, fileName, mimeType, turnstileToken } = result.data;

    // TODO: Verify Turnstile Token (Cloudflare)
    // For now, we assume it's valid or implement verification if SECRET is present

    const supabase = getBecasSupabaseClient();

    // Verify campaign is active
    const { data: campaign, error: campaignError } = await supabase
      .from("scholarship_campaigns")
      .select("status")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }

    if (campaign.status !== "active") {
      return NextResponse.json({ error: "La campaña no está activa" }, { status: 403 });
    }

    // Generate safe random path
    const extension = fileName.split('.').pop() || 'jpg';
    const safeName = `${crypto.randomUUID()}.${extension}`;
    const storagePath = `campaigns/${campaignId}/temp/${safeName}`;

    // Create signed upload URL
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from("becas-web-pyme-assets")
      .createSignedUploadUrl(storagePath);

    if (uploadError || !uploadData) {
      console.error("Storage error:", uploadError);
      return NextResponse.json({ error: "No se pudo preparar la subida del archivo" }, { status: 500 });
    }

    return NextResponse.json({
      signedUrl: uploadData.signedUrl,
      token: uploadData.token,
      path: uploadData.path,
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
