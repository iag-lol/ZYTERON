import type { TaxDocument } from "@zyteron/contracts";

type PdfSource = Pick<TaxDocument, "provider" | "folio" | "pdfPath" | "xmlSignedPath" | "xmlSignedSha256">;

export function dtePdfAvailable(document: PdfSource): boolean {
  // SII directo genera el PDF al descargar desde los originales firmados archivados.
  return Boolean(document.pdfPath || (
    document.provider === "SII_DIRECT" &&
    Number.isSafeInteger(document.folio) && Number(document.folio) > 0 &&
    document.xmlSignedPath && document.xmlSignedSha256
  ));
}
