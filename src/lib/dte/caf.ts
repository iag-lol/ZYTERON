/**
 * Lectura de METADATOS de un archivo CAF del SII (rango de folios, tipo y fecha).
 * El XML original SE PRESERVA tal cual para la firma/TED; aquí solo extraemos
 * información para mostrar y validar rangos. No modifica el CAF.
 *
 * NOTA: la validación de FIRMA del CAF y su uso criptográfico (llave RSA para el
 * TED) se implementa en la fase de firma (dte-signer / ted-generator), no aquí.
 */

export type CafMetadata = {
  documentType: number | null;
  rangeStart: number | null;
  rangeEnd: number | null;
  issuedAt: string | null; // fecha de autorización (FA)
  rutEmpresa: string | null;
  valid: boolean;
  errors: string[];
};

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}>\\s*([^<]+?)\\s*</${name}>`, "i"));
  return m ? m[1]!.trim() : null;
}

export function parseCafMetadata(cafXml: string): CafMetadata {
  const errors: string[] = [];
  const xml = String(cafXml || "");

  const td = tag(xml, "TD");
  const rngD = tag(xml, "D"); // rango desde
  const rngH = tag(xml, "H"); // rango hasta
  const fa = tag(xml, "FA");
  const re = tag(xml, "RE"); // RUT empresa

  const documentType = td ? Number(td) : null;
  const rangeStart = rngD ? Number(rngD) : null;
  const rangeEnd = rngH ? Number(rngH) : null;

  if (!documentType) errors.push("No se encontró el tipo de documento (TD) en el CAF.");
  if (rangeStart == null || Number.isNaN(rangeStart)) errors.push("No se encontró el rango inicial (D).");
  if (rangeEnd == null || Number.isNaN(rangeEnd)) errors.push("No se encontró el rango final (H).");
  if (rangeStart != null && rangeEnd != null && rangeEnd < rangeStart) {
    errors.push("El rango final es menor que el inicial.");
  }
  if (!/<CAF/i.test(xml) || !/<DA>/i.test(xml)) {
    errors.push("El archivo no tiene la estructura básica de un CAF (CAF/DA).");
  }

  return {
    documentType,
    rangeStart,
    rangeEnd,
    issuedAt: fa,
    rutEmpresa: re,
    valid: errors.length === 0,
    errors,
  };
}
