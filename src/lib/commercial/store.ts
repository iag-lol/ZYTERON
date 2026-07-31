import { hash, compare } from "bcrypt";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendAdminPushNotification } from "@/lib/notifications/admin-web-push";
import { toSiiRut, isValidRut } from "@/lib/sii/rut";

/**
 * Acceso (service role) a los usuarios comerciales (partners/ejecutivos/gestores).
 * Contraseñas SIEMPRE como hash bcrypt. Nunca se devuelve el hash al cliente.
 */

export type CommercialRole = "executive" | "portfolio" | "partner";
export type CommercialStatus = "active" | "suspended" | "invited";

export type CommercialUser = {
  id: string;
  rut: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  commission_pct: number;
  must_change_password: boolean;
  notes: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  // Ficha personal y laboral
  position: string | null;
  contract_type: string | null;
  started_at: string | null;
  birth_date: string | null;
  address: string | null;
  comuna: string | null;
  region: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  // Datos de pago
  bank_name: string | null;
  bank_account_type: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  bank_account_rut: string | null;
  payment_email: string | null;
  // Metas mensuales
  goal_monthly_leads: number;
  goal_monthly_won: number;
  goal_monthly_amount: number;
};

/** Campos de la ficha que solo ve administración. */
export type CommercialUserAdminView = CommercialUser & { internal_notes: string | null };

const TABLE = "commercial_users";

const PERSONAL_COLS =
  "position,contract_type,started_at,birth_date,address,comuna,region,emergency_contact_name,emergency_contact_phone," +
  "bank_name,bank_account_type,bank_account_number,bank_account_holder,bank_account_rut,payment_email," +
  "goal_monthly_leads,goal_monthly_won,goal_monthly_amount";

const PUBLIC_COLS =
  "id,rut,name,email,phone,role,status,commission_pct,must_change_password,notes,last_login_at,created_at,updated_at," +
  PERSONAL_COLS;

const ADMIN_COLS = `${PUBLIC_COLS},internal_notes`;

/** Campos que el propio ejecutivo puede editar desde su portal. */
export const OWN_PROFILE_FIELDS = [
  "email",
  "phone",
  "address",
  "comuna",
  "region",
  "birth_date",
  "emergency_contact_name",
  "emergency_contact_phone",
  "bank_name",
  "bank_account_type",
  "bank_account_number",
  "bank_account_holder",
  "bank_account_rut",
  "payment_email",
] as const;

/** Campos que solo administración puede modificar. */
export const ADMIN_PROFILE_FIELDS = [
  "name",
  "email",
  "phone",
  "role",
  "status",
  "commission_pct",
  "notes",
  "internal_notes",
  "position",
  "contract_type",
  "started_at",
  "birth_date",
  "address",
  "comuna",
  "region",
  "emergency_contact_name",
  "emergency_contact_phone",
  "bank_name",
  "bank_account_type",
  "bank_account_number",
  "bank_account_holder",
  "bank_account_rut",
  "payment_email",
  "goal_monthly_leads",
  "goal_monthly_won",
  "goal_monthly_amount",
] as const;

function db() {
  return createSupabaseServerClient().supabase.schema("public");
}

/** Mismo cliente (service role) para los módulos de finanzas y auditoría. */
export const commercialDb = db;

/** Normaliza a RUT canónico 12345678-9. Devuelve null si es inválido. */
export function normalizeRut(rut: string): string | null {
  if (!isValidRut(rut)) return null;
  return toSiiRut(rut);
}

export async function listCommercialUsers(): Promise<CommercialUserAdminView[]> {
  const { data } = await db().from(TABLE).select(ADMIN_COLS).order("created_at", { ascending: false });
  return (data as unknown as CommercialUserAdminView[]) ?? [];
}

export async function getCommercialUserById(id: string): Promise<CommercialUser | null> {
  const { data } = await db().from(TABLE).select(PUBLIC_COLS).eq("id", id).maybeSingle();
  return (data as unknown as CommercialUser) ?? null;
}

export async function getCommercialUserForAdmin(id: string): Promise<CommercialUserAdminView | null> {
  const { data } = await db().from(TABLE).select(ADMIN_COLS).eq("id", id).maybeSingle();
  return (data as unknown as CommercialUserAdminView) ?? null;
}

