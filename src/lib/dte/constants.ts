/**
 * Constantes del dominio DTE (SII Chile). Códigos oficiales de tipo de documento.
 * No inventar códigos: estos son los estándar del SII.
 */

export const DTE_TYPES = {
  FACTURA: 33, // Factura Electrónica
  FACTURA_EXENTA: 34, // Factura No Afecta o Exenta Electrónica
  BOLETA: 39, // Boleta Electrónica
  BOLETA_EXENTA: 41, // Boleta No Afecta o Exenta Electrónica
  GUIA_DESPACHO: 52, // Guía de Despacho Electrónica
  NOTA_DEBITO: 56, // Nota de Débito Electrónica
  NOTA_CREDITO: 61, // Nota de Crédito Electrónica
} as const;

export type DteType = (typeof DTE_TYPES)[keyof typeof DTE_TYPES];

export const DTE_TYPE_LABELS: Record<number, string> = {
  33: "Factura Electrónica",
  34: "Factura Exenta Electrónica",
  39: "Boleta Electrónica",
  41: "Boleta Exenta Electrónica",
  52: "Guía de Despacho Electrónica",
  56: "Nota de Débito Electrónica",
  61: "Nota de Crédito Electrónica",
};

export const IVA_RATE = 0.19;

export type SiiEnvironment = "certification" | "production";

export function getSiiEnvironment(): SiiEnvironment {
  const raw = String(process.env.SII_ENVIRONMENT || "certification").trim().toLowerCase();
  if (raw === "production" || raw === "produccion" || raw === "prod") return "production";
  return "certification";
}

// Estados internos (proceso de la app).
export const INTERNAL_STATUS = [
  "draft",
  "pending_approval",
  "validated",
  "signing",
  "sending",
  "emitted",
  "error",
  "voided",
  "replaced",
] as const;

// Estados tributarios (respuesta del SII).
export const SII_STATUS = [
  "not_sent",
  "sent",
  "in_process",
  "accepted",
  "accepted_with_remarks",
  "rejected",
  "schema_error",
  "signature_error",
  "caf_error",
  "folio_error",
  "data_error",
] as const;

// Estados comerciales (cobranza).
export const COMMERCIAL_STATUS = [
  "pending_payment",
  "partially_paid",
  "paid",
  "overdue",
  "in_collection",
  "uncollectible",
] as const;

export type InternalStatus = (typeof INTERNAL_STATUS)[number];
export type SiiStatus = (typeof SII_STATUS)[number];
export type CommercialStatus = (typeof COMMERCIAL_STATUS)[number];
