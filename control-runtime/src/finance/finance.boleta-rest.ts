import { ServiceUnavailableException, UnprocessableEntityException } from "@nestjs/common";
import type { DteStatus } from "./finance.dte-providers.js";
import { normalizeRut, validRut, type Row } from "./finance.util.js";

// Contrato SII API 1.0.5: /bolcoreinternetui/api/openapi.yaml.
export function boletaRestHost(environment: string, upload = false) {
  if (!["CERTIFICATION", "PRODUCTION"].includes(environment))
    throw new UnprocessableEntityException("Ambiente SII inválido.");
  return environment === "PRODUCTION"
    ? upload
      ? "rahue.sii.cl"
      : "api.sii.cl"
    : upload
      ? "pangal.sii.cl"
      : "apicert.sii.cl";
}
function track(value: unknown) {
  if (typeof value === "number" && !Number.isSafeInteger(value))
    throw new ServiceUnavailableException("Track ID REST inválido; no retransmitir.");
  const result = String(value ?? "");
  if (!/^[1-9]\d{0,14}$/.test(result))
    throw new ServiceUnavailableException("Track ID REST inválido; no retransmitir.");
  return result;
}
function identity(data: Row, companyRut: string, senderRut?: string, trackId?: string) {
  if (
    !data ||
    Array.isArray(data) ||
    typeof data !== "object" ||
    !validRut(companyRut) ||
    normalizeRut(data.rut_emisor) !== normalizeRut(companyRut) ||
    (senderRut && normalizeRut(data.rut_envia) !== normalizeRut(senderRut)) ||
    (trackId && track(data.trackid) !== track(trackId))
  )
    throw new ServiceUnavailableException(
      "La respuesta REST no corresponde al envío consultado. Se conserva el estado registrado.",
    );
}
export function boletaReceipt(data: Row, companyRut: string, senderRut: string) {
  identity(data, companyRut, senderRut);
  if (data.estado !== "REC")
    throw new ServiceUnavailableException(
      "El SII no confirmó la recepción REST de la boleta. Revisa el envío antes de reintentar.",
    );
  return track(data.trackid);
}
export function boletaDocumentStatus(
  data: Row,
  expected: { companyRut: string; trackId: string; type: number; folio: number },
): DteStatus {
  identity(data, expected.companyRut, undefined, expected.trackId);
  if (
    ![39, 41].includes(expected.type) ||
    !Number.isSafeInteger(expected.folio) ||
    expected.folio <= 0
  )
    throw new UnprocessableEntityException("Identidad de boleta inválida.");
  const code = String(data.estado ?? ""),
    detail = {
      state: code,
      statistics: data.estadistica ?? null,
      diagnostics: data.detalle_rep_rech ?? null,
    };
  const pending = (message: string): DteStatus => ({
    status: "RECEIVED_BY_SII",
    code: code || null,
    message,
    detail,
  });
  if (["RCH", "RCO", "RFR", "RSC", "RCT"].includes(code))
    return {
      status: "REJECTED",
      code,
      message: `Envío rechazado por el SII (${code}). Revisa su diagnóstico.`,
      detail,
    };
  // Un envío repetido o no localizado no demuestra el rechazo del documento original.
  if (!["EPR", "RPR"].includes(code))
    return pending(
      code === "RPT"
        ? "El SII informa un envío repetido; revisa el documento original sin volver a emitir."
        : "El envío sigue en proceso o requiere consulta en el SII.",
    );
  if (!Array.isArray(data.estadistica) || data.estadistica.length !== 1)
    return pending("El SII aún no confirma el resultado individual de esta boleta.");
  const s = data.estadistica[0];
  if (
    !s ||
    s.tipo !== expected.type ||
    s.informados !== 1 ||
    ![s.aceptados, s.rechazados, s.reparos].every((v) => Number.isInteger(v) && v >= 0 && v <= 1) ||
    s.aceptados + s.rechazados > 1 ||
    (s.rechazados && s.reparos)
  )
    throw new ServiceUnavailableException(
      "Los totales REST no corresponden a esta boleta. Se conserva el estado registrado.",
    );
  if (data.detalle_rep_rech !== undefined && !Array.isArray(data.detalle_rep_rech))
    throw new ServiceUnavailableException("Diagnóstico REST inválido.");
  const diagnostics: Row[] = data.detalle_rep_rech ?? [];
  if (
    diagnostics.some(
      (d) =>
        !d ||
        d.tipo !== expected.type ||
        d.folio !== expected.folio ||
        !["DOK", "RPR", "RCH", "RLV"].includes(d.estado),
    )
  )
    throw new ServiceUnavailableException(
      "El diagnóstico REST no identifica exclusivamente esta boleta.",
    );
  const rejected = diagnostics.some((d) => d.estado === "RCH"),
    repaired = diagnostics.some((d) => ["RPR", "RLV"].includes(d.estado));
  if ((rejected && !s.rechazados) || (s.rechazados && repaired))
    throw new ServiceUnavailableException(
      "El diagnóstico REST contradice sus totales. Se conserva el estado registrado.",
    );
  if (s.rechazados === 1)
    return {
      status: "REJECTED",
      code,
      message: "Boleta rechazada por el SII. Revisa su diagnóstico.",
      detail,
    };
  if (s.reparos === 1 || repaired)
    return {
      status: "ACCEPTED_WITH_REPAIRS",
      code,
      message: "Boleta aceptada con reparos. Revisa el diagnóstico del SII.",
      detail,
    };
  if (s.aceptados === 1 && code === "EPR")
    return { status: "ACCEPTED", code, message: "Boleta aceptada por el SII.", detail };
  return pending("El SII aún no confirma la aceptación individual de esta boleta.");
}
async function jsonResponse(response: Response) {
  if (
    !response.ok ||
    !response.body ||
    !/^application\/json(?:\s*;|$)/i.test(response.headers.get("content-type") ?? "")
  )
    throw new ServiceUnavailableException(
      `Consulta o recepción REST no confirmada (HTTP ${response.status}). No retransmitir automáticamente.`,
    );
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024 * 1024) {
        await reader.cancel();
        throw new ServiceUnavailableException("La respuesta REST excede el tamaño permitido.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Row;
  } catch {
    throw new ServiceUnavailableException(
      "Respuesta REST inválida. Se conserva el estado registrado.",
    );
  }
}
export class BoletaRestTransport {
  constructor(private readonly authenticate: (environment: string) => Promise<string>) {}
  async send(
    xml: string,
    environment: string,
    companyRut: string,
    senderRut: string,
    fileName: string,
    beforeTransmit?: (xml: string) => Promise<void>,
  ) {
    const host = boletaRestHost(environment, true);
    if (!validRut(companyRut) || !validRut(senderRut) || !/^envio_[1-9]\d*\.xml$/.test(fileName))
      throw new UnprocessableEntityException("Identidad de envío REST inválida.");
    const token = await this.authenticate(environment),
      [rutCompany, dvCompany] = normalizeRut(companyRut).split("-"),
      [rutSender, dvSender] = normalizeRut(senderRut).split("-");
    const form = new FormData();
    form.set("rutSender", rutSender!);
    form.set("dvSender", dvSender!);
    form.set("rutCompany", rutCompany!);
    form.set("dvCompany", dvCompany!);
    form.set("archivo", new Blob([Buffer.from(xml, "latin1")], { type: "text/xml" }), fileName);
    if (beforeTransmit) await beforeTransmit(xml);
    const response = await fetch(`https://${host}/recursos/v1/boleta.electronica.envio`, {
      method: "POST",
      headers: {
        Cookie: `TOKEN=${token}`,
        Accept: "application/json",
        "User-Agent": "Zyteron-Control/1.0",
      },
      body: form,
      redirect: "error",
      signal: AbortSignal.timeout(60000),
    });
    return boletaReceipt(await jsonResponse(response), companyRut, senderRut);
  }
  async status(document: Row, companyRut: string) {
    const host = boletaRestHost(document.environment),
      id = track(document.trackId);
    if (!validRut(companyRut) || normalizeRut(document.emitterRut) !== normalizeRut(companyRut))
      throw new UnprocessableEntityException("Emisor de boleta incompatible.");
    const token = await this.authenticate(document.environment),
      rut = normalizeRut(companyRut);
    const response = await fetch(
      `https://${host}/recursos/v1/boleta.electronica.envio/${rut}-${id}`,
      {
        headers: { Cookie: `TOKEN=${token}`, Accept: "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(30000),
      },
    );
    return boletaDocumentStatus(await jsonResponse(response), {
      companyRut,
      trackId: id,
      type: document.documentTypeCode,
      folio: Number(document.folio),
    });
  }
}
