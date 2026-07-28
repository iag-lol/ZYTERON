import { NextResponse } from "next/server";
import { z } from "zod";
import { getCommercialUserForApi } from "@/lib/commercial/session";
import { changeOwnPassword, updateOwnProfile } from "@/lib/commercial/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const profileSchema = z.object({
  email: z.string().trim().email("El correo no es válido.").max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
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
  const result = await updateOwnProfile(user.id, {
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
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
  return NextResponse.json({ ok: true });
}
