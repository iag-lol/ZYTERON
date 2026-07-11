import { siteConfig } from "@/config/site";

export const ZYTERON_COMPANY = {
  brandName: "Zyteron",
  legalName: siteConfig.legalName,
  rut: siteConfig.taxId,
  businessLine: "Desarrollo web, soporte TI y soluciones tecnológicas empresariales",
  email: siteConfig.contact.email,
  salesEmail: siteConfig.contact.email,
  phone: siteConfig.contact.phone,
  website: siteConfig.url,
  location: siteConfig.address.display,
  addressLine: "Operación comercial y soporte técnico en Santiago y regiones",
  taxActivity: "Servicios de informática, desarrollo de software y comercialización de soluciones TI",
  accent: "#0F5FFF",
  accentDark: "#0B3AA4",
  secondary: "#0F766E",
  neutral: "#0F172A",
  light: "#F8FAFC",
  transferBank: "Banco BCI",
  transferAccountType: "Cuenta corriente",
  transferAccountNumber: "14500679",
  transferAccountEmail: siteConfig.contact.email,
} as const;

export const ZYTERON_SII = {
  issuerRut: ZYTERON_COMPANY.rut,
  issuerName: ZYTERON_COMPANY.legalName,
  environment: "Pendiente de configurar",
  legalNote:
    "La emisión tributaria real ante SII requiere certificado digital vigente, CAF/folios autorizados, habilitación del contribuyente y certificación del proceso correspondiente.",
} as const;

export const ZYTERON_QUOTE_BUCKET = process.env.SUPABASE_QUOTE_BUCKET || "quote-documents";
export const ZYTERON_EXPENSE_BUCKET = process.env.SUPABASE_EXPENSE_BUCKET || "expense-documents";
export const ZYTERON_PRODUCT_BUCKET = process.env.SUPABASE_PRODUCT_BUCKET || "product-images";
export const ZYTERON_PAYMENT_PROOF_BUCKET = process.env.SUPABASE_PAYMENT_PROOF_BUCKET || "payment-proofs";
