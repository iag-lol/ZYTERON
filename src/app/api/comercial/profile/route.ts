import { NextResponse } from "next/server";
import { z } from "zod";
import { getCommercialUserForApi } from "@/lib/commercial/session";
import { recordAudit } from "@/lib/commercial/audit";
import { changeOwnPassword, updateOwnProfile } from "@/lib/commercial/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const optional = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

const profileSchema = z.object({
  email: z.string().trim().email("El correo no es válido.").max(160).optional().or(z.literal("")),
  phone: optional(40),
  address: optional(200),
  comuna: optional(80),
  region: optional(80),
  birth_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha de nacimiento no es válida.")
    .optional()
    .or(z.literal("")),
  emergency_contact_name: optional(140),
  emergency_contact_phone: optional(40),
  bank_name: optional(80),
  bank_account_type: z.enum(["corriente", "vista", "ahorro", "rut"]).optional().or(z.literal("")),
  bank_account_number: optional(40),
  bank_account_holder: optional(140),
  bank_account_rut: optional(20),
  payment_email: z
    .string()
    .trim()
    .email("El correo para liquidaciones no es válido.")
    .max(160)
    .optional()
    .or(z.literal("")),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual.").max(200),
    newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres.").max(200),
    confirmPassword: z.string().max(200),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas nuevas no coinciden.",
  });

/** Etiquetas legibles para dejar constancia de qué cambió el ejecutivo. */
const FIELD_LABEL: Record<string, string> = {
  email: "correo",
  phone: "teléfono",
  address: "dirección",
  comuna: "comuna",
  region: "región",
  birth_date: "fecha de nacimiento",
  emergency_contact_name: "contacto de emergencia",
  emergency_contact_phone: "teléfono de emergencia",
  bank_name: "banco",
  bank_account_type: "tipo de cuenta",
  bank_account_number: "número de cuenta",
  bank_account_holder: "titular de la cuenta",
  bank_account_rut: "RUT del titular",
  payment_email: "correo para liquidaciones",
};

export async function PATCH(req: Request) {
  const user = await getCommercialUserForApi();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const parsed = profileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Datos inválidos." },
      { status: 400 },
    );
  }

  const result = await updateOwnProfile(user.id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  if (result.changed.length > 0) {
    await recordAudit({
      actorType: "commercial",
      actorId: user.id,
      actorName: user.name,
      entity: "user",
      entityId: user.id,
      entityLabel: user.name,
      action: "profile_updated",
      summary: `Actualizó su ficha: ${result.changed.map((field) => FIELD_LABEL[field] ?? field).join(", ")}.`,
      meta: { fields: result.changed },
      ownerId: user.id,
    });
  }
  return NextResponse.json({ ok: true, changed: result.changed });
}

export async function POST(req: Request) {
  const user = await getCommercialUserForApi();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  const parsed = passwordSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Datos inválidos." },
      { status: 400 },
    );
  }
  const result = await changeOwnPassword(user.id, parsed.data.currentPassword, parsed.data.newPassword);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  await recordAudit({
    actorType: "commercial",
    actorId: user.id,
    actorName: user.name,
    entity: "user",
    entityId: user.id,
    entityLabel: user.name,
    action: "password_changed",
    summary: "Cambió su contraseña de acceso.",
    ownerId: user.id,
  });
  return NextResponse.json({ ok: true });
}
