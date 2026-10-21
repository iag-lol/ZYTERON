import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { FinanceContext } from "./finance.core.js";
import {
  DteCertificateProvider,
  parseCaf,
  SiiDirectDteProvider,
  type DteCompany,
} from "./finance.dte-providers.js";
import { decodeUpload } from "./finance.dte.js";
import {
  assertCertification,
  certificationDocumentXml,
  certificationEnvelope,
  certificationTotals,
  validateCertificationXml,
  type CertificationDocument,
} from "./finance.sii-certification.js";
import { parseOfficialCertificationSet, previewCertificationFolios } from "./finance.sii-set.js";
import { verifySiiXmlSignatures } from "./finance.sii-signatures.js";
import {
  certificationGuideBook,
  certificationExchangeReceipt,
  certificationConsumption,
  certificationPurchaseSalesBook,
  type CertificationBookEntry,
  type CertificationGuideEntry,
} from "./finance.sii-books.js";
import { renderPrintedDte } from "./finance.dte-print.js";
import {
  decryptSecret,
  encryptSecret,
  normalizeRut,
  sha256,
  type FinanceActor,
  type Row,
} from "./finance.util.js";

const text = (max: number) => z.string().trim().min(1).max(max);
const number = z.number().finite().min(0).max(1e11);
const party = z.strictObject({
  rut: text(16),
  legalName: text(100),
  businessActivity: text(80),
  address: text(70),
  commune: text(20),
  city: z.string().max(20).optional(),
  foreignId: text(20).optional(),
  nationality: z.number().int().positive().optional(),
});
const line = z.strictObject({
  description: text(80),
  quantity: number.positive().optional(),
  unitPrice: number.optional(),
  unit: text(4).optional(),
  exempt: z.boolean().optional(),
  discountPct: number.max(100).optional(),
  surchargePct: number.max(100).optional(),
  liquidationAmount: z.number().int().min(-1e11).max(1e11).optional(),
  liquidatedType: z.number().int().positive().optional(),
});
const adjustment = z.strictObject({
  movement: z.enum(["D", "R"]),
  kind: z.enum(["%", "$"]),
  value: number.positive(),
  exempt: z.boolean().optional(),
  description: text(45),
});
const dispatch = z.strictObject({
  transfer: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
    z.literal(8),
    z.literal(9),
  ]),
  responsibility: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  destinationAddress: text(70),
  destinationCommune: text(20),
});
const exportData = z.strictObject({
  currency: text(15),
  exchangeRateCLP: number.positive().max(999999.9999),
  service: z.union([z.literal(3), z.literal(4), z.literal(5)]).optional(),
  paymentCode: number.int().positive().optional(),
  saleMode: number.int().positive().optional(),
  saleClause: number.int().positive().optional(),
  clauseTotal: number.optional(),
  transportCode: number.int().positive().optional(),
  loadingPort: number.int().positive().optional(),
  unloadingPort: number.int().positive().optional(),
  tareUnit: number.int().positive().optional(),
  grossWeightUnit: number.int().positive().optional(),
  netWeightUnit: number.int().positive().optional(),
  packageType: number.int().positive().optional(),
  packageCount: number.int().positive().optional(),
  freight: number.positive().optional(),
  insurance: number.positive().optional(),
  receiverCountry: number.int().positive(),
  destinationCountry: number.int().positive(),
});
const purchaseEntry = z.strictObject({
  type: number.int().positive(),
  folio: number.int().positive(),
  date: z.iso.date(),
  counterpartyRut: text(16),
  counterpartyName: text(50),
  net: number.int(),
  exempt: number.int(),
  vat: number.int(),
  retained: number.int().optional(),
  commonVat: number.int().optional(),
  nonRecoverableVat: z
    .strictObject({
      code: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(9)]),
      amount: number.int(),
    })
    .optional(),
  reference: z
    .strictObject({ type: number.int().positive(), folio: number.int().positive() })
    .optional(),
});
export const certificationCaseForm = z.strictObject({
  caseId: text(20),
  receiver: party,
  lines: z.array(line).min(1).max(1000),
  referenceCode: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  referenceReason: text(90).optional(),
  adjustments: z.array(adjustment).max(20).optional(),
  commissions: z
    .array(
      z.strictObject({
        description: text(60),
        net: z.number().int().min(-1e11).max(1e11),
        exempt: z.number().int().min(-1e11).max(1e11),
      }),
    )
    .max(20)
    .optional(),
  retention: z.strictObject({ code: number.int().positive(), rate: number.max(19) }).optional(),
  dispatch: dispatch.optional(),
  export: exportData.optional(),
  additionalReferences: z
    .array(
      z.strictObject({
        type: number.int().positive(),
        folio: text(18),
        date: text(10),
        reason: text(90),
      }),
    )
    .max(10)
    .optional(),
});
export const certificationPlanForm = z.strictObject({
  runId: z.uuid(),
  setFile: z.unknown(),
  date: z.iso.date(),
  cases: z.array(certificationCaseForm).min(1).max(500),
  reviewed: z.literal(true),
  purchaseEntries: z.array(purchaseEntry).max(500).optional(),
  commonFactor: z.number().min(0).max(1).optional(),
  guideStates: z
    .record(
      z.string(),
      z.strictObject({
        annulled: z.union([z.literal(1), z.literal(2)]).optional(),
        billedCaseId: text(20).optional(),
        billedPaperReference: z
          .strictObject({ type: z.literal(30), folio: number.int().positive(), date: z.iso.date() })
          .optional(),
      }),
    )
    .optional(),
});
type Artifact = {
  name: string;
  kind: string;
  storagePath: string;
  sha256: string;
  caseIds?: string[];
};
const schemas: Record<string, string> = {
  DTE: "EnvioDTE_v10.xsd",
  BOLETA: "EnvioBOLETA_v11.xsd",
  LIBRO_CV: "LibroCV_v10.xsd",
  LIBRO_GUIA: "LibroGuia_v10.xsd",
  CONSUMO: "ConsumoFolio_v10.xsd",
};
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new BadRequestException(
      result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    );
  return result.data;
};

