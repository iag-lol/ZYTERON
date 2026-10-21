import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { execFileSync } from "node:child_process";
import { createPublicKey, generateKeyPairSync, createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DteCertificateProvider,
  SiiDirectDteProvider,
} from "../dist/finance/finance.dte-providers.js";
import { DteService } from "../dist/finance/finance.dte.js";
import {
  printedDteData,
  renderPrintedDte,
  printedDteBarcode,
  pdf417ByteCodewords,
} from "../dist/finance/finance.dte-print.js";
import { PDFDocument } from "pdf-lib";

let directory, provider, fixture;
const previousSecret = process.env.ZYTERON_SYNTHETIC_CERTIFICATE;
const previousSender = process.env.DTE_SENDER_RUT;
const createFixture = async (overrides = {}) => {
  const cafKey = generateKeyPairSync("rsa", { modulusLength: 1024 });
  const publicKey = createPublicKey(cafKey.privateKey).export({ format: "jwk" });
  const m = Buffer.from(publicKey.n, "base64url").toString("base64"),
    e = Buffer.from(publicKey.e, "base64url").toString("base64");
  const input = {
    taxDocumentId: "synthetic",
    documentTypeCode: 33,
    folio: 42,
    issueDate: "2026-01-02",
    dueDate: "2026-02-02",
    environment: "CERTIFICATION",
    company: {
      rut: "11111111-1",
      legalName: "Emisor Sintético QA SpA",
      businessActivity: "Pruebas de software",
      activityCode: 620200,
      address: "Dirección de prueba 100",
      commune: "Comuna de prueba",
      city: null,
      resolutionNumber: 0,
      resolutionDate: "2026-01-01",
    },
    receiver: {
      rut: "22222222-2",
      legalName: "Receptor Sintético Ñandú & Cía.",
      businessActivity: "Pruebas",
      address: "Calle de prueba 200",
      commune: "Comuna de prueba",
      city: null,
      email: null,
    },
    lines: [
      {
        lineNumber: 1,
        description: "Diseño y configuración sintéticos",
        quantity: 1,
        unitPrice: 100000,
        discountAmount: 0,
        netAmount: 100000,
        isExempt: false,
      },
    ],
    totals: { net: 100000, exempt: 0, taxRate: 0.19, tax: 19000, total: 119000 },
    reference: null,
    caf: {
      documentTypeCode: 33,
      rangeFrom: 1,
      rangeTo: 100,
      authorizedAt: "2026-01-01",
      companyRut: "11111111-1",
      companyName: "Emisor Sintético QA SpA",
      privateKeyPem: cafKey.privateKey.export({ type: "pkcs1", format: "pem" }),
      cafXml: `<CAF version="1.0"><DA><RE>11111111-1</RE><RS>Emisor Sintético QA SpA</RS><TD>33</TD><RNG><D>1</D><H>100</H></RNG><FA>2026-01-01</FA><RSAPK><M>${m}</M><E>${e}</E></RSAPK><IDK>0</IDK></DA><FRMA algoritmo="SHA1withRSA">U1lOVEhFVElDLU9OTFk=</FRMA></CAF>`,
    },
    ...overrides,
  };
  const unsigned = await provider.createDraft(input),
    signed = await provider.sign(unsigned, input),
    envelope = Buffer.from(provider.envelope([signed], input), "latin1");
  const bytes = Buffer.from(provider.standalone(signed), "latin1");
  return {
    input,
    signed: bytes,
    envelope,
    record: {
      id: "synthetic-dte-id",
      provider: "SII_DIRECT",
      documentTypeCode: input.documentTypeCode,
      folio: input.folio,
      environment: input.environment,
      status: "SUBMITTED",
      emitterRut: input.company.rut,
      receiverRut: input.receiver.rut,
      issueDate: input.issueDate,
      totalAmount: input.totals.total,
      xmlSignedPath: "dte/certification/33/42/signed.xml",
      xmlSignedSha256: createHash("sha256").update(bytes).digest("hex"),
    },
  };
};
before(async () => {
  directory = mkdtempSync(join(tmpdir(), "zyteron-dte-print-test-"));
  execFileSync(
    "/usr/bin/openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      join(directory, "key.pem"),
      "-out",
      join(directory, "cert.pem"),
      "-days",
      "2",
      "-subj",
      "/CN=Zyteron Synthetic QA/serialNumber=11111111-1",
    ],
    { stdio: "ignore" },
  );
  process.env.ZYTERON_SYNTHETIC_CERTIFICATE =
    readFileSync(join(directory, "key.pem"), "utf8") +
    readFileSync(join(directory, "cert.pem"), "utf8");
  process.env.DTE_SENDER_RUT = "11111111-1";
  provider = new SiiDirectDteProvider(
    { load: () => new DteCertificateProvider().load("ZYTERON_SYNTHETIC_CERTIFICATE") },
    { validate: async () => [], available: () => true },
  );
  fixture = await createFixture();
});
after(() => {
  if (previousSecret === undefined) delete process.env.ZYTERON_SYNTHETIC_CERTIFICATE;
  else process.env.ZYTERON_SYNTHETIC_CERTIFICATE = previousSecret;
  if (previousSender === undefined) delete process.env.DTE_SENDER_RUT;
  else process.env.DTE_SENDER_RUT = previousSender;
  rmSync(directory, { recursive: true, force: true });
});
test("PDF se deriva del mismo DTE y conserva fecha, folio, montos y timbre firmado", async () => {
  const data = printedDteData(fixture.signed, fixture.envelope, fixture.record);
  assert.equal(data.folio, 42);
  assert.equal(data.total, 119000);
  assert.match(data.ted, /Ñandú/);
  const pdf = await renderPrintedDte(
    fixture.signed,
    fixture.envelope,
    fixture.record,
    "OFICINA SINTÉTICA QA",
  );
  assert.equal((await PDFDocument.load(pdf)).getPageCount(), 1);
  if (process.env.ZYTERON_DTE_PRINT_QA_OUTPUT) {
    const output = process.env.ZYTERON_DTE_PRINT_QA_OUTPUT;
    mkdirSync(output, { recursive: true });
    writeFileSync(join(output, "muestra-sintetica.pdf"), pdf);
    writeFileSync(join(output, "ted-esperado.bin"), Buffer.from(data.ted, "latin1"));
    writeFileSync(join(output, "timbre-sintetico.png"), await printedDteBarcode(data.ted));
  }
});
test("rechaza IDs fiscales incoherentes, montos, cliente, emisor y fecha distintos", () => {
  for (const patch of [
    { folio: 43 },
    { documentTypeCode: 34 },
    { totalAmount: 119001 },
    { receiverRut: "11111111-1" },
    { emitterRut: "22222222-2" },
    { issueDate: "2026-01-03" },
    { status: "DRAFT" },
    { environment: "OTHER" },
  ])
    assert.throws(() =>
      printedDteData(fixture.signed, fixture.envelope, { ...fixture.record, ...patch }),
    );
});
test("rechaza otro envío archivado y firmas de timbre alteradas", () => {
  assert.throws(
    () =>
      printedDteData(
        fixture.signed,
        Buffer.from(
          fixture.envelope.toString("latin1").replace("<Folio>42</Folio>", "<Folio>43</Folio>"),
          "latin1",
        ),
        fixture.record,
      ),
    /envío original/,
  );
  const mutate = (bytes) =>
    Buffer.from(
      bytes.toString("latin1").replace(/(<FRMT algoritmo="SHA1withRSA">)[A-Za-z0-9+/]/, "$1!"),
      "latin1",
    );
  assert.throws(
    () => printedDteData(mutate(fixture.signed), mutate(fixture.envelope), fixture.record),
    /firma del timbre/,
  );
});
test("rechaza timbres duplicados y XML con entidades externas", () => {
  const xml = fixture.signed.toString("latin1"),
    ted = xml.match(/<TED[^>]*>[\s\S]*?<\/TED>/)[0];
  const duplicate = (bytes) =>
    Buffer.from(bytes.toString("latin1").replace(ted, ted + ted), "latin1");
  assert.throws(
    () => printedDteData(duplicate(fixture.signed), duplicate(fixture.envelope), fixture.record),
    /único TED/,
  );
  assert.throws(
    () =>
      printedDteData(
        Buffer.concat([
          Buffer.from('<!DOCTYPE DTE [<!ENTITY x SYSTEM "file:///tmp/test">]>'),
          fixture.signed,
        ]),
        fixture.envelope,
        fixture.record,
      ),
    /DOCTYPE/,
  );
});
test("no reconstruye resolución ausente ni habilita impresión de producción sin oficina", async () => {
  assert.throws(
    () =>
      printedDteData(
        fixture.signed,
        Buffer.from(
          fixture.envelope.toString("latin1").replace("<FchResol>2026-01-01</FchResol>", ""),
          "latin1",
        ),
        fixture.record,
      ),
    /resolución original/,
  );
  await assert.rejects(
    renderPrintedDte(fixture.signed, fixture.envelope, {
      ...fixture.record,
      environment: "PRODUCTION",
    }),
    /DTE_SII_OFFICE/,
  );
});
test("detalle largo falla antes de intentar conexión o envío al SII", async () => {
  const long = await createFixture({
    lines: Array.from({ length: 30 }, (_, i) => ({
      lineNumber: i + 1,
      description: "Descripción sintética extensa ".repeat(15),
      quantity: 1,
      unitPrice: 1000,
      discountAmount: 0,
      netAmount: 1000,
      isExempt: false,
    })),
    totals: { net: 30000, exempt: 0, taxRate: 0.19, tax: 5700, total: 35700 },
  });
  let calls = 0;
  const fetchBefore = global.fetch;
  global.fetch = async () => {
    calls++;
    throw Error("No debe conectarse");
  };
  try {
    await assert.rejects(
      provider.send(long.signed.toString("latin1").replace(/^<\?xml[^>]*>\s*/, ""), long.input),
      /excede una hoja/,
    );
    assert.equal(calls, 0);
  } finally {
    global.fetch = fetchBefore;
  }
});
test("compacción binaria tiene modo explícito y limita capacidad con ECL 5", () => {
  assert.equal(pdf417ByteCodewords(Buffer.from([0, 1, 2, 3, 4])), "^901^000^001^002^003^004");
  assert.match(pdf417ByteCodewords(Buffer.from([0, 1, 2, 3, 4, 5])), /^\^924(?:\^\d{3}){5}$/);
  assert.throws(() => pdf417ByteCodewords(Buffer.alloc(1500)), /capacidad/);
});
test("descarga autenticada por ID solo lee el documento autorizado; no escribe ni emite", async () => {
  const read = [];
  const actor = { userId: "synthetic-admin", role: "GERENTE_GENERAL" };
  const ctx = {
    require: (current, permission) => {
      assert.equal(current, actor);
      assert.equal(permission, "dte.view");
    },
    must: async (table, id) => {
      assert.equal(table, "tax_documents");
      assert.equal(id, "synthetic-dte-id");
      return fixture.record;
    },
    repo: {
      readFile: async (bucket, path) => {
        read.push([bucket, path]);
        return path.endsWith("/signed.xml") ? fixture.signed : fixture.envelope;
      },
    },
  };
  const service = new DteService(ctx, {}, provider, {}, {});
  const result = await service.download("synthetic-dte-id", "pdf", actor);
  assert.equal(result.mime, "application/pdf");
  assert.equal(result.fileName, "33-42.pdf");
  assert.equal(read.length, 2);
  ctx.require = () => {
    throw Error("Sin acceso");
  };
  await assert.rejects(service.download("synthetic-dte-id", "pdf", actor), /Sin acceso/);
  assert.equal(read.length, 2);
});
test("descarga rechaza objeto ausente o huella incorrecta y no inventa un PDF", async () => {
  const actor = { userId: "synthetic-admin", role: "GERENTE_GENERAL" };
  let wrongHash = false;
  const ctx = {
    require: () => {},
    must: async () => ({
      ...fixture.record,
      ...(wrongHash ? { xmlSignedSha256: "0".repeat(64) } : {}),
    }),
    repo: {
      readFile: async (_bucket, path) => (path.endsWith("/signed.xml") ? fixture.signed : null),
    },
  };
  const service = new DteService(ctx, {}, provider, {}, {});
  await assert.rejects(service.download("synthetic-dte-id", "pdf", actor), /envío original/);
  wrongHash = true;
  await assert.rejects(service.download("synthetic-dte-id", "pdf", actor), /huella/);
});

