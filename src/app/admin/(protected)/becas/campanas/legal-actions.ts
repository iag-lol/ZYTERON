"use server";

import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import { revalidatePath } from "next/cache";

export async function getLegalVersions(campaignId: string) {
  const supabase = getBecasSupabaseClient();
  const { data, error } = await supabase
    .from("scholarship_legal_versions")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data || [];
}

export async function saveLegalDraft({
  campaignId,
  documentType,
  versionNumber,
  title,
  contentMarkdown,
}: {
  campaignId: string;
  documentType: string;
  versionNumber: string;
  title: string;
  contentMarkdown: string;
}) {
  const supabase = getBecasSupabaseClient();

  // Check if version already exists
  const { data: existing } = await supabase
    .from("scholarship_legal_versions")
    .select("id, published_at")
    .eq("campaign_id", campaignId)
    .eq("document_type", documentType)
    .eq("version_number", versionNumber)
    .maybeSingle();

  if (existing && existing.published_at) {
    throw new Error("Una versión publicada no puede ser editada directamente. Cree un nuevo número de versión.");
  }

  const payload = {
    campaign_id: campaignId,
    document_type: documentType,
    version_number: versionNumber,
    title,
    content_markdown: contentMarkdown,
    updated_at: new Date().toISOString(),
  };

  let errorMsg = null;
  if (existing) {
    const { error } = await supabase
      .from("scholarship_legal_versions")
      .update(payload)
      .eq("id", existing.id);
    if (error) errorMsg = error.message;
  } else {
    const { error } = await supabase
      .from("scholarship_legal_versions")
      .insert(payload);
    if (error) errorMsg = error.message;
  }

  if (errorMsg) {
    throw new Error(errorMsg);
  }

  revalidatePath(`/admin/becas/campanas/${campaignId}/legal`);
  revalidatePath("/becas-web-pyme/bases");
  revalidatePath("/becas-web-pyme/privacidad");
  return { success: true };
}

export async function publishLegalVersion({
  versionId,
  campaignId,
  documentType,
  updateSummary,
}: {
  versionId: string;
  campaignId: string;
  documentType: string;
  updateSummary?: string;
}) {
  const supabase = getBecasSupabaseClient();

  // Check if campaign has already received applications
  const { count } = await supabase
    .from("scholarship_applications")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  if ((count || 0) > 0 && !updateSummary) {
    throw new Error("La campaña ya tiene postulantes. Debe ingresar un resumen de cambios para registrar en la auditoría y avisar públicamente.");
  }

  // 1. Mark all other versions of this type as is_current = false
  await supabase
    .from("scholarship_legal_versions")
    .update({ is_current: false })
    .eq("campaign_id", campaignId)
    .eq("document_type", documentType);

  // 2. Mark this version as published and current
  const now = new Date().toISOString();
  const { error: pubError, data: publishedDoc } = await supabase
    .from("scholarship_legal_versions")
    .update({
      is_current: true,
      published_at: now,
      effective_from: now,
      updated_at: now,
    })
    .eq("id", versionId)
    .select("*")
    .single();

  if (pubError) {
    throw new Error(pubError.message);
  }

  // 3. Update scholarship_campaigns with current reference and legal text
  const updateFieldMap: Record<string, string> = {
    terms: "current_terms_version_id",
    privacy: "current_privacy_version_id",
    gallery_terms: "current_gallery_terms_version_id",
    winner_agreement: "current_winner_agreement_version_id",
  };

  const contentFieldMap: Record<string, string> = {
    terms: "terms_content",
    privacy: "privacy_content",
    gallery_terms: "public_gallery_terms_content",
  };

  const versionStringFieldMap: Record<string, string> = {
    terms: "terms_version",
    privacy: "privacy_version",
  };

  const campUpdate: Record<string, any> = {
    [updateFieldMap[documentType]]: versionId,
    legal_documents_published_at: now,
    last_legal_update_at: now,
  };

  if (contentFieldMap[documentType] && publishedDoc) {
    campUpdate[contentFieldMap[documentType]] = publishedDoc.content_markdown;
  }

  if (versionStringFieldMap[documentType] && publishedDoc) {
    campUpdate[versionStringFieldMap[documentType]] = publishedDoc.version_number;
  }

  if (updateSummary) {
    campUpdate.legal_update_summary = updateSummary;
  }

  await supabase
    .from("scholarship_campaigns")
    .update(campUpdate)
    .eq("id", campaignId);

  // 4. Record audit log
  await supabase.from("scholarship_audit_logs").insert({
    action_type: "PUBLISH_LEGAL_VERSION",
    entity_type: "scholarship_legal_versions",
    entity_id: versionId,
    campaign_id: campaignId,
    metadata: {
      document_type: documentType,
      version_number: publishedDoc?.version_number,
      summary: updateSummary || "Publicación inicial de documento legal",
      applications_count_at_publish: count || 0,
    },
  });

  revalidatePath(`/admin/becas/campanas/${campaignId}/legal`);
  revalidatePath("/becas-web-pyme");
  revalidatePath("/becas-web-pyme/bases");
  revalidatePath("/becas-web-pyme/privacidad");
  return { success: true };
}
