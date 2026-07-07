"use server";

import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function saveCampaign(formData: FormData) {
  const supabase = getBecasSupabaseClient();
  
  const id = formData.get("id")?.toString();
  const status = formData.get("status")?.toString() || "draft";
  
  const parseJSONField = (val?: string) => {
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch {
      // If not JSON, split by newline and return array of non-empty trimmed lines
      return val.split("\n").map(s => s.trim()).filter(Boolean);
    }
  };

  const payload: Record<string, any> = {
    title: formData.get("title")?.toString() || "",
    slug: formData.get("slug")?.toString() || "",
    subtitle: formData.get("subtitle")?.toString() || null,
    description: formData.get("description")?.toString() || null,
    status: status,
    starts_at: formData.get("starts_at")?.toString() || null,
    ends_at: formData.get("ends_at")?.toString() || null,
    selection_starts_at: formData.get("selection_starts_at")?.toString() || null,
    announcement_at: formData.get("announcement_at")?.toString() || null,
    winner_acceptance_deadline_at: formData.get("winner_acceptance_deadline_at")?.toString() || null,
    delivery_deadline_description: formData.get("delivery_deadline_description")?.toString() || null,
    official_instagram_handle: formData.get("official_instagram_handle")?.toString() || null,
    organizer_legal_name: formData.get("organizer_legal_name")?.toString() || null,
    organizer_rut: formData.get("organizer_rut")?.toString() || null,
    organizer_address: formData.get("organizer_address")?.toString() || null,
    organizer_contact_email: formData.get("organizer_contact_email")?.toString() || null,
    privacy_contact_email: formData.get("privacy_contact_email")?.toString() || null,
    benefit_title: formData.get("benefit_title")?.toString() || null,
    benefit_description: formData.get("benefit_description")?.toString() || null,
    benefit_value_clp: parseInt(formData.get("benefit_value_clp")?.toString() || "0"),
    benefits_quantity: parseInt(formData.get("benefits_quantity")?.toString() || "1"),
    included_items: parseJSONField(formData.get("included_items")?.toString()),
    excluded_items: parseJSONField(formData.get("excluded_items")?.toString()),
    instagram_disclaimer: formData.get("instagram_disclaimer")?.toString() || null,
    selection_criteria: parseJSONField(formData.get("selection_criteria")?.toString()),
  };

  // STRICT VALIDATION FOR ACTIVE STATUS
  if (status === "active") {
    const requiredTexts = [
      "title", "slug", "starts_at", "ends_at", "selection_starts_at",
      "announcement_at", "official_instagram_handle", "organizer_legal_name",
      "organizer_rut", "organizer_address", "organizer_contact_email",
      "privacy_contact_email", "benefit_title"
    ];

    for (const field of requiredTexts) {
      if (!payload[field] || payload[field].toString().trim() === "") {
        throw new Error(`No se puede activar la campaña: Falta completar el campo obligatorio "${field}". Revise la pestaña de configuración legal y requisitos.`);
      }
    }

    if (!payload.benefit_value_clp || payload.benefit_value_clp <= 0) {
      throw new Error("No se puede activar la campaña: El valor referencial del beneficio en CLP debe ser mayor a 0.");
    }

    if (!payload.benefits_quantity || payload.benefits_quantity <= 0) {
      throw new Error("No se puede activar la campaña: La cantidad de beneficios debe ser al menos 1.");
    }

    if (!payload.included_items || !Array.isArray(payload.included_items) || payload.included_items.length === 0) {
      throw new Error("No se puede activar la campaña: Debe especificar al menos un elemento incluido en el beneficio.");
    }

    if (!payload.excluded_items || !Array.isArray(payload.excluded_items) || payload.excluded_items.length === 0) {
      throw new Error("No se puede activar la campaña: Debe especificar al menos un elemento excluido en el beneficio.");
    }

    // Check if legal documents are published in database (or present in payload if we allow direct inline terms)
    if (id) {
      const { data: existingCamp } = await supabase
        .from("scholarship_campaigns")
        .select("terms_version, privacy_version, terms_content, privacy_content, public_gallery_terms_content")
        .eq("id", id)
        .single();

      const hasTerms = existingCamp?.terms_version || existingCamp?.terms_content;
      const hasPrivacy = existingCamp?.privacy_version || existingCamp?.privacy_content;
      const hasGallery = existingCamp?.public_gallery_terms_content;

      if (!hasTerms || !hasPrivacy || !hasGallery) {
        throw new Error("No se puede activar la campaña: Debe publicar primero las Bases Oficiales, Política de Privacidad y Condiciones de Vitrina en la pestaña Legal.");
      }
    } else {
      throw new Error("No se puede activar una campaña nueva sin antes guardarla como borrador y publicar sus bases oficiales y política de privacidad en la pestaña Legal.");
    }
  }

  let errorMsg = null;

  if (id) {
    const { error } = await supabase.from("scholarship_campaigns").update(payload).eq("id", id);
    if (error) errorMsg = error.message;
  } else {
    const { error } = await supabase.from("scholarship_campaigns").insert(payload);
    if (error) errorMsg = error.message;
  }

  if (errorMsg) {
    throw new Error(errorMsg);
  }

  revalidatePath("/admin/becas/campanas");
  revalidatePath("/becas-web-pyme");
  redirect("/admin/becas/campanas");
}