test("CAF con saltos de línea produce timbre conforme a la normalización SII", async () => {
  const other = await createFixture({
    caf: { ...fixture.input.caf, cafXml: fixture.input.caf.cafXml.replaceAll("><", ">\n  <") },
  });
  assert.equal(printedDteData(other.signed, other.envelope, other.record).folio, 42);
});
test("los cuatro tipos implementados generan una representación sin habilitar otros formatos", async () => {
  for (const code of [33, 34, 56, 61]) {
    const overrides = {
      documentTypeCode: code,
      caf: {
        ...fixture.input.caf,
        documentTypeCode: code,
        cafXml: fixture.input.caf.cafXml.replace("<TD>33</TD>", `<TD>${code}</TD>`),
      },
    };
    if (code === 34) {
      overrides.lines = fixture.input.lines.map((line) => ({ ...line, isExempt: true }));
      overrides.totals = { net: 0, exempt: 100000, taxRate: null, tax: 0, total: 100000 };
    }
    if ([56, 61].includes(code))
      overrides.reference = {
        documentTypeCode: 33,
        folio: 1,
        date: "2026-01-01",
        code: 3,
        reason: "Corrección sintética QA",
      };
    const item = await createFixture(overrides);
    assert.equal(
      (
        await PDFDocument.load(
          await renderPrintedDte(item.signed, item.envelope, item.record, "OFICINA SINTÉTICA QA"),
        )
      ).getPageCount(),
      1,
    );
  }
  for (const code of [39, 41, 46, 52]) {
    assert.equal(
      (await provider.requirements("CERTIFICATION", code)).find(
        (row) => row.key === "document_format",
      ).satisfied,
      false,
    );
    await assert.rejects(
      provider.createDraft({ ...fixture.input, documentTypeCode: code }),
      /no está implementado/,
    );
  }
});