export async function createCommercialUser(input: {
  rut: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: CommercialRole;
  password: string;
  commissionPct?: number;
  position?: string | null;
  contractType?: string | null;
  startedAt?: string | null;
  goalMonthlyLeads?: number;
  goalMonthlyWon?: number;
  goalMonthlyAmount?: number;
  createdBy?: string | null;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const rut = normalizeRut(input.rut);
  if (!rut) return { ok: false, error: "RUT inválido." };
  if (!input.name?.trim()) return { ok: false, error: "El nombre es obligatorio." };
  if (!input.password || input.password.length < 6) return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };

  const supabase = db();
  const { data: dup } = await supabase.from(TABLE).select("id").eq("rut", rut).maybeSingle();
  if (dup) return { ok: false, error: "Ya existe un usuario con ese RUT." };

  const password_hash = await hash(input.password, 10);
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      rut,
      name: input.name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      role: input.role,
      password_hash,
      status: "active",
      commission_pct: Number(input.commissionPct) || 0,
      must_change_password: true,
      position: input.position?.trim() || null,
      contract_type: input.contractType?.trim() || null,
      started_at: input.startedAt || null,
      goal_monthly_leads: Number(input.goalMonthlyLeads) || 0,
      goal_monthly_won: Number(input.goalMonthlyWon) || 0,
      goal_monthly_amount: Number(input.goalMonthlyAmount) || 0,
      created_by: input.createdBy ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id as string };
}

export async function updateCommercialUser(
  id: string,
  patch: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string; changed: string[] }> {
  const allowed = ADMIN_PROFILE_FIELDS as readonly string[];
  const current = await getCommercialUserForAdmin(id);
  if (!current) return { ok: false, error: "Usuario no encontrado.", changed: [] };

  const clean: Record<string, unknown> = {};
  const changed: string[] = [];
  for (const [key, value] of Object.entries(patch)) {
    if (!allowed.includes(key)) continue;
    const before = (current as unknown as Record<string, unknown>)[key];
    const after = typeof value === "string" ? value.trim() || null : value;
    if (String(before ?? "") === String(after ?? "")) continue;
    clean[key] = after;
    changed.push(key);
  }
  if (changed.length === 0) return { ok: true, changed: [] };
  const { error } = await db().from(TABLE).update(clean).eq("id", id);
  if (error) return { ok: false, error: error.message, changed: [] };
  return { ok: true, changed };
}

export async function resetCommercialPassword(id: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 6) return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
  const password_hash = await hash(newPassword, 10);
  const { error } = await db().from(TABLE).update({ password_hash, must_change_password: true }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteCommercialUser(id: string): Promise<{ ok: boolean; error?: string }> {
  const { count } = await db()
    .from("commercial_leads")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", id);
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: "Este usuario tiene contactos registrados. Suspéndelo para conservar su historial.",
    };
  }
  const { error } = await db().from(TABLE).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// -- Prospectos / Referidos (aislados por owner) ----------------------------

export type CommercialLead = {
  id: string;
  owner_id: string;
  kind: string;
  name: string;
  rut: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  region: string | null;
  comuna: string | null;
  website: string | null;
  industry: string | null;
  service: string | null;
  budget: string | null;
  deadline: string | null;
  interest: string | null;
  description: string | null;
  source: string | null;
  validation_status: string;
  commercial_status: string;
  admin_notes: string | null;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  validated_at: string | null;
  updated_at: string;
  created_at: string;
};

export type CommercialLeadActivity = {
  id: string;
  lead_id: string;
  owner_id: string;
  actor_type: string;
  actor_id: string | null;
  activity_type: string;
  outcome: string | null;
  notes: string;
  from_status: string | null;
  to_status: string | null;
  occurred_at: string;
  next_follow_up_at: string | null;
  created_at: string;
};

export type AdminCommercialLead = CommercialLead & {
  owner_name: string;
  owner_role: string;
  owner_email: string | null;
  activities_count: number;
  latest_activity: CommercialLeadActivity | null;
};

export const COMMERCIAL_PROGRESS_STATUSES = [
  "registered",
  "contacted",
  "follow_up",
  "meeting_scheduled",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
  "no_response",
] as const;

export const COMMERCIAL_VALIDATION_STATUSES = [
  "pending",
  "in_review",
  "potential",
  "accepted",
  "rejected",
  "duplicate",
] as const;

export const COMMERCIAL_ACTIVITY_TYPES = [
  "call",
  "whatsapp",
  "email",
  "meeting",
  "note",
] as const;

export type CommercialProgressStatus = (typeof COMMERCIAL_PROGRESS_STATUSES)[number];
export type CommercialValidationStatus = (typeof COMMERCIAL_VALIDATION_STATUSES)[number];
export type CommercialActivityType = (typeof COMMERCIAL_ACTIVITY_TYPES)[number];

