import { z } from "zod";
import { isValidRut, normalizeRut } from "../../full-control/lib/rut";

export const leadEnrollmentSchema = z
  .object({
    rut: z
      .string()
      .max(20)
      .transform(normalizeRut)
      .refine(isValidRut, "RUT inválido: revisa el dígito verificador."),
    legalName: z.string().trim().min(2).max(160),
    email: z.string().trim().toLowerCase().email().max(160),
    password: z
      .string()
      .min(8, "La contraseña requiere 8 caracteres como mínimo.")
      .max(72, "La contraseña admite hasta 72 caracteres.")
      .refine((v) => Buffer.byteLength(v, "utf8") <= 72, "La contraseña excede 72 bytes.")
      .regex(/[A-Z]/, "Incluye una mayúscula.")
      .regex(/[a-z]/, "Incluye una minúscula.")
      .regex(/[0-9]/, "Incluye un número."),
    confirmPassword: z.string(),
  })
  .strict()
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden.",
  });

export function enrollmentError(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  const messages: Record<string, string> = {
    LEAD_NOT_FOUND: "El lead no existe o fue eliminado.",
    LEAD_ALREADY_LINKED:
      "Este lead ya tiene cliente. Administra su acceso desde la ficha; no se cambió su contraseña.",
    ENROLLMENT_EMAIL_EXISTS:
      "El correo ya tiene una cuenta. No se cambió su contraseña. Revisa la cuenta existente antes de vincularla.",
    ENROLLMENT_RUT_EXISTS: "El RUT ya tiene acceso al portal. Usa la ficha existente.",
    ENROLLMENT_CLIENT_REVIEW:
      "El RUT corresponde a otra ficha o cuenta. Revisa la vinculación antes de continuar.",
  };
  return (
    Object.entries(messages).find(([code]) => raw.includes(code))?.[1] ||
    "No fue posible convertir el lead. No se guardaron cambios parciales."
  );
}
