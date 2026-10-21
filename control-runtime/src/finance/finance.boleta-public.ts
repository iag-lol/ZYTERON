import { NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import type { FinanceRepository } from "./finance.repository.js";
import {
  productionBoletaVerificationUrl,
  verifyProductionBoletaLookupToken,
} from "./finance.boleta-lookup.js";
import { renderPrintedDte, type PrintedDteRecord } from "./finance.dte-print.js";
import { normalizeRut, sha256, type Row } from "./finance.util.js";

/** Sólo lectura. Las rutas provienen del documento persistente y nunca del visitante. */
export async function publicProductionBoleta(
  repo: Pick<FinanceRepository, "configured" | "settings" | "get" | "readFile">,
  token: string,
) {
  const identity = verifyProductionBoletaLookupToken(token);
  if (process.env.DTE_BOLETA_PUBLIC_LOOKUP_ENABLED !== "true" || !repo.configured())
    throw new ServiceUnavailableException("La consulta de boletas no está disponible.");
  const unavailable = () => new NotFoundException("La boleta no está disponible para consulta.");
  const [settings, document] = await Promise.all([
    repo.settings(),
    repo.get<Row>("tax_documents", identity.documentId),
  ]);
  if (
    !document ||
    document.id !== identity.documentId ||
    document.provider !== "SII_DIRECT" ||
    document.environment !== "PRODUCTION" ||
    ![39, 41].includes(document.documentTypeCode) ||
    !["ACCEPTED", "ACCEPTED_WITH_REPAIRS"].includes(document.status) ||
    !settings.companyRut ||
    normalizeRut(document.emitterRut) !== normalizeRut(settings.companyRut) ||
    document.xmlSignedSha256 !== identity.signedXmlSha256 ||
    !Number.isSafeInteger(document.folio) ||
    document.folio <= 0
  )
    throw unavailable();
  const base = `dte/production/${document.documentTypeCode}/${document.folio}`;
  if (
    document.xmlSignedPath !== `${base}/signed.xml` ||
    document.responsePath !== `${base}/envio.xml`
  )
    throw unavailable();
  const [signed, envelope] = await Promise.all([
    repo.readFile("finance-documents", `${base}/signed.xml`),
    repo.readFile("finance-documents", `${base}/envio.xml`),
  ]);
  if (!signed || !envelope || sha256(signed) !== identity.signedXmlSha256) throw unavailable();
  try {
    const bytes = await renderPrintedDte(
      signed,
      envelope,
      document as unknown as PrintedDteRecord,
      process.env.DTE_SII_OFFICE,
      "TRIBUTARY",
      productionBoletaVerificationUrl(document.id, identity.signedXmlSha256),
    );
    return { bytes, fileName: `boleta-${document.documentTypeCode}-${document.folio}.pdf` };
  } catch {
    throw unavailable();
  }
}