const LEAD_COLS =
  "id,owner_id,kind,name,rut,contact_name,email,phone,region,comuna,website,industry,service,budget,deadline,interest,description,source,validation_status,commercial_status,admin_notes,last_contact_at,next_follow_up_at,validated_at,updated_at,created_at";
const ACTIVITY_COLS =
  "id,lead_id,owner_id,actor_type,actor_id,activity_type,outcome,notes,from_status,to_status,occurred_at,next_follow_up_at,created_at";

export async function listLeadsByOwner(ownerId: string): Promise<CommercialLead[]> {
  const { data } = await db().from("commercial_leads").select(LEAD_COLS).eq("owner_id", ownerId).order("created_at", { ascending: false });
  return (data as CommercialLead[]) ?? [];
}

function optionalString(input: Record<string, unknown>, key: string, max = 400) {
  const value = String(input[key] ?? "").trim();
  return value ? value.slice(0, max) : null;
}

function cleanLeadFields(input: Record<string, unknown>) {
  const name = String(input.name ?? "").trim();
  const rutRaw = optionalString(input, "rut", 20);
  return {
    kind: input.kind === "company" ? "company" : "person",
    name: name.slice(0, 200),
    rut: rutRaw && isValidRut(rutRaw) ? toSiiRut(rutRaw) : rutRaw,
    contact_name: optionalString(input, "contact_name", 140),
    email: optionalString(input, "email", 160),
    phone: optionalString(input, "phone", 40),
    region: optionalString(input, "region", 80),
    comuna: optionalString(input, "comuna", 80),
    website: optionalString(input, "website", 200),
    industry: optionalString(input, "industry", 120),
    service: optionalString(input, "service", 200),
    budget: optionalString(input, "budget", 120),
    deadline: optionalString(input, "deadline", 120),
    interest: optionalString(input, "interest", 20),
    description: optionalString(input, "description", 4000),
    source: optionalString(input, "source", 120),
  };
}

async function findOwnerDuplicate(
  ownerId: string,
  fields: { rut: string | null; email: string | null },
  excludeId?: string,
) {
  if (fields.rut) {
    let query = db().from("commercial_leads").select("id").eq("owner_id", ownerId).eq("rut", fields.rut);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.limit(1).maybeSingle();
    if (data) return true;
  }
  if (fields.email) {
    let query = db()
      .from("commercial_leads")
      .select("id")
      .eq("owner_id", ownerId)
      .ilike("email", fields.email);
    if (excludeId) query = query.neq("id", excludeId);
    const { data } = await query.limit(1).maybeSingle();
    if (data) return true;
  }
  return false;
}

