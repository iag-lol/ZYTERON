import { createHmac, timingSafeEqual } from "node:crypto";
import { BadRequestException, ServiceUnavailableException } from "@nestjs/common";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const caseId = /^CASO-[1-9]\d{0,5}$/;
function signingKey(scope = "certification:boleta-lookup:v1") {
  const raw = process.env.FINANCE_ENCRYPTION_KEY?.trim() || "";
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32)
    throw new ServiceUnavailableException("La consulta de boletas no está configurada.");
  return createHmac("sha256", key).update(`zyteron:${scope}`).digest();
}
export function boletaLookupToken(runId: string, officialCaseId: string) {
  if (!uuid.test(runId) || !caseId.test(officialCaseId))
    throw new BadRequestException("Identidad de boleta inválida.");
  const payload = Buffer.from(JSON.stringify([runId, officialCaseId])).toString("base64url");
  return `v1.${payload}.${createHmac("sha256", signingKey()).update(payload).digest("base64url")}`;
}
export function verifyBoletaLookupToken(token: unknown) {
  const invalid = () => new BadRequestException("El código de consulta no es válido.");
  if (
    typeof token !== "string" ||
    token.length > 220 ||
    !/^v1\.[A-Za-z0-9_-]{20,150}\.[A-Za-z0-9_-]{43}$/.test(token)
  )
    throw invalid();
  const [, payload, mac] = token.split(".");
  const supplied = Buffer.from(mac!, "base64url");
  if (supplied.toString("base64url") !== mac) throw invalid();
  const expected = createHmac("sha256", signingKey()).update(payload!).digest();
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw invalid();
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(payload!, "base64url").toString("utf8"));
  } catch {
    throw invalid();
  }
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[0] !== "string" ||
    typeof value[1] !== "string" ||
    !uuid.test(value[0]) ||
    !caseId.test(value[1])
  )
    throw invalid();
  return { runId: value[0], caseId: value[1] };
}
export const boletaVerificationUrl = (runId: string, officialCaseId: string) =>
  `https://www.zyteron.cl/boletas/consulta#${boletaLookupToken(runId, officialCaseId)}`;

const productionScope = "production:boleta-lookup:v2";
const sha256 = /^[a-f0-9]{64}$/;

/** El código permite leer sólo el PDF del XML archivado cuya huella está firmada. */
export function productionBoletaLookupToken(documentId: string, signedXmlSha256: string) {
  if (!uuid.test(documentId) || !sha256.test(signedXmlSha256))
    throw new BadRequestException("Identidad de boleta inválida.");
  const payload = Buffer.from(JSON.stringify([documentId, signedXmlSha256])).toString("base64url");
  const mac = createHmac("sha256", signingKey(productionScope)).update(payload).digest("base64url");
  return `v2.${payload}.${mac}`;
}

export function verifyProductionBoletaLookupToken(token: unknown) {
  const invalid = () => new BadRequestException("El código de consulta no es válido.");
  if (
    typeof token !== "string" ||
    token.length > 220 ||
    !/^v2\.[A-Za-z0-9_-]{20,150}\.[A-Za-z0-9_-]{43}$/.test(token)
  )
    throw invalid();
  const [, payload, mac] = token.split(".");
  const supplied = Buffer.from(mac!, "base64url");
  const expected = createHmac("sha256", signingKey(productionScope)).update(payload!).digest();
  if (
    supplied.toString("base64url") !== mac ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    throw invalid();
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(payload!, "base64url").toString("utf8"));
  } catch {
    throw invalid();
  }
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[0] !== "string" ||
    typeof value[1] !== "string" ||
    !uuid.test(value[0]) ||
    !sha256.test(value[1])
  )
    throw invalid();
  if (Buffer.from(JSON.stringify(value)).toString("base64url") !== payload) throw invalid();
  return { documentId: value[0], signedXmlSha256: value[1] };
}

export const productionBoletaVerificationUrl = (documentId: string, signedXmlSha256: string) =>
  `https://www.zyteron.cl/boletas/consulta#${productionBoletaLookupToken(documentId, signedXmlSha256)}`;
