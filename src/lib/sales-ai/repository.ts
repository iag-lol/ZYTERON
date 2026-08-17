import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SALES_EVENT_TYPES, type SalesCompany, type SalesEvent, type SalesPotential, type SalesStatus } from "./types";

/**
 * Acceso a datos del CRM comercial. Todo pasa por el service role en el
 * servidor: el navegador nunca consulta estas tablas directamente.
 */

// Las reglas puras de normalización viven en rules.ts para poder probarlas
// aisladamente. Se reexportan aquí para no romper importaciones existentes.
export {
  normalizeEmail,
  normalizeDomain,
  normalizeCompanyName,
  normalizeRut,
  normalizePhone,
} from "./rules";

import {
  normalizeDomain,
  normalizeEmail,
  normalizeCompanyName,
  normalizePhone,
  normalizeRut,
} from "./rules";

// ---------------------------------------------------------------------------
// Historial
// ---------------------------------------------------------------------------

export type LogEventInput = {
  companyId?: string | null;
  type: string;
  title: string;
  detail?: string | null;
  payload?: Record<string, unknown>;
  actor?: string;
  isAutomated?: boolean;
};

/** Registra en la línea de tiempo. Nunca lanza: el historial no debe cortar una operación. */
export async function logSalesEvent(input: LogEventInput): Promise<void> {
  try {
    const { supabase } = createSupabaseServerClient();
    await supabase.from("sales_events").insert({
      company_id: input.companyId ?? null,
      event_type: input.type,
      title: input.title,
      detail: input.detail ?? null,
      payload: input.payload ?? {},
      actor: input.actor ?? "SYSTEM",
      is_automated: input.isAutomated ?? true,
    });
  } catch {
    // best-effort
  }
}

export async function getCompanyTimeline(companyId: string, limit = 100): Promise<SalesEvent[]> {
  const { supabase } = createSupabaseServerClient();
  const { data } = await supabase
    .from("sales_events")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as SalesEvent[];
}

// ---------------------------------------------------------------------------
// Empresas
// ---------------------------------------------------------------------------

export type CompanyFilters = {
  status?: SalesStatus | "TODOS";
  potential?: SalesPotential | "TODOS";
  search?: string;
  limit?: number;
  offset?: number;
};

export async function listCompanies(filters: CompanyFilters = {}) {
  const { supabase } = createSupabaseServerClient();
  let query = supabase
    .from("sales_companies")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false });

  if (filters.status && filters.status !== "TODOS") query = query.eq("status", filters.status);
  if (filters.potential && filters.potential !== "TODOS") query = query.eq("potential", filters.potential);
  if (filters.search?.trim()) {
    const term = filters.search.trim();
    query = query.or(
      `name.ilike.%${term}%,primary_email.ilike.%${term}%,tax_id.ilike.%${term}%,contact_name.ilike.%${term}%`,
    );
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { companies: (data ?? []) as SalesCompany[], total: count ?? 0 };
}

export async function getCompany(id: string): Promise<SalesCompany | null> {
  const { supabase } = createSupabaseServerClient();
  const { data } = await supabase.from("sales_companies").select("*").eq("id", id).maybeSingle();
  return (data as SalesCompany) ?? null;
}

/**
 * Busca un duplicado por RUT, correo, dominio, teléfono y nombre normalizado,
 * en ese orden de confiabilidad. Es código puro, sin IA.
 */
export async function findDuplicate(candidate: {
  taxId?: string | null;
  email?: string | null;
  website?: string | null;
  phone?: string | null;
  name?: string | null;
}): Promise<{ company: SalesCompany; matchedBy: string } | null> {
  const { supabase } = createSupabaseServerClient();

  const rut = normalizeRut(candidate.taxId);
  if (rut) {
    const { data } = await supabase.from("sales_companies").select("*").eq("tax_id", rut).maybeSingle();
    if (data) return { company: data as SalesCompany, matchedBy: "RUT" };
  }

  const email = normalizeEmail(candidate.email);
  if (email) {
    const { data } = await supabase
      .from("sales_companies")
      .select("*")
      .ilike("primary_email", email)
      .maybeSingle();
    if (data) return { company: data as SalesCompany, matchedBy: "EMAIL" };
  }

  const domain = normalizeDomain(candidate.website, candidate.email);
  if (domain) {
    const { data } = await supabase
      .from("sales_companies")
      .select("*")
      .eq("website_domain", domain)
      .maybeSingle();
    if (data) return { company: data as SalesCompany, matchedBy: "DOMINIO" };
  }

  const phone = normalizePhone(candidate.phone);
  if (phone) {
    const { data } = await supabase
      .from("sales_companies")
      .select("*")
      .ilike("phone", `%${phone}%`)
      .maybeSingle();
    if (data) return { company: data as SalesCompany, matchedBy: "TELEFONO" };
  }

  const normalized = normalizeCompanyName(candidate.name);
  if (normalized.length > 3) {
    const { data } = await supabase
      .from("sales_companies")
      .select("*")
      .ilike("name", normalized)
      .maybeSingle();
    if (data) return { company: data as SalesCompany, matchedBy: "NOMBRE" };
  }

  return null;
}