export async function createLead(ownerId: string, input: Record<string, unknown>): Promise<{ ok: boolean; id?: string; error?: string }> {
  const fields = cleanLeadFields(input);
  if (!fields.name) return { ok: false, error: "El nombre o razón social es obligatorio." };
  if (await findOwnerDuplicate(ownerId, fields)) {
    return { ok: false, error: "Ya registraste un contacto con este RUT o correo." };
  }
  const { data, error } = await db()
    .from("commercial_leads")
    .insert({
      owner_id: ownerId,
      ...fields,
      validation_status: "pending",
      commercial_status: "registered",
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const { data: owner } = await db()
    .from("commercial_users")
    .select("name,role")
    .eq("id", ownerId)
    .maybeSingle();
  const ownerRole = owner?.role === "partner" ? "partner" : "executive";
  await sendAdminPushNotification({
    title: `${ownerRole === "partner" ? "Partner" : "Ejecutivo"}: nuevo cliente`,
    body: `${fields.name} · ${owner?.name || "Equipo comercial"}`,
    href: "/admin/comercial?tab=leads",
    tag: `commercial-${String(data.id)}`,
    kind: ownerRole,
    createdAt: new Date().toISOString(),
    eventId: `commercial:${String(data.id)}`,
  }).catch((pushError) => console.error("[admin-push] aviso comercial fallido:", pushError));

  return { ok: true, id: data.id as string };
}

export async function getLeadByOwner(ownerId: string, leadId: string): Promise<CommercialLead | null> {
  const { data } = await db()
    .from("commercial_leads")
    .select(LEAD_COLS)
    .eq("id", leadId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  return (data as CommercialLead) ?? null;
}

export async function updateLeadByOwner(
  ownerId: string,
  leadId: string,
  input: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const current = await getLeadByOwner(ownerId, leadId);
  if (!current) return { ok: false, error: "Registro no encontrado." };
  const fields = cleanLeadFields(input);
  if (!fields.name) return { ok: false, error: "El nombre o razón social es obligatorio." };
  if (await findOwnerDuplicate(ownerId, fields, leadId)) {
    return { ok: false, error: "Otro registro tuyo ya usa este RUT o correo." };
  }
  const { error } = await db()
    .from("commercial_leads")
    .update(fields)
    .eq("id", leadId)
    .eq("owner_id", ownerId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function listLeadActivities(ownerId: string, leadId: string): Promise<CommercialLeadActivity[]> {
  const lead = await getLeadByOwner(ownerId, leadId);
  if (!lead) return [];
  const { data } = await db()
    .from("commercial_lead_activities")
    .select(ACTIVITY_COLS)
    .eq("lead_id", leadId)
    .eq("owner_id", ownerId)
    .order("occurred_at", { ascending: false });
  return (data as CommercialLeadActivity[]) ?? [];
}

export async function addLeadActivity(
  ownerId: string,
  actorId: string,
  leadId: string,
  input: {
    activityType: CommercialActivityType;
    outcome?: string | null;
    notes: string;
    progressStatus: CommercialProgressStatus;
    occurredAt?: string | null;
    nextFollowUpAt?: string | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  const lead = await getLeadByOwner(ownerId, leadId);
  if (!lead) return { ok: false, error: "Registro no encontrado." };
  const occurredAt = input.occurredAt || new Date().toISOString();
  const nextFollowUpAt = input.nextFollowUpAt || null;
  const { error: activityError } = await db().from("commercial_lead_activities").insert({
    lead_id: leadId,
    owner_id: ownerId,
    actor_type: "commercial",
    actor_id: actorId,
    activity_type: input.activityType,
    outcome: input.outcome?.trim().slice(0, 120) || null,
    notes: input.notes.trim().slice(0, 4000),
    from_status: lead.commercial_status,
    to_status: input.progressStatus,
    occurred_at: occurredAt,
    next_follow_up_at: nextFollowUpAt,
  });
  if (activityError) return { ok: false, error: activityError.message };

  const { error: leadError } = await db()
    .from("commercial_leads")
    .update({
      commercial_status: input.progressStatus,
      last_contact_at: occurredAt,
      next_follow_up_at: nextFollowUpAt,
    })
    .eq("id", leadId)
    .eq("owner_id", ownerId);
  return leadError ? { ok: false, error: leadError.message } : { ok: true };
}

export async function listAllCommercialLeads(): Promise<AdminCommercialLead[]> {
  const [{ data: leads }, { data: users }, { data: activities }] = await Promise.all([
    db().from("commercial_leads").select(LEAD_COLS).order("updated_at", { ascending: false }),
    db().from(TABLE).select("id,name,role,email"),
    db().from("commercial_lead_activities").select(ACTIVITY_COLS).order("occurred_at", { ascending: false }),
  ]);
  const owners = new Map(
    ((users ?? []) as Array<{ id: string; name: string; role: string; email: string | null }>).map((user) => [user.id, user]),
  );
  const activityGroups = new Map<string, CommercialLeadActivity[]>();
  for (const activity of (activities ?? []) as CommercialLeadActivity[]) {
    const group = activityGroups.get(activity.lead_id) ?? [];
    group.push(activity);
    activityGroups.set(activity.lead_id, group);
  }
  return ((leads ?? []) as CommercialLead[]).map((lead) => {
    const owner = owners.get(lead.owner_id);
    const leadActivities = activityGroups.get(lead.id) ?? [];
    return {
      ...lead,
      owner_name: owner?.name ?? "Usuario eliminado",
      owner_role: owner?.role ?? "—",
      owner_email: owner?.email ?? null,
      activities_count: leadActivities.length,
      latest_activity: leadActivities[0] ?? null,
    };
  });
}

export async function getCommercialLeadForAdmin(
  leadId: string,
): Promise<{ lead: AdminCommercialLead; activities: CommercialLeadActivity[] } | null> {
  const leads = await listAllCommercialLeads();
  const lead = leads.find((item) => item.id === leadId);
  if (!lead) return null;
  const { data } = await db()
    .from("commercial_lead_activities")
    .select(ACTIVITY_COLS)
    .eq("lead_id", leadId)
    .order("occurred_at", { ascending: false });
  return { lead, activities: (data as CommercialLeadActivity[]) ?? [] };
}

export async function evaluateCommercialLead(
  leadId: string,
  actorId: string,
  input: {
    validationStatus: CommercialValidationStatus;
    adminNotes?: string | null;
    commercialStatus?: CommercialProgressStatus;
  },
): Promise<{ ok: boolean; error?: string }> {
  const { data: current } = await db()
    .from("commercial_leads")
    .select(LEAD_COLS)
    .eq("id", leadId)
    .maybeSingle();
  const lead = current as CommercialLead | null;
  if (!lead) return { ok: false, error: "Registro no encontrado." };

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    validation_status: input.validationStatus,
    admin_notes: input.adminNotes?.trim().slice(0, 4000) || null,
    validated_at: now,
    validated_by: actorId,
  };
  if (input.commercialStatus) patch.commercial_status = input.commercialStatus;
  const { error } = await db().from("commercial_leads").update(patch).eq("id", leadId);
  if (error) return { ok: false, error: error.message };

  const label = input.adminNotes?.trim() || `Evaluación actualizada a ${input.validationStatus}.`;
  const { error: activityError } = await db().from("commercial_lead_activities").insert({
    lead_id: lead.id,
    owner_id: lead.owner_id,
    actor_type: "admin",
    actor_id: actorId,
    activity_type: "evaluation",
    notes: label.slice(0, 4000),
    from_status: lead.validation_status,
    to_status: input.validationStatus,
    occurred_at: now,
  });
  return activityError ? { ok: false, error: activityError.message } : { ok: true };
}

export async function listCommissionsByOwner(ownerId: string) {
  const { data } = await db().from("commercial_commissions").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false });
  return data ?? [];
}

export async function listStatementsByOwner(ownerId: string) {
  const { data } = await db().from("commercial_statements").select("*").eq("owner_id", ownerId).order("period", { ascending: false });
  return data ?? [];
}

/**
 * El propio usuario actualiza su ficha personal y sus datos de pago.
 * Nunca puede tocar su rol, estado, porcentaje de comisión ni sus metas.
 */
export async function updateOwnProfile(
  id: string,
  patch: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string; changed: string[] }> {
  const allowed = OWN_PROFILE_FIELDS as readonly string[];
  const current = await getCommercialUserById(id);
  if (!current) return { ok: false, error: "Usuario no encontrado.", changed: [] };

  const clean: Record<string, unknown> = {};
  const changed: string[] = [];
  for (const [key, value] of Object.entries(patch)) {
    if (!allowed.includes(key)) continue;
    const after = typeof value === "string" ? value.trim() || null : value;
    const before = (current as unknown as Record<string, unknown>)[key];
    if (String(before ?? "") === String(after ?? "")) continue;
    clean[key] = after;
    changed.push(key);
  }
  if (changed.length === 0) return { ok: true, changed: [] };
  const { error } = await db().from(TABLE).update(clean).eq("id", id);
  return error ? { ok: false, error: error.message, changed: [] } : { ok: true, changed };
}

/** El propio usuario cambia su contraseña (verifica la actual). */
export async function changeOwnPassword(id: string, currentPassword: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 6) return { ok: false, error: "La nueva contraseña debe tener al menos 6 caracteres." };
  const { data } = await db().from(TABLE).select("password_hash").eq("id", id).maybeSingle();
  if (!data) return { ok: false, error: "Usuario no encontrado." };
  const ok = await compare(currentPassword, (data as { password_hash: string }).password_hash);
  if (!ok) return { ok: false, error: "La contraseña actual no es correcta." };
  const password_hash = await hash(newPassword, 10);
  const { error } = await db().from(TABLE).update({ password_hash, must_change_password: false }).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Verifica RUT + contraseña. Devuelve el usuario público si es válido y está activo. */
export async function verifyCommercialCredentials(rutRaw: string, password: string): Promise<CommercialUser | null> {
  const rut = normalizeRut(rutRaw);
  if (!rut || !password) return null;
  const { data } = await db().from(TABLE).select(`${PUBLIC_COLS},password_hash`).eq("rut", rut).maybeSingle();
  if (!data) return null;
  const row = data as CommercialUser & { password_hash: string };
  if (row.status !== "active") return null;
  const ok = await compare(password, row.password_hash);
  if (!ok) return null;
  await db().from(TABLE).update({ last_login_at: new Date().toISOString() }).eq("id", row.id).then(() => {});
  const { password_hash: _drop, ...pub } = row;
  void _drop;
  return pub as CommercialUser;
}