const setHash = z.string().regex(/^[a-f0-9]{64}$/);
const draftPayload = z.strictObject({
  runId: z.uuid(),
  date: z.iso.date(),
  cases: z.array(z.record(z.string(), z.json())).max(500),
  reviewed: z.array(text(20)).max(500),
  purchaseEntries: z.array(z.record(z.string(), z.json())).max(500),
  commonFactor: z.number().min(0).max(1),
  guideStates: z.record(z.string(), z.record(z.string(), z.json())),
});

@Injectable()
export class SiiCertificationWorkspace {
  constructor(
    private readonly ctx: FinanceContext,
    private readonly certificates: DteCertificateProvider,
    private readonly sii: SiiDirectDteProvider,
  ) {}
  private get repo() {
    return this.ctx.repo;
  }
  private async context(actor: FinanceActor) {
    this.ctx.require(actor, "dte.manage");
    if (!this.repo.configured())
      throw new ServiceUnavailableException("Persistencia no configurada para certificación.");
    const settings = await this.repo.settings();
    assertCertification(settings.dteEnvironment);
    if (settings.dteProvider !== "SII_DIRECT")
      throw new ConflictException("La certificación requiere SII directo.");
    const company: DteCompany = parse(
      z.strictObject({
        rut: text(16),
        legalName: text(100),
        businessActivity: text(80),
        activityCode: z.number().int().positive(),
        address: text(70),
        commune: text(20),
        city: z.string().nullable(),
        resolutionNumber: z.number().int().nonnegative(),
        resolutionDate: z.iso.date(),
      }),
      {
        rut: settings.companyRut,
        legalName: settings.companyLegalName,
        businessActivity: settings.companyBusinessActivity,
        activityCode: Number(settings.companyActivityCode),
        address: settings.companyAddress,
        commune: settings.companyCommune,
        city: settings.companyCity,
        resolutionNumber: Number(settings.dteResolutionNumber),
        resolutionDate: settings.dteResolutionDate,
      },
    );
    return { company, settings };
  }
  async overview(actor: FinanceActor) {
    const { company } = await this.context(actor),
      runs = await this.repo.list<Row>(
        "sii_certification_runs",
        { companyRut: company.rut },
        { order: "createdAt", limit: 30 },
      );
    return {
      environment: "CERTIFICATION",
      company,
      runs,
      transmissionRequires: "dte.issue",
      productionAuthorized: false,
    };
  }
  async draft(hash: string, actor: FinanceActor) {
    const { company } = await this.context(actor);
    parse(setHash, hash);
    if (!actor.userId) throw new BadRequestException("Falta identidad autenticada.");
    const saved = (
      await this.repo.list<Row>(
        "sii_certification_drafts",
        {
          companyRut: company.rut,
          createdBy: actor.userId,
          setSha256: hash,
        },
        { order: "updatedAt", limit: 1 },
      )
    )[0];
    return saved ? { version: saved.version, payload: parse(draftPayload, saved.payload) } : null;
  }
  async saveDraft(hash: string, body: unknown, actor: FinanceActor) {
    const { company } = await this.context(actor);
    parse(setHash, hash);
    if (!actor.userId) throw new BadRequestException("Falta identidad autenticada.");
    const form = parse(
      z.strictObject({ version: z.number().int().nonnegative(), payload: draftPayload }),
      body,
    );
    if (Buffer.byteLength(JSON.stringify(form.payload)) > 4 * 1024 * 1024)
      throw new BadRequestException("El borrador excede 4 MB.");
    const version = await this.repo.certificationRpc<number>(
      "finance_save_sii_certification_draft",
      {
        p_company: company.rut,
        p_actor: actor.userId,
        p_set_sha: hash,
        p_version: form.version,
        p_payload: form.payload,
      },
    );
    return { version };
  }
  private async saveEncrypted(path: string, bytes: Buffer) {
    const existing = await this.repo.readFile("finance-secrets", path);
    const same = (value: Buffer) =>
      Buffer.from(decryptSecret(value.toString("utf8")), "base64").equals(bytes);
    if (existing) {
      if (!same(existing)) throw new ConflictException("El archivo privado existente no coincide.");
      return;
    }
    try {
      await this.repo.saveFile(
        "finance-secrets",
        path,
        Buffer.from(encryptSecret(bytes.toString("base64")), "utf8"),
        "application/octet-stream",
      );
    } catch (error) {
      const raced = await this.repo.readFile("finance-secrets", path);
      if (!raced || !same(raced)) throw error;
    }
  }
  async inspect(body: Row, actor: FinanceActor) {
    await this.context(actor);
    const file = decodeUpload(body.file, "Set oficial", 512 * 1024),
      set = parseOfficialCertificationSet(file.bytes);
    const auth = new Set(
      (
        await this.repo.list<Row>("tax_folio_authorizations", {
          environment: "CERTIFICATION",
          status: "ACTIVE",
        })
      ).map((a) => a.id),
    );
    const available = (
      await this.repo.list<Row>(
        "tax_folios",
        { environment: "CERTIFICATION", status: "AVAILABLE" },
        { order: "folio", ascending: true },
      )
    ).filter((f) => auth.has(f.authorizationId));
    let candidates: ReturnType<typeof previewCertificationFolios> = [],
      folioError: string | null = null;
    try {
      candidates = previewCertificationFolios(
        set,
        available.map((f) => ({ type: f.documentTypeCode, folio: f.folio })),
      );
    } catch (error) {
      folioError = (error as Error).message;
    }
    return { ...set, candidates, folioError, reserved: false };
  }
  async clientParty(id: string, actor: FinanceActor) {
    await this.context(actor);
    this.ctx.require(actor, "invoice.view");
    await this.ctx.assertClientAccess(actor, id);
    const client = await this.ctx.sources.client(id);
    if (!client) throw new BadRequestException("Cliente no encontrado en el alcance permitido.");
    return {
      rut: client.billingRut || client.rut || "",
      legalName: client.billingLegalName || client.legalName || "",
      businessActivity: client.billingActivity || client.businessActivity || "",
      address: client.billingAddress || client.address || "",
      commune: client.commune || "",
    };
  }
  async detail(id: string, actor: FinanceActor) {
    const { company } = await this.context(actor);
    parse(z.uuid(), id);
    const run = await this.ctx.must<Row>("sii_certification_runs", id, "Proceso de certificación");
    if (normalizeRut(run.companyRut) !== normalizeRut(company.rut))
      throw new UnprocessableEntityException("Proceso de otra empresa.");
    return {
      run,
      cases: await this.repo.list<Row>(
        "sii_certification_cases",
        { runId: id },
        { order: "caseId", ascending: true },
      ),
      artifacts: await this.repo.list<Row>("sii_certification_artifacts", { runId: id }),
      submissions: await this.repo.list<Row>(
        "sii_certification_submissions",
        { runId: id },
        { order: "id", ascending: true },
      ),
    };
  }
  async prepare(body: unknown, actor: FinanceActor) {
    const { company } = await this.context(actor),
      form = parse(certificationPlanForm, body);
    if (!actor.userId)
      throw new BadRequestException("Falta identidad autenticada para reservar folios.");
    const source = decodeUpload(form.setFile, "Set oficial", 512 * 1024),
      set = parseOfficialCertificationSet(source.bytes);
    const existing = await this.repo.findOne<Row>("sii_certification_runs", {
      companyRut: company.rut,
      setSha256: set.sha256,
    });
    const requested = JSON.parse(JSON.stringify({ ...form, setFile: { sha256: set.sha256 } }));
    if (existing) {
      if (existing.id !== form.runId || !isDeepStrictEqual(existing.plan.request, requested))
        throw new ConflictException(
          "Este set ya tiene un proceso reservado; abre su detalle antes de cambiar o reenviar.",
        );
      return this.detail(existing.id, actor);
    }
    if (
      form.cases.length !== set.cases.length ||
      form.cases.some((c, i) => c.caseId !== set.cases[i]!.id)
    )
      throw new BadRequestException("Los casos deben coincidir exactamente con el set y su orden.");
    const auths = await this.repo.list<Row>("tax_folio_authorizations", {
        environment: "CERTIFICATION",
        status: "ACTIVE",
      }),
      authById = new Map(auths.map((a) => [a.id, a]));
    const available = (
      await this.repo.list<Row>(
        "tax_folios",
        { environment: "CERTIFICATION", status: "AVAILABLE" },
        { order: "folio", ascending: true },
      )
    ).filter((f) => authById.has(f.authorizationId));
    const candidates = previewCertificationFolios(
        set,
        available.map((f) => ({ type: f.documentTypeCode, folio: f.folio })),
      ),
      certificate = this.certificates.load(this.sii.secretRef());
    if (
      Date.parse(certificate.certificate.validFrom) > Date.now() ||
      Date.parse(certificate.certificate.validTo) <= Date.now()
    )
      throw new ConflictException("Certificado fuera de vigencia.");
    const caffiles = new Map<string, ReturnType<typeof parseCaf>>(),
      documents: Array<{
        input: CertificationDocument;
        xml: string;
        totals: ReturnType<typeof certificationTotals>;
        folioId: string;
      }> = [];
    for (let i = 0; i < form.cases.length; i++) {
      const c = form.cases[i]!,
        official = set.cases[i]!,
        candidate = candidates[i]!,
        f = available.find(
          (f) => f.documentTypeCode === candidate.type && f.folio === candidate.folio,
        )!,
        a = authById.get(f.authorizationId)!;
      if (!caffiles.has(a.id)) {
        const encrypted = await this.repo.readFile("finance-secrets", a.cafStoragePath);
        if (!encrypted)
          throw new ConflictException(
            "El CAF existe en el catálogo pero su objeto privado no pudo leerse.",
          );
        const clear = decryptSecret(encrypted.toString("utf8"));
        if (sha256(Buffer.from(clear, "latin1")) !== a.cafSha256)
          throw new ConflictException("El CAF no coincide con su huella almacenada.");
        caffiles.set(a.id, parseCaf(clear));
      }
      const target = official.referenceCaseId
        ? documents.find((d) => d.input.caseId === official.referenceCaseId)
        : undefined;
      if (target && (!c.referenceCode || !c.referenceReason))
        throw new BadRequestException(
          `Completa motivo y código de referencia del caso ${c.caseId}.`,
        );
      const { caseId, additionalReferences, referenceCode, referenceReason, ...fields } = c;
      if (target) {
        if (normalizeRut(c.receiver.rut) !== normalizeRut(target.input.receiver.rut))
          throw new BadRequestException(
            `El receptor de la nota ${caseId} debe coincidir con su documento original.`,
          );
        if (!isDeepStrictEqual(c.retention ?? null, target.input.retention ?? null))
          throw new BadRequestException(
            `El régimen de retención de ${caseId} no coincide con su referencia.`,
          );
        if (
          c.export &&
          (c.export.currency !== target.input.export?.currency ||
            c.export.exchangeRateCLP !== target.input.export?.exchangeRateCLP)
        )
          throw new BadRequestException(
            `La nota de exportación ${caseId} requiere moneda y conversión de su documento original.`,
          );
      }
      const input: CertificationDocument = {
        ...fields,
        caseId,
        type: official.type,
        folio: candidate.folio,
        date: form.date,
        environment: "CERTIFICATION",
        company,
        references: [
          ...(target
            ? [
                {
                  type: target.input.type,
                  folio: String(target.input.folio),
                  date: target.input.date,
                  code: referenceCode!,
                  reason: referenceReason!,
                },
              ]
            : []),
          ...(additionalReferences ?? []),
        ],
      };
      const built = certificationDocumentXml(input, caffiles.get(a.id)!, certificate);
      documents.push({ input, ...built, folioId: f.id });
    }
    const payloads: Array<{ name: string; kind: string; bytes: Buffer; caseIds?: string[] }> = [];
    if (!process.env.DTE_SII_OFFICE?.trim())
      throw new ConflictException(
        "Falta verificar y configurar la oficina SII del emisor para las muestras impresas.",
      );
    for (const section of set.sections.filter((s) => s.caseIds.length)) {
      const docs = documents.filter((d) => section.caseIds.includes(d.input.caseId)),
        boleta = docs.every((d) => [39, 41].includes(d.input.type)),
        xml = certificationEnvelope(
          docs.map((d) => d.xml),
          company,
          this.sii.senderRut(),
          certificate,
          "CERTIFICATION",
        );
      await validateCertificationXml(xml, boleta ? "EnvioBOLETA_v11.xsd" : "EnvioDTE_v10.xsd");
      verifySiiXmlSignatures(xml, certificate.certificate.fingerprint256);
      payloads.push({
        name: `set-${section.attention}.xml`,
        kind: boleta ? "BOLETA" : "DTE",
        bytes: Buffer.from(xml, "latin1"),
        caseIds: section.caseIds,
      });
      for (const d of docs) {
        const signed = Buffer.from(
          `<?xml version="1.0" encoding="ISO-8859-1"?>\n${d.xml.replace('<DTE version="1.0">', '<DTE xmlns="http://www.sii.cl/SiiDte" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0">')}`,
          "latin1",
        );
        const expected = {
          documentTypeCode: d.input.type,
          folio: d.input.folio,
          environment: "CERTIFICATION",
          status: "SIGNED",
          emitterRut: company.rut,
          receiverRut: d.input.receiver.rut,
          issueDate: d.input.date,
          totalAmount: d.totals.total,
        };
        const printable = await renderPrintedDte(
          signed,
          Buffer.from(xml, "latin1"),
          expected,
          process.env.DTE_SII_OFFICE,
        );
        payloads.push({ name: `caso-${d.input.caseId}.pdf`, kind: "PDF", bytes: printable });
        if (
          [33, 34, 43, 46].includes(d.input.type) ||
          (d.input.type === 52 && [1, 9].includes(d.input.dispatch!.transfer))
        )
          payloads.push({
            name: `caso-${d.input.caseId}-cedible.pdf`,
            kind: "PDF",
            bytes: await renderPrintedDte(
              signed,
              Buffer.from(xml, "latin1"),
              expected,
              process.env.DTE_SII_OFFICE,
              "TRANSFERABLE",
            ),
          });
      }
    }
    const primary = documents.filter((d) =>
      /^SET BASICO -/.test(set.cases.find((c) => c.id === d.input.caseId)!.section),
    );
    const sales = primary.length
      ? primary
      : documents.filter((d) =>
          set.cases.find((c) => c.id === d.input.caseId)!.section.startsWith("SET FACTURA EXENTA"),
        );
    const bookContext = {
      environment: "CERTIFICATION" as const,
      company,
      senderRut: this.sii.senderRut(),
      period: form.date.slice(0, 7),
      notificationFolio: 1,
    };
    const boletas = documents.filter((d) => [39, 41].includes(d.input.type));
    if (boletas.length) {
      const xml = certificationConsumption(
        bookContext,
        form.date,
        1,
        boletas.map((d) => ({
          type: d.input.type as 39 | 41,
          folio: d.input.folio,
          date: form.date,
          status: "USED" as const,
          net: d.totals.net,
          exempt: d.totals.exempt,
          vat: d.totals.tax,
          total: d.totals.total,
        })),
        certificate,
      );
      payloads.push({
        name: "consumo-folios.xml",
        kind: "CONSUMO",
        bytes: Buffer.from(xml, "latin1"),
        caseIds: [],
      });
    }
    if (sales.length) {
      const entries: CertificationBookEntry[] = sales.map((d) => ({
        type: d.input.type,
        folio: d.input.folio,
        date: d.input.date,
        counterpartyRut: d.input.receiver.rut,
        counterpartyName: d.input.receiver.legalName,
        net: d.totals.net,
        exempt: d.totals.exempt,
        vat: d.totals.tax,
      }));
      const xml = certificationPurchaseSalesBook(bookContext, "VENTA", entries, certificate);
      payloads.push({
        name: "libro-ventas.xml",
        kind: "LIBRO_CV",
        bytes: Buffer.from(xml, "latin1"),
        caseIds: [],
      });
    }
    if (set.sections.some((s) => s.name.startsWith("SET LIBRO DE COMPRAS"))) {
      if (!form.purchaseEntries?.length)
        throw new BadRequestException("Faltan los documentos del set de libro de compras.");
      const xml = certificationPurchaseSalesBook(
        { ...bookContext, notificationFolio: 2 },
        "COMPRA",
        form.purchaseEntries as CertificationBookEntry[],
        certificate,
        form.commonFactor,
      );
      payloads.push({
        name: "libro-compras.xml",
        kind: "LIBRO_CV",
        bytes: Buffer.from(xml, "latin1"),
        caseIds: [],
      });
    }
    const guides = documents.filter((d) => d.input.type === 52);
    if (guides.length) {
      const entries: CertificationGuideEntry[] = guides.map((d) => {
        const state = form.guideStates?.[d.input.caseId],
          billed = state?.billedCaseId
            ? documents.find((x) => x.input.caseId === state.billedCaseId)
            : undefined;
        if (state?.billedCaseId && !billed)
          throw new BadRequestException("La guía referencia una factura ausente del proceso.");
        if (
          state?.billedCaseId &&
          (!billed ||
            ![33, 34].includes(billed.input.type) ||
            normalizeRut(billed.input.receiver.rut) !== normalizeRut(d.input.receiver.rut) ||
            billed.totals.total < d.totals.total)
        )
          throw new BadRequestException(
            "La factura vinculada a la guía debe corresponder al mismo receptor y cubrir su monto.",
          );
        if (state?.billedCaseId && state.billedPaperReference)
          throw new BadRequestException("La guía no admite dos referencias de facturación.");
        if (state?.billedCaseId !== undefined && !state.billedCaseId && !state.billedPaperReference)
          throw new BadRequestException("Completa la factura de referencia de la guía.");
        return {
          folio: d.input.folio,
          date: d.input.date,
          receiverRut: d.input.receiver.rut,
          receiverName: d.input.receiver.legalName,
          transfer: d.input.dispatch!.transfer as CertificationGuideEntry["transfer"],
          net: d.totals.net,
          vat: d.totals.tax,
          total: d.totals.total,
          annulled: state?.annulled,
          billedReference: billed
            ? { type: billed.input.type, folio: billed.input.folio, date: billed.input.date }
            : state?.billedPaperReference,
        };
      });
      const xml = certificationGuideBook(
        { ...bookContext, notificationFolio: 3 },
        entries,
        certificate,
      );
      payloads.push({
        name: "libro-guias.xml",
        kind: "LIBRO_GUIA",
        bytes: Buffer.from(xml, "latin1"),
        caseIds: [],
      });
    }
    payloads.push({ name: "set-oficial.txt", kind: "SET_SOURCE", bytes: source.bytes });
    for (const p of payloads.filter((p) => schemas[p.kind])) {
      await validateCertificationXml(p.bytes.toString("latin1"), schemas[p.kind]!);
      verifySiiXmlSignatures(p.bytes.toString("latin1"), certificate.certificate.fingerprint256);
    }
    const artifacts: Artifact[] = [];
    for (const p of payloads) {
      const hash = sha256(p.bytes),
        path = `sii-certification/${form.runId}/${hash}.${p.kind === "SET_SOURCE" ? "enc" : p.kind === "PDF" ? "pdf" : "xml"}`;
      if (p.kind === "SET_SOURCE") await this.saveEncrypted(path, p.bytes);
      else
        await this.repo.saveFile(
          "finance-documents",
          path,
          p.bytes,
          p.kind === "PDF" ? "application/pdf" : "application/xml",
          { reuseIdentical: true },
        );
      artifacts.push({
        name: p.name,
        kind: p.kind,
        storagePath: path,
        sha256: hash,
        ...(p.caseIds ? { caseIds: p.caseIds } : {}),
      });
    }
    const plan = {
      companyRut: company.rut,
      request: requested,
      cases: documents.map((d) => ({
        caseId: d.input.caseId,
        type: d.input.type,
        folio: d.input.folio,
        folioId: d.folioId,
        totals: d.totals,
      })),
    };
    await this.repo.certificationRpc("finance_prepare_sii_certification", {
      p_run: form.runId,
      p_set_sha: set.sha256,
      p_plan: plan,
      p_artifacts: artifacts,
      p_actor: actor.userId,
    });
    await this.repo.audit(
      actor,
      "SII_CERTIFICATION_PREPARED",
      "SII_CERTIFICATION",
      form.runId,
      "Set de certificación validado y reservado",
      { setSha256: set.sha256, cases: documents.length },
    );
    return this.detail(form.runId, actor);
  }
  async download(runId: string, artifactId: string, actor: FinanceActor) {
    await this.detail(runId, actor);
    parse(z.uuid(), artifactId);
    const artifact = await this.ctx.must<Row>(
      "sii_certification_artifacts",
      artifactId,
      "Archivo de certificación",
    );
    const extension =
      artifact.kind === "SET_SOURCE" ? "enc" : artifact.kind === "PDF" ? "pdf" : "xml";
    if (
      artifact.runId !== runId ||
      !/^[a-f0-9]{64}$/.test(artifact.sha256) ||
      artifact.storagePath !== `sii-certification/${runId}/${artifact.sha256}.${extension}`
    )
      throw new BadRequestException("Archivo ajeno al proceso.");
    const stored = await this.repo.readFile(
      artifact.kind === "SET_SOURCE" ? "finance-secrets" : "finance-documents",
      artifact.storagePath,
    );
    if (!stored) throw new ServiceUnavailableException("El objeto del archivo no pudo leerse.");
    const bytes =
      artifact.kind === "SET_SOURCE"
        ? Buffer.from(decryptSecret(stored.toString("utf8")), "base64")
        : stored;
    if (sha256(bytes) !== artifact.sha256)
      throw new ConflictException("La huella del archivo no coincide.");
    return {
      bytes,
      mime:
        artifact.kind === "SET_SOURCE"
          ? "text/plain"
          : artifact.kind === "PDF"
            ? "application/pdf"
            : "application/xml",
      fileName: artifact.name,
    };
  }
  private async submission(runId: string, id: string, actor: FinanceActor) {
    const detail = await this.detail(runId, actor);
    parse(z.uuid(), id);
    const submission = detail.submissions.find((s) => s.id === id);
    if (!submission) throw new BadRequestException("Envío ajeno al proceso.");
    const artifact = detail.artifacts.find((a) => a.id === submission.artifactId);
    if (!artifact || !schemas[artifact.kind])
      throw new BadRequestException("Archivo no transmitible.");
    return { detail, submission, artifact };
  }
  async recoverReceipt(runId: string, id: string, actor: FinanceActor) {
    this.ctx.require(actor, "dte.issue");
    const { detail, submission, artifact } = await this.submission(runId, id, actor);
    if (!["SENDING", "UNKNOWN"].includes(submission.status)) return detail;
    const bytes = await this.repo.readFile(
      "finance-secrets",
      `certification-receipts/${runId}/${id}.enc`,
    );
    if (!bytes)
      throw new ConflictException(
        "No se encontró un recibo recuperable. Revisa el envío en el SII; no se reenviará automáticamente.",
      );
    const receipt = parse(
      z.strictObject({
        runId: z.uuid(),
        submissionId: z.uuid(),
        artifactSha256: setHash,
        result: z.strictObject({
          trackId: z.string().regex(/^[0-9]{1,30}$/),
          status: z.literal("0"),
        }),
      }),
      JSON.parse(Buffer.from(decryptSecret(bytes.toString("utf8")), "base64").toString("utf8")),
    );
    if (
      receipt.runId !== runId ||
      receipt.submissionId !== id ||
      receipt.artifactSha256 !== artifact.sha256
    )
      throw new ConflictException("El recibo no corresponde al archivo registrado.");
    await this.repo.certificationRpc("finance_complete_sii_certification_submission", {
      p_id: id,
      p_track: receipt.result.trackId,
      p_response: receipt.result,
      p_unknown: false,
    });
    return this.detail(runId, actor);
  }
  async refresh(runId: string, id: string, actor: FinanceActor) {
    const { detail, submission } = await this.submission(runId, id, actor);
    if (
      !submission.trackId ||
      !["SUBMITTED", "ACCEPTED", "ACCEPTED_WITH_REPAIRS", "REJECTED"].includes(submission.status)
    )
      throw new ConflictException("Falta un Track ID confirmado para consultar este envío.");
    const result = await this.sii.getSubmissionStatus(
      submission.trackId,
      "CERTIFICATION",
      detail.run.companyRut,
    );
    // Errores de consulta/autenticación no prueban rechazo tributario del archivo.
    const status = result.code?.startsWith("-")
      ? "SUBMITTED"
      : ["ACCEPTED", "ACCEPTED_WITH_REPAIRS", "REJECTED"].includes(result.status)
        ? result.status
        : "SUBMITTED";
    await this.repo.certificationRpc("finance_record_sii_certification_status", {
      p_id: id,
      p_status: status,
      p_response: {
        receipt: submission.response?.receipt ?? submission.response,
        latest: result,
        checkedAt: new Date().toISOString(),
      },
    });
    return this.detail(runId, actor);
  }
  async exchange(runId: string, body: unknown, actor: FinanceActor) {
    const detail = await this.detail(runId, actor);
    const form = parse(
      z.strictObject({
        file: z.unknown(),
        responseId: z.number().int().positive().max(2147483647),
      }),
      body,
    );
    const source = decodeUpload(form.file, "XML de intercambio", 2 * 1024 * 1024);
    const name = `respuesta-${source.sha256.slice(0, 24)}-${form.responseId}.xml`;
    if (detail.artifacts.some((a) => a.name === name)) return detail;
    const certificate = this.certificates.load(this.sii.secretRef());
    if (
      Date.parse(certificate.certificate.validFrom) > Date.now() ||
      Date.parse(certificate.certificate.validTo) <= Date.now()
    )
      throw new ConflictException("Certificado fuera de vigencia.");
    const response = await certificationExchangeReceipt(
      "CERTIFICATION",
      source.bytes.toString("latin1"),
      source.fileName,
      detail.run.companyRut,
      form.responseId,
      certificate,
    );
    const files = [
      {
        name: `intercambio-${source.sha256.slice(0, 24)}.xml`,
        kind: "EXCHANGE_SOURCE",
        bytes: source.bytes,
      },
      { name, kind: "RESPONSE", bytes: Buffer.from(response, "latin1") },
    ];
    for (const file of files) {
      if (await this.repo.findOne<Row>("sii_certification_artifacts", { runId, name: file.name }))
        continue;
      const hash = sha256(file.bytes),
        path = `sii-certification/${runId}/${hash}.xml`;
      await this.repo.saveFile("finance-documents", path, file.bytes, "application/xml", {
        reuseIdentical: true,
      });
      try {
        await this.repo.create("sii_certification_artifacts", {
          runId,
          name: file.name,
          kind: file.kind,
          storagePath: path,
          sha256: hash,
        });
      } catch (error) {
        if (
          !(await this.repo.findOne<Row>("sii_certification_artifacts", { runId, name: file.name }))
        )
          throw error;
      }
    }
    return this.detail(runId, actor);
  }
  async submit(runId: string, id: string, actor: FinanceActor) {
    this.ctx.require(actor, "dte.issue");
    const { detail, submission, artifact } = await this.submission(runId, id, actor);
    if (["SUBMITTED", "ACCEPTED", "ACCEPTED_WITH_REPAIRS", "REJECTED"].includes(submission.status))
      return detail;
    const file = await this.download(runId, artifact.id, actor),
      xml = file.bytes.toString("latin1");
    await validateCertificationXml(xml, schemas[artifact.kind]!);
    verifySiiXmlSignatures(xml, this.certificates.metadata(this.sii.secretRef()).fingerprintSha256);
    await this.sii.authenticate("CERTIFICATION");
    const claimed = await this.repo.certificationRpc<boolean>(
      "finance_claim_sii_certification_submission",
      { p_id: id },
    );
    if (!claimed)
      throw new ConflictException(
        "El envío ya fue adquirido o requiere revisión. No se volverá a transmitir automáticamente.",
      );
    let result: { trackId: string; status: string } | undefined;
    try {
      result = await this.sii.sendCertificationArtifact(
        xml,
        detail.run.companyRut,
        `sii-cert-${id}.xml`,
      );
    } catch {
      await this.repo
        .certificationRpc("finance_complete_sii_certification_submission", {
          p_id: id,
          p_track: null,
          p_response: { message: "Recepción incierta; revisar en SII antes de reenviar." },
          p_unknown: true,
        })
        .catch(() => {});
      throw new ConflictException(
        "No se confirmó la recepción. El envío queda bloqueado para evitar duplicados; consulta su situación en el SII.",
      );
    }
    let backedUp = false;
    try {
      await this.saveEncrypted(
        `certification-receipts/${runId}/${id}.enc`,
        Buffer.from(
          JSON.stringify({ runId, submissionId: id, artifactSha256: artifact.sha256, result }),
          "utf8",
        ),
      );
      backedUp = true;
    } catch {
      /* El recibo también se conserva en la transacción de cierre. */
    }
    const complete = () =>
      this.repo.certificationRpc("finance_complete_sii_certification_submission", {
        p_id: id,
        p_track: result.trackId,
        p_response: result,
        p_unknown: false,
      });
    try {
      await complete();
    } catch {
      // Repetir el guardado con el mismo Track ID no vuelve a transmitir el archivo.
      try {
        await complete();
      } catch {
        throw new ConflictException(
          `El SII recibió el archivo con Track ID ${result.trackId}, pero no se confirmó el guardado. ${backedUp ? "Usa Recuperar recibo para incorporarlo." : "Conserva este Track ID y solicita revisión del registro."} El archivo no se reenviará.`,
        );
      }
    }
    return this.detail(runId, actor);
  }
}
