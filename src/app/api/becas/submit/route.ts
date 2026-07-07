import { NextResponse } from "next/server";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import { scholarshipApplicationSchema } from "@/lib/becas/validation";
import crypto from "crypto";

// Utility to normalize inputs
function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeWhatsapp(phone: string) {
  // Remove all non-numeric characters
  const numeric = phone.replace(/\D/g, '');
  // If it starts with 56, keep it, else prepend it if it's Chilean (assumed 9 digits)
  if (numeric.length === 9) return `56${numeric}`;
  return numeric;
}

function normalizeInstagram(handle: string) {
  let normalized = handle.trim().toLowerCase();
  if (normalized.startsWith('@')) {
    normalized = normalized.substring(1);
  }
  // Extract handle if they pasted a URL
  if (normalized.includes('instagram.com/')) {
    const parts = normalized.split('instagram.com/');
    if (parts.length > 1) {
      normalized = parts[1].split('/')[0].split('?')[0];
    }
  }
  return normalized;
}

function generateApplicationCode() {
  const year = new Date().getFullYear();
  const randomStr = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 chars
  return `BWP-${year}-${randomStr.substring(0, 6)}`;
}

function buildSafeLogoFileName(fileName: string, mimeType: string) {
  const cleanedBase = fileName
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  const extensionFromName = fileName.split(".").pop()?.toLowerCase();
  const extensionFromMime =
    mimeType === "image/png" ? "png" :
    mimeType === "image/webp" ? "webp" :
    "jpg";
  const extension = extensionFromName && ["jpg", "jpeg", "png", "webp"].includes(extensionFromName)
    ? extensionFromName
    : extensionFromMime;

  return `${cleanedBase || "logo"}-${crypto.randomUUID()}.${extension}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = scholarshipApplicationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Datos de postulación inválidos", details: result.error.errors }, { status: 400 });
    }

    const data = result.data;

    // TODO: Verify Turnstile Token

    const supabase = getBecasSupabaseClient();

    // 1. Verify Campaign is Active
    const { data: campaign, error: campaignError } = await supabase
      .from("scholarship_campaigns")
      .select("status, terms_version, privacy_version")
      .eq("id", data.campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    }

    if (campaign.status !== "active") {
      return NextResponse.json({ error: "La campaña no está activa" }, { status: 403 });
    }

    // 2. Normalize Fields
    const emailNormalized = normalizeEmail(data.email);
    const whatsappNormalized = normalizeWhatsapp(data.whatsapp);
    const instagramNormalized = normalizeInstagram(data.instagramHandle);

    // 3. Check for duplicates
    // Using an OR query to find any duplicate in the same campaign
    const { data: duplicates, error: dupError } = await supabase
      .from("scholarship_applications")
      .select("id")
      .eq("campaign_id", data.campaignId)
      .or(`email_normalized.eq.${emailNormalized},whatsapp_normalized.eq.${whatsappNormalized},instagram_normalized.eq.${instagramNormalized}${data.businessRutExists && data.businessRut ? `,business_rut.eq.${data.businessRut}` : ''}`)
      .limit(1);

    if (dupError) {
      console.error("Duplicate check error:", dupError);
      return NextResponse.json({ error: "Error interno al verificar duplicados" }, { status: 500 });
    }

    if (duplicates && duplicates.length > 0) {
      return NextResponse.json({ error: "Ya existe una postulación con este correo, WhatsApp, Instagram o RUT para esta campaña." }, { status: 409 });
    }

    // 4. Move Logo from Temp to Final Path
    // The logo is currently at `campaigns/${campaignId}/temp/${fileName}`
    const finalLogoFileName = buildSafeLogoFileName(data.logoFileName, data.logoMimeType);
    const finalLogoPath = `campaigns/${data.campaignId}/applications/${crypto.randomUUID()}/${finalLogoFileName}`;
    
    const { error: moveError } = await supabase
      .storage
      .from("becas-web-pyme-assets")
      .move(data.logoStoragePath, finalLogoPath);

    if (moveError) {
      console.error("Storage move error:", moveError);
      return NextResponse.json({ error: "No se pudo procesar el archivo subido. Por favor intenta de nuevo." }, { status: 500 });
    }

    // 5. Insert Application
    const applicationCode = generateApplicationCode();
    const withdrawalTokenHash = crypto.createHash('sha256').update(crypto.randomUUID()).digest('hex');

    const { data: application, error: insertError } = await supabase
      .from("scholarship_applications")
      .insert({
        campaign_id: data.campaignId,
        application_code: applicationCode,
        
        full_name: data.fullName,
        applicant_role: data.applicantRole,
        email: data.email,
        email_normalized: emailNormalized,
        whatsapp: data.whatsapp,
        whatsapp_normalized: whatsappNormalized,
        region: data.region,
        comuna: data.comuna,
        instagram_handle: data.instagramHandle,
        instagram_normalized: instagramNormalized,
        follows_official_instagram_declared: data.followsOfficialInstagramDeclared,
        
        business_name: data.businessName,
        business_type: data.businessType,
        business_rut_exists: data.businessRutExists,
        business_rut: data.businessRutExists ? data.businessRut : null,
        industry: data.industry,
        business_description: data.businessDescription,
        current_website: data.currentWebsite || null,
        social_facebook: data.socialFacebook || null,
        social_tiktok: data.socialTiktok || null,
        social_linkedin: data.socialLinkedin || null,
        current_catalog_url: data.currentCatalogUrl || null,
        website_goal: data.websiteGoal,
        
        scholarship_reason: data.scholarshipReason,
        products_services_description: data.productsServicesDescription,
        expected_result: data.expectedResult,
        project_material_status: data.projectMaterialStatus,
        additional_comment: data.additionalComment || null,
        
        logo_storage_path: finalLogoPath,
        logo_file_name: data.logoFileName,
        logo_mime_type: data.logoMimeType,
        logo_size_bytes: data.logoSizeBytes,
        logo_rights_confirmed: data.logoRightsConfirmed,
        
        terms_accepted: data.termsAccepted,
        terms_version_accepted: campaign.terms_version,
        terms_accepted_at: new Date().toISOString(),
        
        privacy_accepted: data.privacyAccepted,
        privacy_version_accepted: campaign.privacy_version,
        privacy_accepted_at: new Date().toISOString(),
        
        truthfulness_confirmed: data.truthfulnessConfirmed,
        truthfulness_confirmed_at: data.truthfulnessConfirmed ? new Date().toISOString() : null,
        winner_case_study_acknowledged: data.winnerCaseStudyAcknowledged,
        logo_rights_confirmed_at: data.logoRightsConfirmed ? new Date().toISOString() : null,
        instagram_confirmed_at: data.followsOfficialInstagramDeclared ? new Date().toISOString() : null,
        
        public_gallery_consent: data.publicGalleryConsent,
        public_gallery_consent_at: data.publicGalleryConsent ? new Date().toISOString() : null,
        public_description: data.publicDescription || null,
        public_instagram_consent: data.publicInstagramConsent,
        
        marketing_consent: data.marketingConsent,
        marketing_consent_at: data.marketingConsent ? new Date().toISOString() : null,
        
        withdrawal_token_hash: withdrawalTokenHash,
      })
      .select("id")
      .single();

    if (insertError || !application) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: "No se pudo guardar la postulación" }, { status: 500 });
    }

    // 6. Record Audit Log with hashed IP
    const ipRaw = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const ipHash = crypto.createHash('sha256').update(ipRaw).digest('hex');

    await supabase.from("scholarship_audit_logs").insert({
      action_type: "application_submitted",
      entity_type: "scholarship_applications",
      entity_id: application.id,
      campaign_id: data.campaignId,
      metadata: { application_code: applicationCode, ip_hash: ipHash, terms_version: campaign.terms_version, privacy_version: campaign.privacy_version }
    });

    // 7. If public gallery consent is true, insert pending profile
    if (data.publicGalleryConsent) {
      await supabase.from("scholarship_public_profiles").insert({
        campaign_id: data.campaignId,
        application_id: application.id,
        business_name: data.businessName,
        industry: data.industry,
        region: data.region,
        comuna: data.comuna,
        public_description: data.publicDescription,
        public_instagram_handle: data.publicInstagramConsent ? data.instagramHandle : null,
        public_logo_path: finalLogoPath,
      });
    }

    // TODO: Send confirmation email via Resend or equivalent.
    // Ensure we do not send marketing if not authorized.

    return NextResponse.json({
      success: true,
      applicationCode,
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
