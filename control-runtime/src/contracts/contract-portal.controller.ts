import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Public } from "../auth/roles.decorator.js";
import { createServerSupabase } from "../domain/server-supabase.js";
import { ContractsRepository } from "./contracts.repository.js";
import { ContractDocumentService } from "./contract-document.service.js";

const nonces = new Map<string, number>();
type BridgeRequest = { ip?: string; headers: Record<string, string | undefined>; rawBody?: Buffer };
export function verifyContractDocumentBridge(
  request: BridgeRequest,
  key = process.env.CONTROL_BRIDGE_KEY,
) {
  const time = request.headers["x-zyteron-time"] || "",
    nonce = request.headers["x-zyteron-nonce"] || "",
    signature = request.headers["x-zyteron-signature"] || "";
  if (
    !key ||
    !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(request.ip || "") ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    !/^[a-f0-9-]{36}$/.test(nonce) ||
    !/^\d{13}$/.test(time) ||
    Math.abs(Date.now() - Number(time)) > 10000
  )
    throw new UnauthorizedException("Canal documental inválido.");
  const expected = createHmac("sha256", key)
    .update(`portal-contract-document\n${time}\n${nonce}\n`)
    .update(request.rawBody || Buffer.alloc(0))
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex")))
    throw new UnauthorizedException("Canal documental inválido.");
  for (const [n, until] of nonces) if (until < Date.now()) nonces.delete(n);
  if (nonces.has(nonce)) throw new UnauthorizedException("Solicitud repetida.");
  nonces.set(nonce, Date.now() + 20000);
}

@Controller("internal/portal-contract-document")
export class ContractPortalDocumentController {
  constructor(
    private readonly repository: ContractsRepository,
    private readonly renderer: ContractDocumentService,
  ) {}
  @Post() @Public() async document(@Req() request: BridgeRequest, @Body() input: unknown) {
    verifyContractDocumentBridge(request);
    const body = input as Record<string, unknown>;
    if (
      !body ||
      Object.keys(body).some((k) => !["userId", "contractId"].includes(k)) ||
      typeof body.userId !== "string" ||
      body.userId.length > 100 ||
      typeof body.contractId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(body.contractId)
    )
      throw new BadRequestException("Contrato inválido.");
    return this.forCustomer(body.userId, body.contractId);
  }
  async forCustomer(userId: string, contractId: string, db = createServerSupabase()) {
    if (!db) throw new NotFoundException("Contrato no disponible.");
    const [identity, link] = await Promise.all([
      db
        .from("User")
        .select("id,role,accountStatus,emailVerifiedAt")
        .eq("id", userId)
        .maybeSingle(),
      db.from("zyteron_legacy_client_link").select("client_id").eq("user_id", userId).maybeSingle(),
    ]);
    if (
      identity.error ||
      link.error ||
      identity.data?.role !== "CLIENT" ||
      identity.data.accountStatus !== "ACTIVE" ||
      !identity.data.emailVerifiedAt ||
      !link.data
    )
      throw new NotFoundException("Contrato no disponible.");
    const [settings, record] = await Promise.all([
      db
        .from("client_portal_settings")
        .select("enabled,documents_visible")
        .eq("client_id", link.data.client_id)
        .maybeSingle(),
      db
        .from("client_contracts")
        .select(
          "client_id,portal_visible,portal_review_visible,approval_status,frozen_at,status,archived_at,original_document_id,signed_document_id,document_id",
        )
        .eq("id", contractId)
        .maybeSingle(),
    ]);
    const row = record.data;
    if (
      settings.error ||
      record.error ||
      !settings.data?.enabled ||
      !settings.data.documents_visible ||
      !row ||
      row.client_id !== link.data.client_id ||
      row.archived_at
    )
      throw new NotFoundException("Contrato no disponible.");
    const published = row.portal_visible && row.approval_status === "APPROVED" && row.frozen_at;
    const review =
      row.portal_review_visible && ["DRAFT", "IN_REVIEW"].includes(row.status) && !row.frozen_at;
    if (!published && !review) throw new NotFoundException("Contrato no disponible.");
    const contract = await this.repository.get(contractId);
    if (!contract || contract.clientId !== link.data.client_id)
      throw new NotFoundException("Contrato no disponible.");
    if (review) {
      const rendered = await this.renderer.render(contract);
      if (rendered.unresolved.length)
        throw new BadRequestException("El borrador todavía tiene información pendiente.");
      const pdf = await PDFDocument.load(rendered.bytes),
        font = await pdf.embedFont(StandardFonts.HelveticaBold);
      for (const page of pdf.getPages())
        page.drawText("BORRADOR PARA REVISION - SIN FIRMA", {
          x: 60,
          y: 61,
          size: 7,
          font,
          color: rgb(0.5, 0.35, 0.15),
        });
      return {
        filename: `BORRADOR-${rendered.filename}`,
        contentBase64: Buffer.from(await pdf.save()).toString("base64"),
      };
    }
    // Frozen contracts must serve their stored bytes, never a regenerated version.
    const documentId = row.signed_document_id || row.original_document_id || row.document_id;
    if (!documentId) throw new NotFoundException("Copia contractual no disponible.");
    const document = await db
      .from("documents")
      .select("id,status,classification,client_visible,current_version_id")
      .eq("id", documentId)
      .maybeSingle();
    if (
      document.error ||
      !document.data?.client_visible ||
      document.data.status !== "PUBLISHED" ||
      !["CLIENT", "PUBLIC"].includes(document.data.classification)
    )
      throw new NotFoundException("Copia contractual no publicada.");
    const [links, version] = await Promise.all([
      db
        .from("document_links")
        .select("document_id")
        .eq("document_id", documentId)
        .eq("link_type", "CLIENT")
        .eq("linked_id", link.data.client_id),
      db
        .from("document_versions")
        .select("filename,storage_path,status,malware_status,mime_type")
        .eq("id", document.data.current_version_id)
        .eq("document_id", documentId)
        .maybeSingle(),
    ]);
    if (
      links.error ||
      version.error ||
      !links.data?.length ||
      !version.data ||
      version.data.status !== "AVAILABLE" ||
      version.data.malware_status !== "CLEAN" ||
      version.data.mime_type !== "application/pdf"
    )
      throw new NotFoundException("Copia contractual no disponible.");
    const file = await db.storage.from("enterprise-documents").download(version.data.storage_path);
    if (file.error || !file.data) throw new NotFoundException("Copia contractual no disponible.");
    return {
      filename: version.data.filename,
      contentBase64: Buffer.from(await file.data.arrayBuffer()).toString("base64"),
    };
  }
}
