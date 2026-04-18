export const ZYTERON_COMPANY = {
  brandName: "Zyteron",
  legalName: "Zyteron SpA",
  rut: "78.398.774-0",
  businessLine: "Desarrollo web, soporte TI y soluciones tecnológicas empresariales",
  email: "contacto@zyteron.cl",
  salesEmail: "ventas@zyteron.cl",
  phone: "+56 9 8475 2936",
  website: "https://www.zyteron.cl",
  location: "Santiago, Chile",
  addressLine: "Operación comercial y soporte técnico en Santiago y regiones",
  taxActivity: "Servicios de informática, desarrollo de software y comercialización de soluciones TI",
  accent: "#0F5FFF",
  accentDark: "#0B3AA4",
  secondary: "#0F766E",
  neutral: "#0F172A",
  light: "#F8FAFC",
} as const;

export const ZYTERON_SII = {
  issuerRut: ZYTERON_COMPANY.rut,
  issuerName: ZYTERON_COMPANY.legalName,
  environment: "Pendiente de configurar",
  legalNote:
    "La emisión tributaria real ante SII requiere certificado digital vigente, CAF/folios autorizados, habilitación del contribuyente y certificación del proceso correspondiente.",
} as const;

export const ZYTERON_QUOTE_BUCKET = process.env.SUPABASE_QUOTE_BUCKET || "quote-documents";
