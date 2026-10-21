import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import type { FinanceRepository } from "./finance.repository.js";
import { decryptSecret, encryptSecret, normalizeRut, sha256, type Row } from "./finance.util.js";

type Repository = Pick<
  FinanceRepository,
  "dteEmissionRpc" | "saveFile" | "readFile" | "get" | "settings"
>;
export class DteSubmissionJournal {
  constructor(private readonly repo: Repository) {}
  async claim(documentId: string, actorId: string) {
    if (
      !(await this.repo.dteEmissionRpc<boolean>("finance_claim_dte_issue", {
        p_document: documentId,
        p_actor: actorId,
      }))
    )
      throw new ConflictException(
        "Este intento ya fue adquirido. Revisa su estado antes de volver a emitir.",
      );
  }
  async stage(documentId: string, status: "VALIDATED" | "SIGNED", path: string, hash: string) {
    if (
      !(await this.repo.dteEmissionRpc<boolean>("finance_update_dte_preparation", {
        p_document: documentId,
        p_status: status,
        p_path: path,
        p_sha: hash,
      }))
    )
      throw new ConflictException("El intento cambió mientras se preparaba; no se enviará al SII.");
  }
  async start(document: Row, signedSha: string, envelopeXml: string) {
    const base = `dte/${String(document.environment).toLowerCase()}/${document.documentTypeCode}/${document.folio}`;
    const bytes = Buffer.from(envelopeXml, "latin1"),
      hash = sha256(bytes),
      path = `${base}/envio.xml`;
    await this.repo.saveFile("finance-documents", path, bytes, "application/xml", {
      reuseIdentical: true,
    });
    if (
      !(await this.repo.dteEmissionRpc<boolean>("finance_start_dte_transmission", {
        p_document: document.id,
        p_signed_sha: signedSha,
        p_envelope_sha: hash,
        p_envelope_path: path,
      }))
    )
      throw new ConflictException(
        "El envío ya fue iniciado o abandonado; no se volverá a transmitir.",
      );
    return hash;
  }
  async received(document: Row, signedSha: string, envelopeSha: string, trackId: string) {
    if (!/^(?!0+$)\d{1,30}$/.test(trackId))
      throw new ConflictException("El SII no entregó un Track ID verificable. No retransmitir.");
    const receipt = {
      version: 1,
      documentId: document.id,
      invoiceId: document.invoiceId,
      environment: document.environment,
      documentTypeCode: document.documentTypeCode,
      folio: document.folio,
      emitterRut: document.emitterRut,
      signedSha256: signedSha,
      envelopeSha256: envelopeSha,
      trackId,
    };
    let backedUp = false;
    try {
      await this.repo.saveFile(
        "finance-secrets",
        `dte-transmission-receipts/${document.id}.enc`,
        Buffer.from(encryptSecret(JSON.stringify(receipt)), "utf8"),
        "application/octet-stream",
        { reuseIdentical: true },
      );
      backedUp = true;
    } catch {
      /* El cierre transaccional conserva también el Track ID recibido. */
    }
    try {
      await this.complete(receipt);
    } catch {
      try {
        await this.complete(receipt);
      } catch {
        throw new ConflictException(
          `El SII recibió el envío con Track ID ${trackId}, pero no se confirmó su registro. ${backedUp ? "Usa Recuperar recibo." : "Conserva este Track ID para revisar el registro."} No vuelvas a emitir.`,
        );
      }
    }
  }
  private async complete(receipt: Row) {
    const complete = await this.repo.dteEmissionRpc<boolean>("finance_complete_dte_submission", {
      p_document: receipt.documentId,
      p_signed_sha: receipt.signedSha256,
      p_envelope_sha: receipt.envelopeSha256,
      p_track: receipt.trackId,
    });
    if (!complete)
      throw new ConflictException("No se confirmó el registro del recibo. No vuelvas a emitir.");
  }
  async recover(documentId: string) {
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(documentId))
      throw new BadRequestException("Identificador de documento inválido.");
    const document = await this.repo.get<Row>("tax_documents", documentId);
    if (!document || document.provider !== "SII_DIRECT")
      throw new NotFoundException("Documento SII no disponible.");
    const bytes = await this.repo.readFile(
      "finance-secrets",
      `dte-transmission-receipts/${documentId}.enc`,
    );
    if (!bytes)
      throw new ConflictException(
        "No hay un recibo archivado recuperable. Revisa el envío en el SII; no vuelvas a emitir.",
      );
    let receipt: Row;
    try {
      receipt = JSON.parse(decryptSecret(bytes.toString("utf8")));
    } catch {
      throw new ConflictException("El recibo archivado requiere revisión de integridad.");
    }
    const settings = await this.repo.settings();
    if (
      !receipt ||
      receipt.version !== 1 ||
      receipt.documentId !== document.id ||
      receipt.invoiceId !== document.invoiceId ||
      receipt.environment !== document.environment ||
      receipt.documentTypeCode !== document.documentTypeCode ||
      receipt.folio !== document.folio ||
      normalizeRut(receipt.emitterRut) !== normalizeRut(document.emitterRut) ||
      normalizeRut(document.emitterRut) !== normalizeRut(settings.companyRut) ||
      receipt.signedSha256 !== document.xmlSignedSha256 ||
      !/^(?!0+$)\d{1,30}$/.test(String(receipt.trackId)) ||
      !/^[a-f0-9]{64}$/.test(String(receipt.envelopeSha256))
    )
      throw new ConflictException("El recibo no corresponde al documento archivado.");
    const base = `dte/${String(document.environment).toLowerCase()}/${document.documentTypeCode}/${document.folio}`;
    if (document.xmlSignedPath !== `${base}/signed.xml`)
      throw new ConflictException("La ubicación archivada requiere revisión.");
    const [signed, envelope] = await Promise.all([
      this.repo.readFile("finance-documents", `${base}/signed.xml`),
      this.repo.readFile("finance-documents", `${base}/envio.xml`),
    ]);
    if (
      !signed ||
      !envelope ||
      sha256(signed) !== receipt.signedSha256 ||
      sha256(envelope) !== receipt.envelopeSha256
    )
      throw new ConflictException("El envío archivado no coincide con el recibo.");
    await this.complete(receipt);
    return receipt.trackId as string;
  }
  fail(documentId: string, message: string) {
    return this.repo.dteEmissionRpc("finance_fail_dte_issue", {
      p_document: documentId,
      p_message: message.slice(0, 500),
    });
  }
}
