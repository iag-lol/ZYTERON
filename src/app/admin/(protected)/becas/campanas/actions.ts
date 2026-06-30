"use server";

import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function saveCampaign(formData: FormData) {
  const supabase = getBecasSupabaseClient();
  
  const id = formData.get("id")?.toString();
  
  const payload = {
    title: formData.get("title")?.toString() || "",
    slug: formData.get("slug")?.toString() || "",
    subtitle: formData.get("subtitle")?.toString() || null,
    description: formData.get("description")?.toString() || null,
    status: formData.get("status")?.toString() || "draft",
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
  };

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
