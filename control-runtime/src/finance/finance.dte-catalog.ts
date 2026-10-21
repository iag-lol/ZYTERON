import type { Row } from "./finance.util.js";

export const dteCatalog = [
  [33, "Factura electrónica"],
  [34, "Factura no afecta o exenta electrónica"],
  [39, "Boleta electrónica"],
  [41, "Boleta no afecta o exenta electrónica"],
  [43, "Liquidación factura electrónica"],
  [46, "Factura de compra electrónica"],
  [52, "Guía de despacho electrónica"],
  [56, "Nota de débito electrónica"],
  [61, "Nota de crédito electrónica"],
  [110, "Factura de exportación electrónica"],
  [111, "Nota de débito de exportación electrónica"],
  [112, "Nota de crédito de exportación electrónica"],
] as const;

export const directDteImplemented = (code: number) => [33, 34, 56, 61].includes(code);

// Las opciones sin registro persistente son informativas; una consulta no crea configuración.
export function documentTypeCatalog(stored: Row[], provider: string): Row[] {
  const rows = new Map<number, Row>(stored.map(row => [Number(row.code), { ...row }]));
  for (const [code, name] of dteCatalog) {
    if (!rows.has(code)) rows.set(code, { code, name, enabledForIssue: false, certified: false });
  }
  const persisted = new Set(stored.map(row => Number(row.code)));
  return [...rows.values()].sort((a, b) => a.code - b.code).map(row => {
    const configured = persisted.has(Number(row.code));
    const implementationStatus = provider === "SII_DIRECT"
      ? directDteImplemented(Number(row.code)) ? "IMPLEMENTED" : "PENDING_IMPLEMENTATION"
      : provider === "EXTERNAL" ? "PROVIDER_DEPENDENT" : "PROVIDER_NOT_CONFIGURED";
    return { ...row, catalogConfigured: configured, implementationStatus,
      canEnable: configured && (implementationStatus === "IMPLEMENTED" || implementationStatus === "PROVIDER_DEPENDENT") };
  });
}