export type CreateCompanyInput = Partial<SalesCompany> & { name: string };

export async function createCompany(
  input: CreateCompanyInput,
  options: { actor?: string; eventType?: string; eventTitle?: string } = {},
): Promise<SalesCompany> {
  const { supabase } = createSupabaseServerClient();

  const payload = {
    ...input,
    primary_email: normalizeEmail(input.primary_email),
    tax_id: normalizeRut(input.tax_id),
    website_domain: normalizeDomain(input.website, input.primary_email),
  };

  const { data, error } = await supabase.from("sales_companies").insert(payload).select("*").single();
  if (error) throw new Error(error.message);

  const company = data as SalesCompany;
  await logSalesEvent({
    companyId: company.id,
    type: options.eventType ?? SALES_EVENT_TYPES.COMPANY_CREATED,
    title: options.eventTitle ?? "Empresa creada",
    detail: `Origen: ${company.source ?? "MANUAL"}`,
    actor: options.actor ?? "SYSTEM",
    isAutomated: !options.actor,
  });

  return company;
}

export async function updateCompany(
  id: string,
  patch: Partial<SalesCompany>,
  options: { actor?: string; reason?: string } = {},
): Promise<SalesCompany> {
  const { supabase } = createSupabaseServerClient();
  const before = await getCompany(id);

  const payload: Record<string, unknown> = { ...patch };
  if ("primary_email" in patch) payload.primary_email = normalizeEmail(patch.primary_email);
  if ("tax_id" in patch) payload.tax_id = normalizeRut(patch.tax_id);
  if ("website" in patch) {
    payload.website_domain = normalizeDomain(patch.website, patch.primary_email ?? before?.primary_email);
  }

  const { data, error } = await supabase
    .from("sales_companies")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  const after = data as SalesCompany;

  // El historial distingue cambios de estado y de potencial porque son las
  // transiciones que después se auditan comercialmente.
  if (before && patch.status && before.status !== after.status) {
    await logSalesEvent({
      companyId: id,
      type: SALES_EVENT_TYPES.STATUS_CHANGED,
      title: `Estado: ${before.status} → ${after.status}`,
      detail: options.reason ?? null,
      actor: options.actor ?? "SYSTEM",
      isAutomated: !options.actor,
      payload: { from: before.status, to: after.status },
    });
  }

  if (before && patch.potential && before.potential !== after.potential) {
    await logSalesEvent({
      companyId: id,
      type: SALES_EVENT_TYPES.POTENTIAL_CHANGED,
      title: `Potencial: ${before.potential} → ${after.potential}`,
      detail: options.reason ?? null,
      actor: options.actor ?? "SYSTEM",
      isAutomated: !options.actor,
    });
  }

  return after;
}

export async function markDoNotContact(companyId: string, reason: string, actor = "SYSTEM") {
  const { supabase } = createSupabaseServerClient();
  const company = await getCompany(companyId);

  await supabase
    .from("sales_companies")
    .update({
      do_not_contact: true,
      do_not_contact_at: new Date().toISOString(),
      do_not_contact_reason: reason,
    })
    .eq("id", companyId);

  if (company?.primary_email) {
    await supabase
      .from("sales_opt_outs")
      .upsert({ email: company.primary_email, reason, source: actor });
  }

  // Cancela seguimientos pendientes: no se vuelve a contactar a quien pidió no serlo.
  await supabase
    .from("sales_followups")
    .update({ status: "CANCELADO", cancel_reason: "Opt-out" })
    .eq("company_id", companyId)
    .eq("status", "PENDIENTE");

  await logSalesEvent({
    companyId,
    type: SALES_EVENT_TYPES.OPT_OUT,
    title: "Marcado como NO CONTACTAR",
    detail: reason,
    actor,
    isAutomated: false,
  });
}

export async function isOptedOut(email?: string | null): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  try {
    const { supabase } = createSupabaseServerClient();
    const { data } = await supabase
      .from("sales_opt_outs")
      .select("email")
      .eq("email", normalized)
      .maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}
