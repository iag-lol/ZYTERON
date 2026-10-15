import { z } from "zod";
export const credentialAdminSchema = z
  .object({
    credentialId: z.string().min(1).max(200).optional(),
    serviceName: z.string().trim().min(2).max(140),
    username: z.string().trim().max(140).optional(),
    secret: z.string().max(4000).optional(),
    url: z
      .string()
      .trim()
      .max(2000)
      .refine((value) => {
        if (!value) return true;
        try {
          const url = new URL(value);
          return (
            url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash
          );
        } catch {
          return false;
        }
      }, "Usa una URL HTTPS sin contraseñas, tokens ni parámetros."),
    notes: z.string().trim().max(1000).optional(),
    projectId: z.string().trim().min(1).max(200),
  })
  .strict();
