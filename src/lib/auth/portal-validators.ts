import { z } from "zod";

export function normalizeEmail(value: string) {
  return String(value || "").trim().toLowerCase();
}

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, "Ingresa tu nombre.").max(80),
    lastName: z.string().trim().min(2, "Ingresa tu apellido.").max(80),
    email: z.string().trim().email("Correo inválido."),
    company: z.string().trim().min(2, "Ingresa tu empresa.").max(160),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .max(128, "La contraseña excede el máximo permitido.")
      .regex(/[A-Z]/, "Incluye al menos una mayúscula.")
      .regex(/[a-z]/, "Incluye al menos una minúscula.")
      .regex(/[0-9]/, "Incluye al menos un número."),
    confirmPassword: z.string().min(1, "Confirma tu contraseña."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden.",
  });

export const verifyCodeSchema = z.object({
  email: z.string().trim().email("Correo inválido."),
  code: z.string().trim().regex(/^\d{6}$/, "El código debe tener 6 dígitos."),
});

export const resendCodeSchema = z.object({
  email: z.string().trim().email("Correo inválido."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Correo inválido."),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().email("Correo inválido."),
    code: z.string().trim().regex(/^\d{6}$/, "El código debe tener 6 dígitos."),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .max(128, "La contraseña excede el máximo permitido.")
      .regex(/[A-Z]/, "Incluye al menos una mayúscula.")
      .regex(/[a-z]/, "Incluye al menos una minúscula.")
      .regex(/[0-9]/, "Incluye al menos un número."),
    confirmPassword: z.string().min(1, "Confirma tu contraseña."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden.",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual."),
    newPassword: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .max(128, "La contraseña excede el máximo permitido.")
      .regex(/[A-Z]/, "Incluye al menos una mayúscula.")
      .regex(/[a-z]/, "Incluye al menos una minúscula.")
      .regex(/[0-9]/, "Incluye al menos un número."),
    confirmPassword: z.string().min(1, "Confirma tu nueva contraseña."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden.",
  });

