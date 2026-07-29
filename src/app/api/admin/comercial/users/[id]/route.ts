import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { getMemberProfile } from "@/lib/commercial/analytics";
import { listAuditLog, notifyCommercialUser, recordAudit } from "@/lib/commercial/audit";
import {
  getCommercialUserForAdmin,
  updateCommercialUser,
  resetCommercialPassword,
  deleteCommercialUser,
} from "@/lib/commercial/store";
import { ROLE_INFO, USER_STATUS_INFO } from "@/config/commercial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const optional = (max: number) => z.string().trim().max(max).optional().nullable();

const schema = z.object({
  name: z.string().trim().min(2).max(140).optional(),
  email: optional(160),
  phone: optional(40),
  role: z.enum(["executive", "portfolio", "partner"]).optional(),
  status: z.enum(["active", "suspended", "invited"]).optional(),
  commission_pct: z.number().min(0).max(100).optional(),
  notes: optional(2000),
  internal_notes: optional(4000),
  position: optional(120),
  contract_type: optional(40),
  started_at: optional(20),
  birth_date: optional(20),
  address: optional(200),
  comuna: optional(80),
  region: optional(80),
  emergency_contact_name: optional(140),
  emergency_contact_phone: optional(40),
  bank_name: optional(80),
  bank_account_type: optional(20),
  bank_account_number: optional(40),
  bank_account_holder: optional(140),
  bank_account_rut: optional(20),
  payment_email: optional(160),
  goal_monthly_leads: z.number().int().min(0).max(1000).optional(),
  goal_monthly_won: z.number().int().min(0).max(1000).optional(),
  goal_monthly_amount: z.number().int().min(0).optional(),
  newPassword: z.string().min(6).max(200).optional(),
});

const FIELD_LABEL: Record<string, string> = {
  name: "nombre",
  email: "correo",
  phone: "teléfono",
  role: "rol",
  status: "estado",
  commission_pct: "% de comisión",
  notes: "notas",
  internal_notes: "notas internas",
  position: "cargo",
  contract_type: "tipo de vínculo",
  started_at: "fecha de inicio",
  birth_date: "fecha de nacimiento",
  address: "dirección",
  comuna: "comuna",
  region: "región",
  emergency_contact_name: "contacto de emergencia",
  emergency_contact_phone: "teléfono de emergencia",
  bank_name: "banco",
  bank_account_type: "tipo de cuenta",
  bank_account_number: "número de cuenta",
  bank_account_holder: "titular de la cuenta",
  bank_account_rut: "RUT del titular",
  payment_email: "correo para liquidaciones",
  goal_monthly_leads: "meta de registros",
  goal_monthly_won: "meta de cierres",
  goal_monthly_amount: "meta de venta",
};

/** Ficha 360: datos personales, desempeño, comisiones, liquidaciones y bitácora. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const user = await getCommercialUserForAdmin(id);
  if (!user) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  const [profile, audit] = await Promise.all([
    getMemberProfile(id),
    listAuditLog({ ownerId: id, limit: 80 }),
  ]);
  return NextResponse.json({ user, ...profile, audit });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Datos inválidos." },
      { status: 400 },
    );
  }

  const actor = "session" in auth ? auth.session.user.id : "legacy-admin";
  const before = await getCommercialUserForAdmin(id);
  if (!before) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });

  const { newPassword, ...fields } = parsed.data;

  if (newPassword) {
    const result = await resetCommercialPassword(id, newPassword);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    await recordAudit({
      actorId: actor,
      entity: "user",
      entityId: id,
      entityLabel: before.name,
      action: "password_reset",
      summary: `Administración restableció la contraseña de ${before.name}. Deberá cambiarla al ingresar.`,
      ownerId: id,
    });
    await notifyCommercialUser({
      ownerId: id,
      kind: "warning",
      title: "Tu contraseña fue restablecida",
      body: "Administración generó una nueva contraseña. Cámbiala desde Mi perfil apenas ingreses.",
      link: "/portal-comercial/perfil",
    });
  }

  if (Object.keys(fields).length > 0) {
    const result = await updateCommercialUser(id, fields);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    if (result.changed.length > 0) {
      await recordAudit({
        actorId: actor,
        entity: "user",
        entityId: id,
        entityLabel: before.name,
        action: fields.status && fields.status !== before.status ? "status_changed" : "updated",
        summary: `Administración actualizó ${result.changed.map((field) => FIELD_LABEL[field] ?? field).join(", ")} de ${before.name}.`,
        meta: { changed: result.changed, patch: fields },
        ownerId: id,
      });
    }
    if (fields.status && fields.status !== before.status) {
      await notifyCommercialUser({
        ownerId: id,
        kind: fields.status === "active" ? "success" : "warning",
        title: `Tu cuenta ahora está ${USER_STATUS_INFO[fields.status]?.label.toLocaleLowerCase("es") ?? fields.status}`,
        body:
          fields.status === "suspended"
            ? "El acceso al portal quedó suspendido. Contacta a administración para más detalles."
            : "Tu acceso al portal comercial está habilitado.",
      });
    }
    if (fields.role && fields.role !== before.role) {
      await notifyCommercialUser({
        ownerId: id,
        kind: "info",
        title: `Tu rol cambió a ${ROLE_INFO[fields.role]?.label ?? fields.role}`,
        body: "Revisa el Centro de conocimiento para ver qué implica tu nuevo rol.",
        link: "/portal-comercial/centro",
      });
    }
    if (fields.commission_pct !== undefined && fields.commission_pct !== Number(before.commission_pct)) {
      await notifyCommercialUser({
        ownerId: id,
        kind: "info",
        title: `Tu comisión quedó en ${fields.commission_pct}%`,
        body: "El nuevo porcentaje se aplica a las comisiones que se registren desde ahora.",
        link: "/portal-comercial/ganancias",
      });
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const actor = "session" in auth ? auth.session.user.id : "legacy-admin";

  const before = await getCommercialUserForAdmin(id);
  const result = await deleteCommercialUser(id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  await recordAudit({
    actorId: actor,
    entity: "user",
    entityId: id,
    entityLabel: before?.name ?? id,
    action: "deleted",
    summary: `Se eliminó el acceso de ${before?.name ?? "un usuario comercial"} (${before?.rut ?? "sin RUT"}).`,
    meta: before ? { rut: before.rut, role: before.role } : null,
  });
  return NextResponse.json({ ok: true });
}
