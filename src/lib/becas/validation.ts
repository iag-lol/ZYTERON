import { z } from "zod";

export const scholarshipApplicationSchema = z.object({
  // Paso 1: Datos Contacto
  fullName: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  applicantRole: z.string().min(2, "Debes ingresar tu cargo o relación con el negocio"),
  email: z.string().email("Correo electrónico inválido"),
  whatsapp: z.string().min(8, "Número de WhatsApp inválido"),
  region: z.string().min(1, "Debes seleccionar una región"),
  comuna: z.string().min(1, "Debes ingresar una comuna"),
  instagramHandle: z.string().min(2, "Debes ingresar tu usuario de Instagram"),
  followsOfficialInstagramDeclared: z.literal(true, {
    errorMap: () => ({ message: "Debes confirmar que sigues la cuenta oficial" }),
  }),

  // Paso 2: Datos del Negocio
  businessName: z.string().min(2, "El nombre del negocio es requerido"),
  businessType: z.string().min(1, "Debes seleccionar el tipo de negocio"),
  businessRutExists: z.boolean(),
  businessRut: z.string().optional(),
  industry: z.string().min(2, "Debes ingresar el rubro"),
  businessDescription: z.string().max(500, "Máximo 500 caracteres").min(10, "Describe brevemente tu negocio"),
  websiteGoal: z.string().min(1, "Debes seleccionar un objetivo principal"),
  currentWebsite: z.string().url("URL inválida").optional().or(z.literal('')),
  socialFacebook: z.string().url("URL inválida").optional().or(z.literal('')),
  socialTiktok: z.string().url("URL inválida").optional().or(z.literal('')),
  socialLinkedin: z.string().url("URL inválida").optional().or(z.literal('')),
  currentCatalogUrl: z.string().url("URL inválida").optional().or(z.literal('')),

  // Paso 3: Historia y Necesidad
  scholarshipReason: z.string().max(1000, "Máximo 1000 caracteres").min(20, "Cuéntanos por qué necesitas la beca"),
  productsServicesDescription: z.string().max(600, "Máximo 600 caracteres").min(10, "Describe tus productos o servicios"),
  expectedResult: z.string().max(600, "Máximo 600 caracteres").min(10, "Cuéntanos qué esperas conseguir"),
  projectMaterialStatus: z.string().min(1, "Debes seleccionar una opción"),
  additionalComment: z.string().optional(),

  // Paso 4: Logo
  logoStoragePath: z.string().min(1, "Debes subir un logo o imagen representativa"),
  logoFileName: z.string().min(1, "Falta el nombre del archivo"),
  logoMimeType: z.string().min(1, "Falta el formato del archivo"),
  logoSizeBytes: z.number().positive(),
  logoRightsConfirmed: z.literal(true, {
    errorMap: () => ({ message: "Debes confirmar que tienes los derechos de la imagen" }),
  }),

  // Paso 5: Consentimientos
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar las bases" }),
  }),
  privacyAccepted: z.literal(true, {
    errorMap: () => ({ message: "Debes aceptar la política de privacidad" }),
  }),
  truthfulnessConfirmed: z.literal(true, {
    errorMap: () => ({ message: "Debes declarar que la información es verdadera" }),
  }),
  winnerCaseStudyAcknowledged: z.literal(true, {
    errorMap: () => ({ message: "Debes confirmar que entiendes este requisito en caso de ganar" }),
  }),

  // Consentimientos opcionales
  publicGalleryConsent: z.boolean().default(false),
  publicDescription: z.string().max(160, "Máximo 160 caracteres").optional(),
  publicInstagramConsent: z.boolean().default(false),
  marketingConsent: z.boolean().default(false),

  campaignId: z.string().uuid("Campaña inválida"),
  turnstileToken: z.string().min(1, "Token de seguridad requerido"),
}).superRefine((data, ctx) => {
  if (data.businessRutExists) {
    if (!data.businessRut || data.businessRut.trim().length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El RUT de la empresa es requerido y debe ser válido",
        path: ["businessRut"],
      });
    }
  }

  if (data.publicGalleryConsent) {
    if (!data.publicDescription || data.publicDescription.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Si aceptas la vitrina pública, debes ingresar una descripción breve",
        path: ["publicDescription"],
      });
    }
  }
});

export type ScholarshipApplication = z.infer<typeof scholarshipApplicationSchema>;
