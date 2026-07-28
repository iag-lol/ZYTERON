import { hash, compare } from "bcrypt";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
};

const TABLE = "commercial_users";
const PUBLIC_COLS =
  "id,rut,name,email,phone,role,status,commission_pct,must_change_password,notes,last_login_at,created_at,updated_at";

function db() {
  return createSupabaseServerClient().supabase.schema("public");
}

/** Normaliza a RUT canónico 12345678-9. Devuelve null si es inválido. */
export function normalizeRut(rut: string): string | null {
  if (!isValidRut(rut)) return null;
  return toSiiRut(rut);
}

export async function listCommercialUsers(): Promise<CommercialUser[]> {
  const { data } = await db().from(TABLE).select(PUBLIC_COLS).order("created_at", { ascending: false });
  return (data as CommercialUser[]) ?? [];
}

export async function getCommercialUserById(id: string): Promise<CommercialUser | null> {
  const { data } = await db().from(TABLE).select(PUBLIC_COLS).eq("id", id).maybeSingle();
  return (data as CommercialUser) ?? null;
}

export async function createCommercialUser(input: {
  rut: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: CommercialRole;
  password: string;
  commissionPct?: number;
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
      created_by: input.createdBy ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id as string };
}

export async function updateCommercialUser(
  id: string,
  patch: Partial<{ name: string; email: string | null; phone: string | null; role: string; status: string; commission_pct: number; notes: string | null }>,
): Promise<{ ok: boolean; error?: string }> {
  const clean: Record<string, unknown> = {};
  const allowed = ["name", "email", "phone", "role", "status", "commission_pct", "notes"];
  for (const [k, v] of Object.entries(patch)) if (allowed.includes(k)) clean[k] = v;
  if (Object.keys(clean).length === 0) return { ok: true };
  const { error } = await db().from(TABLE).update(clean).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function resetCommercialPassword(id: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 6) return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
  const password_hash = await hash(newPassword, 10);
  const { error } = await db().from(TABLE).update({ password_hash, must_change_password: true }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteCommercialUser(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await db().from(TABLE).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
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
