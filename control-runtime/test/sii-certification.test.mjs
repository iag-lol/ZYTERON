import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { execFileSync } from "node:child_process";
import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  X509Certificate,
  verify,
} from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  certificationDocumentXml,
  certificationEnvelope,
  certificationBoletaUploadEnvelope,
  certificationTotals,
  validateCertificationXml,
} from "../dist/finance/finance.sii-certification.js";
import {
  certificationPurchaseSalesBook,
  certificationGuideBook,
  certificationExchangeReceipt,
  certificationConsumption,
} from "../dist/finance/finance.sii-books.js";
import { verifySiiXmlSignatures } from "../dist/finance/finance.sii-signatures.js";
import {
  parseOfficialCertificationSet,
  previewCertificationFolios,
  validateOfficialCaseSemantics,
} from "../dist/finance/finance.sii-set.js";
import { renderPrintedDte } from "../dist/finance/finance.dte-print.js";
import { DteSchemaValidator, SiiDirectDteProvider } from "../dist/finance/finance.dte-providers.js";
import { parseXml, child, textOf } from "../dist/finance/finance.formats.js";
import { PDFDocument } from "pdf-lib";
import {
  boletaLookupToken,
  verifyBoletaLookupToken,
  boletaVerificationUrl,
} from "../dist/finance/finance.boleta-lookup.js";

const genericReceiver = {
  rut: "66666666-6",
  legalName: "Consumidor final",
  businessActivity: "",
  address: "",
  commune: "",
};
const boletaRows = [
  [
    { description: "Cambio de aceite", quantity: 1, unitPrice: 19900, exempt: false },
    { description: "Alineacion y balanceo", quantity: 1, unitPrice: 9900, exempt: false },
  ],
  [{ description: "Papel de regalo", quantity: 17, unitPrice: 120, exempt: false }],
  [
    { description: "Sandwic", quantity: 2, unitPrice: 1500, exempt: false },
    { description: "Bebida", quantity: 2, unitPrice: 550, exempt: false },
  ],
  [
    { description: "item afecto 1", quantity: 8, unitPrice: 1590, exempt: false },
    { description: "item exento 2", quantity: 2, unitPrice: 1000, exempt: true },
  ],
  [{ description: "Arroz", quantity: 5, unitPrice: 700, exempt: false, unit: "Kg" }],
];
const boletaSet =
  "SII SET DE PRUEBA DE BOLETA ELECTRONICA DE VENTAS Y SERVICIOS\n\n" +
  boletaRows
    .map(
      (rows, i) =>
        `CASO-${i + 1}\n==========\nItem\tCantidad\tPrecio Unitario con IVA\n${rows.map((r) => `${r.description}\t${r.quantity}\t${r.unitPrice}`).join("\n")}\n${i === 4 ? 'OBSERVACION: "Se debe informar en el XML Unidad de medida en Kg."' : ""}\n`,
    )
    .join("\n");

test("set de boletas conserva cinco casos, precios brutos, exento y unidad; rechaza archivo parcial", () => {
  const set = parseOfficialCertificationSet(Buffer.from(boletaSet));
  assert.equal(set.format, "BOLETA");
  assert.deepEqual(set.requiredFolios, { 39: 5 });
  assert.equal(set.sections.length, 1);
  assert.equal(set.sections[0].attention, "");
  assert.deepEqual(
    set.cases.map((c) => c.requiredLines),
    boletaRows,
  );
  for (const invalid of [
    boletaSet.replace("CASO-5", "CASO-4"),
    boletaSet.slice(0, boletaSet.indexOf("CASO-5")),
    boletaSet.replace("Precio Unitario con IVA", "Precio Unitario"),
    boletaSet.replace("Alineacion y balanceo\t1\t9900", "Alineacion y balanceo\t1\t"),
  ])
    assert.throws(() => parseOfficialCertificationSet(Buffer.from(invalid)));
});
test("cinco boletas forman un único sobre y RCOF con totales del set, firmas y XSD", async () => {
  const old = process.env.FINANCE_ENCRYPTION_KEY;
  process.env.FINANCE_ENCRYPTION_KEY = "a".repeat(64);
  try {
    const totals = [
      [25042, 0, 4758, 29800],
      [1714, 0, 326, 2040],
      [3445, 0, 655, 4100],
      [10689, 2000, 2031, 14720],
      [2941, 0, 559, 3500],
    ];
    const docs = boletaRows.map((lines, i) => {
      const f = fixture(39, {
        caseId: `CASO-${i + 1}`,
        folio: i + 1,
        pricesIncludeVat: true,
        receiver: genericReceiver,
        lines,
      });
      const built = certificationDocumentXml(f.input, f.caf, certificate);
      assert.deepEqual(
        [built.totals.net, built.totals.exempt, built.totals.tax, built.totals.total],
        totals[i],
      );
      assert(built.xml.includes(`<CodRef>SET</CodRef><RazonRef>CASO-${i + 1}</RazonRef>`));
      assert(!built.xml.includes("IndMntNeto"));
      assert(built.xml.includes(`<RUTProvSW>${company.rut}</RUTProvSW>`));
      assert(!built.xml.includes("<DirRecep>"));
      return { ...f, ...built };
    });
    assert(docs[4].xml.includes("<UnmdItem>Kg</UnmdItem>"));
    const envelope = certificationEnvelope(
      docs.map((d) => d.xml),
      company,
      "33333333-3",
      certificate,
      "CERTIFICATION",
    );
    assert.equal((envelope.match(/<DTE version=/g) || []).length, 5);
    assert(
      Math.max(...envelope.split(/\r?\n/).map((line) => Buffer.byteLength(line, "latin1"))) <= 4090,
    );
    assert(envelope.includes("<NroDTE>5</NroDTE>"));
    await validateCertificationXml(envelope, "EnvioBOLETA_v11.xsd");
    assert.equal(
      verifySiiXmlSignatures(envelope, certificate.certificate.fingerprint256).length,
      6,
    );
    const provider = new SiiDirectDteProvider(
      { metadata: () => ({ fingerprintSha256: certificate.certificate.fingerprint256 }) },
      new DteSchemaValidator(),
    );
    provider.senderRut = () => "33333333-3";
    let authentications = 0;
    provider.authenticate = async () => {
      authentications++;
      return "synthetic-token";
    };
    const fileName = "sii-cert-11111111-1111-4111-8111-111111111111.xml";
    await provider.validateCertificationArtifact(envelope, company.rut, fileName);
    await assert.rejects(
      () =>
        provider.validateCertificationArtifact(envelope.replace(/\n/g, ""), company.rut, fileName),
      /4090 bytes por línea/,
    );
    assert.equal(authentications, 0);
    const uploadEnvelope = await certificationBoletaUploadEnvelope(
      envelope,
      company,
      "33333333-3",
      certificate,
      "CERTIFICATION",
    );
    assert(!uploadEnvelope.includes("RUTProvSW"));
    assert(
      Math.max(...uploadEnvelope.split(/\r?\n/).map((line) => Buffer.byteLength(line, "latin1"))) <=
        4090,
    );
    assert(envelope.includes("RUTProvSW"));
    assert.deepEqual(
      uploadEnvelope.match(/<TED\b[\s\S]*?<\/TED>/g),
      envelope.match(/<TED\b[\s\S]*?<\/TED>/g),
    );
    const bodies = (source) =>
      [...source.matchAll(/<Documento\b[\s\S]*?<\/Documento>/g)].map((m) =>
        m[0].replace(/<RUTProvSW>[^<]+<\/RUTProvSW>/, ""),
      );
    assert.deepEqual(bodies(uploadEnvelope), bodies(envelope));
    assert.equal(
      verifySiiXmlSignatures(uploadEnvelope, certificate.certificate.fingerprint256).length,
      6,
    );
    for (const [source, issuer, sender, environment] of [
      [envelope, company, "33333333-3", "PRODUCTION"],
      [envelope, { ...company, rut: "22222222-2" }, "33333333-3", "CERTIFICATION"],
      [envelope, company, "22222222-2", "CERTIFICATION"],
      [envelope.replace("Cambio de aceite", "Cambio"), company, "33333333-3", "CERTIFICATION"],
    ])
      await assert.rejects(() =>
        certificationBoletaUploadEnvelope(source, issuer, sender, certificate, environment),
      );
    const oldUpload = provider.postLegacyUpload;
    let transmissions = 0;
    try {
      provider.postLegacyUpload = async (host, token, options) => {
        transmissions++;
        assert.equal(host, "maullin.sii.cl");
        assert.equal(token, "synthetic-token");
        const uploaded = options.body.toString("latin1");
        assert.equal(options.headers["Content-Length"], String(options.body.length));
        assert.equal((uploaded.match(/<DTE version=/g) || []).length, 5);
        return "<RECEPCIONDTE><STATUS>0</STATUS><TRACKID>123456</TRACKID></RECEPCIONDTE>";
      };
      assert.deepEqual(
        await provider.sendCertificationArtifact(uploadEnvelope, company.rut, fileName),
        {
          trackId: "123456",
          status: "0",
        },
      );
      assert.equal(transmissions, 1);
      await assert.rejects(() =>
        provider.sendCertificationArtifact(
          envelope.replace(/<CodRef>SET<\/CodRef>/g, "<CodRef>OTRO</CodRef>"),
          company.rut,
          fileName,
        ),
      );
      assert.equal(transmissions, 1);
    } finally {
      provider.postLegacyUpload = oldUpload;
    }
    const entries = docs.map((d) => ({
      type: 39,
      folio: d.input.folio,
      date: d.input.date,
      status: "USED",
      net: d.totals.net,
      exempt: d.totals.exempt,
      vat: d.totals.tax,
      total: d.totals.total,
    }));
    const rcof = certificationConsumption(
      {
        environment: "CERTIFICATION",
        company,
        senderRut: "33333333-3",
        period: "2026-01",
        notificationFolio: 1,
      },
      "2026-01-02",
      1,
      entries,
      certificate,
    );
    for (const fragment of [
      "<MntNeto>43831</MntNeto>",
      "<MntIva>8329</MntIva>",
      "<MntExento>2000</MntExento>",
      "<MntTotal>54160</MntTotal>",
      "<FoliosEmitidos>5</FoliosEmitidos>",
      "<Inicial>1</Inicial><Final>5</Final>",
    ])
      assert(rcof.includes(fragment));
    await validateCertificationXml(rcof, "ConsumoFolio_v10.xsd");
    assert(
      Math.max(...rcof.split(/\r?\n/).map((line) => Buffer.byteLength(line, "latin1"))) <= 4090,
    );
    verifySiiXmlSignatures(rcof, certificate.certificate.fingerprint256);
    const output = process.env.ZYTERON_BOLETA_QA_OUTPUT;
    if (output) {
      mkdirSync(output, { recursive: true });
      writeFileSync(join(output, "sobre.xml"), Buffer.from(envelope, "latin1"));
      writeFileSync(join(output, "rcof.xml"), Buffer.from(rcof, "latin1"));
    }
    const manifest = [];
    for (const [i, d] of docs.entries()) {
      const caseId = `CASO-${i + 1}`,
        url = boletaVerificationUrl("11111111-1111-4111-8111-111111111111", caseId);
      const signed = Buffer.from(
        `<?xml version="1.0" encoding="ISO-8859-1"?>${d.xml.replace('<DTE version="1.0">', '<DTE xmlns="http://www.sii.cl/SiiDte" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0">')}`,
        "latin1",
      );
      const expected = {
        documentTypeCode: 39,
        folio: i + 1,
        environment: "CERTIFICATION",
        status: "SIGNED",
        emitterRut: company.rut,
        receiverRut: d.input.receiver.rut,
        issueDate: d.input.date,
        totalAmount: totals[i][3],
      };
      const pdf = await renderPrintedDte(
        signed,
        Buffer.from(envelope, "latin1"),
        expected,
        "OFICINA QA",
        "TRIBUTARY",
        url,
      );
      assert(pdf.length < 500000);
      assert.equal((await PDFDocument.load(pdf)).getPageCount(), 1);
      await assert.rejects(
        () =>
          renderPrintedDte(
            signed,
            Buffer.from(envelope, "latin1"),
            expected,
            "OFICINA QA",
            "TRIBUTARY",
            url.replace("www.zyteron.cl", "example.invalid"),
          ),
        /URL/,
      );
      if (output) {
        writeFileSync(join(output, `${caseId}.pdf`), pdf);
        writeFileSync(join(output, `${caseId}.xml`), signed);
        manifest.push({ caseId, url, total: totals[i][3], bytes: pdf.length });
      }
    }
    if (output) writeFileSync(join(output, "manifest.json"), JSON.stringify(manifest, null, 2));
  } finally {
    if (old === undefined) delete process.env.FINANCE_ENCRYPTION_KEY;
    else process.env.FINANCE_ENCRYPTION_KEY = old;
  }
});
test("receptor genérico no inventa domicilio ni permite omitir datos en facturas o servicios periódicos", () => {
  const f = fixture(39, { caseId: "CASO-1", receiver: genericReceiver, pricesIncludeVat: true });
  assert.doesNotThrow(() => certificationDocumentXml(f.input, f.caf, certificate));
  for (const service of [1, 2])
    assert.throws(
      () => certificationDocumentXml({ ...f.input, service }, f.caf, certificate),
      /no periódico/,
    );
  const invoice = fixture(33, { receiver: genericReceiver });
  assert.throws(
    () => certificationDocumentXml(invoice.input, invoice.caf, certificate),
    /Giro|Dirección|Comuna/,
  );
});
test("consulta de boleta verifica código, empresa, tipo, ruta y huella; nunca acepta rutas del visitante", async () => {
  const old = process.env.FINANCE_ENCRYPTION_KEY;
  process.env.FINANCE_ENCRYPTION_KEY = "a".repeat(64);
  try {
    const runId = "11111111-1111-4111-8111-111111111111",
      token = boletaLookupToken(runId, "CASO-1");
    assert.deepEqual(verifyBoletaLookupToken(token), { runId, caseId: "CASO-1" });
    for (const invalid of [
      null,
      "",
      token + "x",
      token.replace(/.$/, token.endsWith("A") ? "B" : "A"),
      "v1." + "x".repeat(400),
    ])
      assert.throws(() => verifyBoletaLookupToken(invalid));
    const { SiiCertificationWorkspace } = await import("../dist/finance/finance.sii-workspace.js"),
      { sha256 } = await import("../dist/finance/finance.util.js");
    const bytes = Buffer.from("%PDF-synthetic"),
      hash = sha256(bytes),
      rows = {
        sii_certification_runs: {
          id: runId,
          companyRut: company.rut,
          environment: "CERTIFICATION",
        },
        sii_certification_cases: { runId, caseId: "CASO-1", documentTypeCode: 39 },
        sii_certification_artifacts: {
          runId,
          name: "caso-CASO-1.pdf",
          kind: "PDF",
          storagePath: `sii-certification/${runId}/${hash}.pdf`,
          sha256: hash,
        },
      };
    let reads = 0;
    const repo = {
      configured: () => true,
      settings: async () => ({ companyRut: company.rut }),
      findOne: async (table, filters) =>
        Object.entries(filters).every(([k, v]) => rows[table]?.[k] === v) ? rows[table] : null,
      list: async (table, filters, options) => {
        assert.equal(table, "sii_certification_cases");
        assert.equal(options.order, "id");
        assert.equal(options.limit, 1);
        return Object.entries(filters).every(([k, v]) => rows[table]?.[k] === v)
          ? [rows[table]]
          : [];
      },
      readFile: async (bucket, path) => {
        assert.equal(bucket, "finance-documents");
        assert.equal(path, `sii-certification/${runId}/${hash}.pdf`);
        reads++;
        return bytes;
      },
    };
    const service = new SiiCertificationWorkspace({ repo }, null, null);
    assert.deepEqual((await service.publicBoleta({ token })).bytes, bytes);
    assert.equal(reads, 1);
    await assert.rejects(() => service.publicBoleta({ token, path: "other.pdf" }));
    rows.sii_certification_runs.companyRut = "22222222-2";
    await assert.rejects(() => service.publicBoleta({ token }), /no está disponible/);
    rows.sii_certification_runs.companyRut = company.rut;
    rows.sii_certification_cases.documentTypeCode = 33;
    await assert.rejects(() => service.publicBoleta({ token }), /no está disponible/);
    rows.sii_certification_cases.documentTypeCode = 39;
    rows.sii_certification_artifacts.storagePath = "other.pdf";
    await assert.rejects(() => service.publicBoleta({ token }), /no está disponible/);
    assert.equal(reads, 1);
    rows.sii_certification_artifacts.storagePath = `sii-certification/${runId}/${hash}.pdf`;
    rows.sii_certification_artifacts.sha256 = "b".repeat(64);
    await assert.rejects(() => service.publicBoleta({ token }), /no está disponible/);
  } finally {
    if (old === undefined) delete process.env.FINANCE_ENCRYPTION_KEY;
    else process.env.FINANCE_ENCRYPTION_KEY = old;
  }
});

let directory, certificate, key, m, e;
before(() => {
  directory = mkdtempSync(join(tmpdir(), "zyteron-sii-synthetic-"));
  execFileSync(
    "openssl",
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
      "1",
      "-subj",
      "/CN=Certificado Sintetico QA",
    ],
    { stdio: "ignore" },
  );
  const pem = readFileSync(join(directory, "cert.pem"), "utf8"),
    privateKey = createPrivateKey(readFileSync(join(directory, "key.pem"))),
    cert = new X509Certificate(pem),
    pub = createPublicKey(privateKey).export({ format: "jwk" });
  certificate = {
    key: privateKey,
    certificate: cert,
    certificateBase64: cert.raw.toString("base64"),
    modulus: Buffer.from(pub.n, "base64url").toString("base64"),
    exponent: Buffer.from(pub.e, "base64url").toString("base64"),
  };
  key = generateKeyPairSync("rsa", { modulusLength: 1024 }).privateKey;
  const jwk = createPublicKey(key).export({ format: "jwk" });
  m = Buffer.from(jwk.n, "base64url").toString("base64");
  e = Buffer.from(jwk.e, "base64url").toString("base64");
});
after(() => {
  if (directory) rmSync(directory, { recursive: true, force: true });
});
const company = {
  rut: "11111111-1",
  legalName: "Emisor Sintético QA",
  businessActivity: "Pruebas de software",
  activityCode: 620200,
  address: "Calle sintética 100",
  commune: "Comuna QA",
  city: null,
  resolutionNumber: 0,
  resolutionDate: "2026-01-01",
};
function fixture(type = 33, overrides = {}) {
  const exempt = [34, 41, 110, 111, 112].includes(type);
  const input = {
    environment: "CERTIFICATION",
    caseId: "1234567-1",
    type,
    folio: 1,
    date: "2026-01-02",
    company,
    receiver: {
      rut: "22222222-2",
      legalName: "Receptor Sintético Ñandú",
      businessActivity: "Pruebas",
      address: "Calle sintética 200",
      commune: "Comuna QA",
    },
    lines: [{ description: "Ítem sintético & comisión", quantity: 2, unitPrice: 1000, exempt }],
    ...overrides,
  };
  if ([56, 61, 111, 112].includes(type) && !input.references)
    input.references = [
      {
        type: type >= 110 ? 110 : 33,
        folio: "1",
        date: input.date,
        code: 3,
        reason: "Diferencia sintética",
      },
    ];
  if (type === 43 && !overrides.lines)
    input.lines = [
      {
        description: "NETO FACTURAS SINTÉTICAS",
        quantity: 2,
        liquidationAmount: 2000,
        liquidatedType: 33,
      },
    ];
  if (type === 46 && !input.retention) input.retention = { code: 15, rate: 19 };
  if (type === 52 && !input.dispatch)
    input.dispatch = {
      transfer: 1,
      responsibility: 2,
      destinationAddress: "Dirección QA",
      destinationCommune: "Comuna QA",
    };
  if (type >= 110 && !input.export)
    input.export = {
      currency: "DOLAR USA",
      exchangeRateCLP: 1000,
      paymentCode: 1,
      saleMode: 1,
      saleClause: 1,
      receiverCountry: 224,
      destinationCountry: 224,
    };
  const caf = {
    documentTypeCode: type,
    rangeFrom: 1,
    rangeTo: 10,
    companyRut: company.rut,
    companyName: company.legalName,
    authorizedAt: "2026-01-01",
    privateKeyPem: key.export({ type: "pkcs1", format: "pem" }),
    cafXml: `<CAF version="1.0"><DA><RE>${company.rut}</RE><RS>${company.legalName}</RS><TD>${type}</TD><RNG><D>1</D><H>10</H></RNG><FA>2026-01-01</FA><RSAPK><M>${m}</M><E>${e}</E></RSAPK><IDK>0</IDK></DA><FRMA algoritmo="SHA1withRSA">U1lOVEhFVElD</FRMA></CAF>`,
  };
  return { input, caf };
}
for (const type of [33, 34, 39, 41, 43, 46, 52, 56, 61, 110, 111, 112])
  test(`tipo ${type}: XML firmado y envío validados contra XSD oficial`, async () => {
    const { input, caf } = fixture(type),
      built = certificationDocumentXml(input, caf, certificate);
    const xml = certificationEnvelope(
      [built.xml],
      company,
      "33333333-3",
      certificate,
      "CERTIFICATION",
    );
    await validateCertificationXml(
      xml,
      [39, 41].includes(type) ? "EnvioBOLETA_v11.xsd" : "EnvioDTE_v10.xsd",
    );
    const verified = verifySiiXmlSignatures(xml, certificate.certificate.fingerprint256);
    assert.deepEqual(verified.map((r) => r.id).sort(), [`F1T${type}`, "SetDoc"].sort());
    const signatureValue = built.xml.match(/<SignatureValue>([^<]+)<\/SignatureValue>/)[1];
    const info = built.xml.match(/<SignedInfo>([\s\S]+?)<\/SignedInfo>/)[1];
    const canonical = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#"${[39, 41].includes(type) ? ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' : ""}>${info}</SignedInfo>`;
    assert.equal(
      verify(
        "RSA-SHA1",
        Buffer.from(canonical),
        certificate.certificate.publicKey,
        Buffer.from(signatureValue, "base64"),
      ),
      true,
    );
    const signed = Buffer.from(
      built.xml.replace(
        '<DTE version="1.0">',
        '<DTE xmlns="http://www.sii.cl/SiiDte" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="1.0">',
      ),
      "latin1",
    );
    const record = {
      documentTypeCode: type,
      folio: 1,
      environment: "CERTIFICATION",
      status: "SIGNED",
      emitterRut: company.rut,
      receiverRut: input.receiver.rut,
      issueDate: input.date,
      totalAmount: built.totals.total,
    };
    for (const copy of [
      "TRIBUTARY",
      ...([33, 34, 43, 46, 52].includes(type) ? ["TRANSFERABLE"] : []),
    ]) {
      const pdf = await renderPrintedDte(
        signed,
        Buffer.from(xml, "latin1"),
        record,
        "OFICINA SINTÉTICA QA",
        copy,
      );
      assert.equal((await PDFDocument.load(pdf)).getPageCount(), 1);
      assert(pdf.length < 500000);
      if (process.env.SII_SYNTHETIC_PDF_DIR) {
        mkdirSync(process.env.SII_SYNTHETIC_PDF_DIR, { recursive: true });
        writeFileSync(
          join(process.env.SII_SYNTHETIC_PDF_DIR, `tipo-${type}.ted.xml`),
          built.xml.match(/<TED\b[\s\S]*?<\/TED>/)[0],
          "latin1",
        );
        writeFileSync(
          join(process.env.SII_SYNTHETIC_PDF_DIR, `tipo-${type}-${copy.toLowerCase()}.pdf`),
          pdf,
        );
      }
    }
  });
test("cálculo de descuentos globales solo afectos, IVA y centavos extranjeros", () => {
  const { input } = fixture(33, {
    lines: [
      { description: "Afecto sintético", quantity: 3, unitPrice: 1001, discountPct: 3 },
      { description: "Exento sintético", quantity: 1, unitPrice: 400, exempt: true },
    ],
    adjustments: [{ movement: "D", kind: "%", value: 5, description: "Descuento afecto" }],
  });
  const t = certificationTotals(input);
  assert.equal(t.net, 2767);
  assert.equal(t.exempt, 400);
  assert.equal(t.tax, 526);
  assert.equal(t.total, 3693);
  const foreign = fixture(110, {
    lines: [
      {
        description: "Servicio sintético",
        quantity: 1,
        unitPrice: 44,
        surchargePct: 10,
        exempt: true,
      },
    ],
  }).input;
  assert.equal(certificationTotals(foreign).total, 48.4);
});
test("exportación conserva recargo fraccionario y descuento compatible con el XSD", async () => {
  const { input, caf } = fixture(110, {
    lines: [
      { description: "Asesoría", quantity: 1, unitPrice: 44, surchargePct: 10, exempt: true },
      { description: "Ciruelas", quantity: 537, unitPrice: 144, discountPct: 5, exempt: true },
    ],
  });
  const built = certificationDocumentXml(input, caf, certificate);
  assert.equal(built.totals.total, 73510.4);
  assert(built.xml.includes("<MNT>73510.4</MNT>"));
  assert(built.xml.includes("<RecargoPct>10</RecargoPct>"));
  assert(!built.xml.includes("<RecargoMonto>"));
  assert(built.xml.includes("<MontoItem>48.4</MontoItem>"));
  assert(built.xml.includes("<DescuentoMonto>3866</DescuentoMonto>"));
  assert(built.xml.includes("<MontoItem>73462</MontoItem>"));
  const envelope = certificationEnvelope(
    [built.xml],
    company,
    "33333333-3",
    certificate,
    "CERTIFICATION",
  );
  await validateCertificationXml(envelope, "EnvioDTE_v10.xsd");
  assert.equal(verifySiiXmlSignatures(envelope, certificate.certificate.fingerprint256).length, 2);
  const record = {
    documentTypeCode: 110,
    folio: input.folio,
    environment: "CERTIFICATION",
    status: "SIGNED",
    emitterRut: input.company.rut,
    receiverRut: input.receiver.rut,
    issueDate: input.date,
    totalAmount: built.totals.total,
  };
  const pdf = await renderPrintedDte(
    Buffer.from(built.xml, "latin1"),
    Buffer.from(envelope, "latin1"),
    record,
    "OFICINA SINTÉTICA QA",
    "TRIBUTARY",
  );
  assert((await PDFDocument.load(pdf)).getPageCount() > 0);
});
test("exportación incluye pesos, tara, marcas e identificación de contenedor", async () => {
  const { input, caf } = fixture(110);
  Object.assign(input.export, {
    tare: 25,
    tareUnit: 10,
    grossWeight: 276,
    grossWeightUnit: 10,
    netWeight: 251,
    netWeightUnit: 10,
    packageType: 75,
    packageCount: 25,
    packageMarks: "CERTIFICACION",
    containerId: "CERT-CONTENEDOR-001",
    containerSeal: "CERT-SELLO-001",
    sealIssuer: "EMISOR DE PRUEBA",
  });
  const built = certificationDocumentXml(input, caf, certificate);
  for (const tag of [
    "Tara",
    "PesoBruto",
    "PesoNeto",
    "Marcas",
    "IdContainer",
    "Sello",
    "EmisorSello",
  ])
    assert(built.xml.includes(`<${tag}>`));
  await validateCertificationXml(
    certificationEnvelope([built.xml], company, "33333333-3", certificate, "CERTIFICATION"),
    "EnvioDTE_v10.xsd",
  );
});
test("liquidación conserva valores negativos y descuenta comisiones e IVA una vez", () => {
  const { input } = fixture(43, {
    lines: [
      {
        description: "Factura sintética",
        quantity: 1,
        liquidationAmount: 10000,
        liquidatedType: 33,
      },
      { description: "Nota sintética", quantity: 1, liquidationAmount: -2000, liquidatedType: 61 },
    ],
    commissions: [{ description: "Comisión sintética", net: 1000, exempt: 0 }],
  });
  const t = certificationTotals(input);
  assert.equal(t.net, 8000);
  assert.equal(t.tax, 1520);
  assert.equal(t.total, 8330);
  const built = certificationDocumentXml(input, fixture(43).caf, certificate);
  assert(built.xml.includes("<IVAProp>190</IVAProp><IVATerc>1330</IVATerc>"));
});
test("factura de compra retiene el IVA sin sumar la retención al cobro", () => {
  const { input } = fixture(46);
  const t = certificationTotals(input);
  assert.equal(t.tax, 380);
  assert.equal(t.retained, 380);
  assert.equal(t.total, 2000);
});
test("correcciones de texto y traslados sin valor omiten precio cero y cumplen XSD", async () => {
  for (const type of [61, 56, 52]) {
    const overrides = {
      lines: [{ description: "CORRIGE GIRO", quantity: 1, unitPrice: 0 }],
      ...(type === 52
        ? {
            receiver: { ...company },
            dispatch: {
              transfer: 5,
              responsibility: 1,
              destinationAddress: company.address,
              destinationCommune: company.commune,
            },
          }
        : {
            references: [
              {
                type: type === 61 ? 33 : 61,
                folio: "1",
                date: "2026-01-02",
                code: type === 61 ? 2 : 1,
                reason: "CORRIGE GIRO",
              },
            ],
          }),
    };
    const { input, caf } = fixture(type, overrides);
    const built = certificationDocumentXml(input, caf, certificate);
    assert.equal(built.totals.total, 0);
    assert(!built.xml.includes("<PrcItem>"));
    assert(built.xml.includes("<MontoItem>0</MontoItem>"));
    const envelope = certificationEnvelope(
      [built.xml],
      company,
      "33333333-3",
      certificate,
      "CERTIFICATION",
    );
    await validateCertificationXml(envelope, "EnvioDTE_v10.xsd");
    assert.equal(
      verifySiiXmlSignatures(envelope, certificate.certificate.fingerprint256).length,
      2,
    );
  }
});
test("producción, CAF ajeno, folio inválido y referencias ausentes bloqueados", () => {
  const { input, caf } = fixture();
  for (const patch of [
    { environment: "PRODUCTION" },
    { folio: 11 },
    { folio: NaN },
    { caseId: "otro" },
    { type: 61, references: [] },
    { type: 52 },
    { date: "2026-02-30" },
  ])
    assert.throws(() => certificationDocumentXml({ ...input, ...patch }, caf, certificate));
  assert.throws(() =>
    certificationDocumentXml(input, { ...caf, companyRut: "22222222-2" }, certificate),
  );
  assert.throws(() => certificationEnvelope([], company, "33333333-3", certificate, "PRODUCTION"));
});
test("fe de erratas y su anulación no inventan cantidades; devolución conserva cantidades", async () => {
  for (const type of [61, 56]) {
    const f = fixture(type, {
      lines: [{ description: "CORRIGE GIRO DEL RECEPTOR", quantity: 1, unitPrice: 0 }],
      references: [
        {
          type: type === 61 ? 33 : 61,
          folio: "1",
          date: "2026-01-02",
          code: type === 61 ? 2 : 1,
          reason: "Corrección de texto",
        },
      ],
    });
    const built = certificationDocumentXml(f.input, f.caf, certificate);
    const line = child(child(parseXml(built.xml), "Documento"), "Detalle");
    assert.equal(textOf(line, "QtyItem"), "");
    assert.equal(textOf(line, "PrcItem"), "");
    assert.equal(textOf(line, "MontoItem"), "0");
    assert.equal(built.totals.total, 0);
    const envelope = certificationEnvelope(
      [built.xml],
      company,
      "33333333-3",
      certificate,
      "CERTIFICATION",
    );
    await validateCertificationXml(envelope, "EnvioDTE_v10.xsd");
    assert.equal(verifySiiXmlSignatures(envelope).length, 2);
  }
  const f = fixture(61, {
    lines: [{ description: "Devolución QA", quantity: 3, unitPrice: 2000 }],
    references: [{ type: 33, folio: "1", date: "2026-01-02", code: 3, reason: "Devolución" }],
  });
  const built = certificationDocumentXml(f.input, f.caf, certificate);
  assert.match(built.xml, /<QtyItem>3<\/QtyItem>/);
  assert.equal(built.totals.total, 7140);
});
test("traslado interno con receptor externo y mezcla de boletas/DTE rechazados", () => {
  const { input, caf } = fixture(52, {
    dispatch: {
      transfer: 5,
      responsibility: 1,
      destinationAddress: "Calle QA",
      destinationCommune: "Comuna QA",
    },
  });
  assert.throws(() => certificationDocumentXml(input, caf, certificate), /traslado interno/);
  const a = fixture(33),
    b = fixture(39, { caseId: "1234567-2" }),
    ax = certificationDocumentXml(a.input, a.caf, certificate).xml,
    bx = certificationDocumentXml(b.input, b.caf, certificate).xml;
  assert.throws(
    () => certificationEnvelope([ax, bx], company, "33333333-3", certificate, "CERTIFICATION"),
    /separado/,
  );
  assert.throws(
    () => certificationEnvelope([ax, ax], company, "33333333-3", certificate, "CERTIFICATION"),
    /duplicada/,
  );
});
const bookContext = {
  environment: "CERTIFICATION",
  company,
  senderRut: "33333333-3",
  period: "2026-01",
  notificationFolio: 1,
};
const bookEntry = {
  type: 33,
  folio: 1,
  date: "2026-01-02",
  counterpartyRut: "22222222-2",
  counterpartyName: "Contraparte sintética",
  net: 10000,
  exempt: 1000,
  vat: 1900,
};
test("libros de compra y venta: resumen por tipo, IVA común, no recuperable y retención", async () => {
  const sale = certificationPurchaseSalesBook(
    bookContext,
    "VENTA",
    [
      bookEntry,
      {
        ...bookEntry,
        type: 61,
        folio: 2,
        net: 1000,
        exempt: 0,
        vat: 190,
        reference: { type: 33, folio: 1 },
      },
    ],
    certificate,
  );
  await validateCertificationXml(sale, "LibroCV_v10.xsd");
  assert.match(sale, /<TotMntTotal>12900<\/TotMntTotal>/);
  assert.match(sale, /<TotMntTotal>1190<\/TotMntTotal>/);
  const entries = [
    bookEntry,
    { ...bookEntry, folio: 2, commonVat: 1900 },
    { ...bookEntry, folio: 3, nonRecoverableVat: { code: 4, amount: 1900 } },
    { ...bookEntry, type: 46, folio: 4, retained: 1900 },
  ];
  const purchase = certificationPurchaseSalesBook(
    { ...bookContext, notificationFolio: 2 },
    "COMPRA",
    entries,
    certificate,
    0.6,
  );
  await validateCertificationXml(purchase, "LibroCV_v10.xsd");
  assert.match(purchase, /<TotCredIVAUsoComun>1140<\/TotCredIVAUsoComun>/);
  assert.equal(
    [...purchase.matchAll(/<TotMntIVA>(\d+)<\/TotMntIVA>/g)].reduce(
      (sum, m) => sum + Number(m[1]),
      0,
    ),
    3800,
  );
  assert.match(purchase, /<TotMntIVANoRec>1900<\/TotMntIVANoRec>/);
  assert.match(
    purchase,
    /<OtrosImp><CodImp>15<\/CodImp><TasaImp>19<\/TasaImp><MntImp>1900<\/MntImp><\/OtrosImp>/,
  );
  assert.match(
    purchase,
    /<TotOtrosImp><CodImp>15<\/CodImp><TotMntImp>1900<\/TotMntImp><\/TotOtrosImp>/,
  );
  assert(!purchase.includes("IVARetTotal"));
  assert.match(purchase, /<TotMntTotal>11000<\/TotMntTotal>/);
  assert.equal(verifySiiXmlSignatures(purchase).length, 1);
});
test("libro de guías: anulación informativa, traslado interno y guía facturada", async () => {
  const guide = {
    folio: 1,
    date: "2026-01-02",
    receiverRut: "22222222-2",
    receiverName: "Receptor sintético",
    transfer: 1,
    net: 1000,
    vat: 190,
    total: 1190,
  };
  const rows = [
    { ...guide, transfer: 5, net: 0, vat: 0, total: 0 },
    { ...guide, folio: 2, billedReference: { type: 33, folio: 1, date: "2026-01-02" } },
    { ...guide, folio: 3, annulled: 2 },
  ];
  const snapshot = JSON.stringify(rows),
    xml = certificationGuideBook({ ...bookContext, notificationFolio: 3 }, rows, certificate);
  await validateCertificationXml(xml, "LibroGuia_v10.xsd");
  assert.match(xml, /<TotGuiaAnulada>1<\/TotGuiaAnulada>/);
  assert.match(xml, /<TotGuiaVenta>1<\/TotGuiaVenta>/);
  assert.equal(JSON.stringify(rows), snapshot);
  assert.equal(verifySiiXmlSignatures(xml).length, 1);
});
test("verificación independiente rechaza cambios de total, texto, firma e ID duplicado", () => {
  const { input, caf } = fixture(),
    d = certificationDocumentXml(input, caf, certificate),
    xml = certificationEnvelope([d.xml], company, "33333333-3", certificate, "CERTIFICATION");
  for (const tampered of [
    xml.replace("<MntTotal>2380", "<MntTotal>2381"),
    xml.replace("Ítem sintético", "Otro sintético"),
    xml.replace("<SignatureValue>", "<SignatureValue>AAAA"),
    xml.replace('ID="SetDoc"', 'ID="F1T33"'),
  ])
    assert.throws(() => verifySiiXmlSignatures(tampered));
  assert.throws(() => verifySiiXmlSignatures(xml, "00".repeat(32)), /esperado/);
});
test("libros rechazan duplicados, períodos mezclados y totales incompatibles", () => {
  for (const rows of [
    [bookEntry, bookEntry],
    [{ ...bookEntry, date: "2026-02-01" }],
    [{ ...bookEntry, vat: 1901 }],
    [{ ...bookEntry, counterpartyRut: "inválido" }],
  ])
    assert.throws(() => certificationPurchaseSalesBook(bookContext, "VENTA", rows, certificate));
  assert.throws(() =>
    certificationPurchaseSalesBook(
      { ...bookContext, environment: "PRODUCTION" },
      "VENTA",
      [bookEntry],
      certificate,
    ),
  );
  assert.throws(() => certificationPurchaseSalesBook(bookContext, "VENTA", [], certificate));
});
test("intercambio verifica firmas y receptor antes de generar acuse técnico", async () => {
  const { input, caf } = fixture(),
    d = certificationDocumentXml(input, caf, certificate),
    xml = certificationEnvelope(
      [d.xml],
      company,
      "33333333-3",
      certificate,
      "CERTIFICATION",
      "22222222-2",
    );
  const response = await certificationExchangeReceipt(
    "CERTIFICATION",
    xml,
    "envio-qa.xml",
    "22222222-2",
    1,
    certificate,
  );
  await validateCertificationXml(response, "RespuestaEnvioDTE_v10.xsd");
  assert.match(response, /<EstadoRecepDTE>0<\/EstadoRecepDTE>/);
  assert.doesNotMatch(response, /<ResultadoDTE>/);
  await assert.rejects(
    () =>
      certificationExchangeReceipt(
        "CERTIFICATION",
        xml,
        "envio-qa.xml",
        "44444444-4",
        1,
        certificate,
      ),
    /otro receptor/,
  );
  await assert.rejects(
    () =>
      certificationExchangeReceipt(
        "CERTIFICATION",
        xml.replace("Ítem sintético", "Otro ítem"),
        "envio-qa.xml",
        "22222222-2",
        1,
        certificate,
      ),
    /firma/i,
  );
});
test("consumo de folios separa emitidos, anulados y huecos sin cambiar los registros", async () => {
  const base = {
    type: 39,
    date: "2026-01-02",
    status: "USED",
    net: 1000,
    vat: 190,
    exempt: 0,
    total: 1190,
  };
  const rows = [
      { ...base, folio: 1 },
      { ...base, folio: 2 },
      { ...base, folio: 4, status: "VOIDED" },
      { ...base, folio: 7 },
    ],
    snapshot = JSON.stringify(rows);
  const xml = certificationConsumption(bookContext, "2026-01-02", 1, rows, certificate);
  await validateCertificationXml(xml, "ConsumoFolio_v10.xsd");
  verifySiiXmlSignatures(xml);
  assert.match(xml, /<FoliosEmitidos>3<\/FoliosEmitidos>/);
  assert.match(xml, /<FoliosAnulados>1<\/FoliosAnulados>/);
  assert.match(xml, /<FoliosUtilizados>4<\/FoliosUtilizados>/);
  assert.match(xml, /<MntTotal>3570<\/MntTotal>/);
  assert.equal(JSON.stringify(rows), snapshot);
  assert.throws(
    () => certificationConsumption(bookContext, "2026-01-02", 1, [...rows, rows[0]], certificate),
    /duplicado/,
  );
  assert.throws(
    () =>
      certificationConsumption(
        bookContext,
        "2026-01-02",
        1,
        [{ ...base, folio: 1, status: "RESERVED" }],
        certificate,
      ),
    /incompatible/,
  );
});
test("set oficial: preserva texto, identifica referencias por caso y previsualiza sin reservar", () => {
  const raw =
    "SET BASICO - NUMERO DE ATENCION: 1234567\n\nCASO 1234567-1\n==============\nDOCUMENTO\tFACTURA ELECTRONICA\nITEM\tCANTIDAD\tPRECIO UNITARIO\nCajón QA\t2\t1200\n\nCASO 1234567-2\n==============\nDOCUMENTO\tNOTA DE CREDITO ELECTRONICA\nREFERENCIA\tFACTURA CORRESPONDIENTE A CASO 1234567-1\nRAZON REFERENCIA\tANULA FACTURA\n";
  const result = parseOfficialCertificationSet(Buffer.from(raw, "latin1"));
  assert.equal(result.encoding, "ISO-8859-1");
  assert.equal(result.cases.length, 2);
  assert.equal(result.cases[1].referenceCaseId, "1234567-1");
  assert.match(result.cases[0].raw, /Cajón QA/);
  const pool = [
      { type: 33, folio: 7 },
      { type: 61, folio: 2 },
    ],
    snapshot = JSON.stringify(pool),
    plan = previewCertificationFolios(result, pool);
  assert.deepEqual(
    plan.map((c) => c.folio),
    [7, 2],
  );
  assert.equal(JSON.stringify(pool), snapshot);
  assert.throws(
    () => previewCertificationFolios(result, [{ type: 33, folio: 7 }]),
    /Faltan folios/,
  );
  assert.throws(
    () =>
      parseOfficialCertificationSet(Buffer.from(raw.replace("CASO 1234567-2", "CASO 1234567-1"))),
    /duplicado/,
  );
  assert.throws(
    () =>
      parseOfficialCertificationSet(
        Buffer.from(
          raw.replace("DOCUMENTO\tFACTURA ELECTRONICA", "DOCUMENTO\tDOCUMENTO INVENTADO"),
        ),
      ),
    /no reconocido/,
  );
  assert.throws(
    () =>
      parseOfficialCertificationSet(
        Buffer.from(
          raw.replace(
            "REFERENCIA\tFACTURA CORRESPONDIENTE A CASO 1234567-1",
            "REFERENCIA\tFACTURA CORRESPONDIENTE A CASO 1234567-3",
          ),
        ),
      ),
    /ausente o posterior/,
  );
});
test("prevalidación del set detecta despacho interno, unidad de devolución y pasaporte ausentes", () => {
  const official = {
    id: "1234567-1",
    raw: "MOTIVO: TRASLADO DE MATERIALES ENTRE BODEGAS DE LA EMPRESA",
  };
  const guide = fixture(52, { dispatch: { transfer: 5, responsibility: 1 } }).input;
  assert.throws(() => validateOfficialCaseSemantics(official, guide), /no indica responsable/);
  validateOfficialCaseSemantics(official, {
    ...guide,
    dispatch: { ...guide.dispatch, responsibility: undefined },
  });
  assert.throws(() => validateOfficialCaseSemantics(official, {
    ...guide, dispatch: { ...guide.dispatch, responsibility: 3 },
  }), /no indica responsable/);
  const original = fixture(110, {
    lines: [{ description: "PRODUCTO QA", quantity: 5, unitPrice: 10, unit: "U" }],
  }).input;
  const note = {
    ...original,
    type: 112,
    lines: [{ description: "PRODUCTO QA", quantity: 2, unitPrice: 10 }],
  };
  assert.throws(() => validateOfficialCaseSemantics(official, note, original), /unidad/);
  validateOfficialCaseSemantics(
    official,
    { ...note, lines: [{ ...note.lines[0], unit: "U" }] },
    original,
  );
  const hotel = { ...original, export: { ...original.export, service: 4 }, references: [] };
  assert.throws(() => validateOfficialCaseSemantics(official, hotel), /pasaporte/);
  validateOfficialCaseSemantics(official, {
    ...hotel,
    references: [
      { type: 813, folio: "QA-SIMULADO", date: "2026-01-02", reason: "Pasaporte simulado" },
    ],
  });
});

test("guía interna omite TipoDespacho no indicado y conserva esquema y firma válidos", async () => {
  const f = fixture(52, {
    receiver: { ...company },
    dispatch: { transfer: 5, destinationAddress: "Bodega QA", destinationCommune: "Comuna QA" },
    lines: [{ description: "ITEM 1", quantity: 77, unitPrice: 0 }],
  });
  const { xml } = certificationDocumentXml(f.input, f.caf, certificate);
  assert(!xml.includes("<TipoDespacho>"));
  assert(xml.includes("<IndTraslado>5</IndTraslado>"));
  const envelope = certificationEnvelope([xml], company, "33333333-3", certificate, "CERTIFICATION");
  await validateCertificationXml(envelope, "EnvioDTE_v10.xsd");
  assert.equal(verifySiiXmlSignatures(envelope, certificate.certificate.fingerprint256).length, 2);
});

async function workspaceFixture(options = {}) {
  const { SiiCertificationWorkspace } = await import("../dist/finance/finance.sii-workspace.js"),
    { FinanceContext } = await import("../dist/finance/finance.core.js"),
    { sha256 } = await import("../dist/finance/finance.util.js");
  const runId = "11111111-1111-4111-8111-111111111111",
    id = "22222222-2222-4222-8222-222222222222",
    artifactId = "33333333-3333-4333-8333-333333333333";
  const { input, caf } = fixture(),
    d = certificationDocumentXml(input, caf, certificate),
    xml = certificationEnvelope([d.xml], company, "33333333-3", certificate, "CERTIFICATION"),
    bytes = Buffer.from(xml, "latin1"),
    hash = sha256(bytes);
  const artifact = {
      id: artifactId,
      runId,
      name: "set-qa.xml",
      kind: "DTE",
      storagePath: `sii-certification/${runId}/${hash}.xml`,
      sha256: hash,
    },
    submission = { id, runId, artifactId, status: "PREPARED", trackId: null, response: null },
    run = { id: runId, companyRut: company.rut };
  const rows = {
      sii_certification_runs: [run],
      sii_certification_artifacts: [artifact],
      sii_certification_submissions: [submission],
      sii_certification_cases: [],
      sii_certification_drafts: [],
    },
    files = new Map([[`finance-documents/${artifact.storagePath}`, bytes]]),
    calls = [];
  let sent = 0,
    completed = 0;
  const repo = {
    configured: () => options.configured !== false,
    settings: async () => ({
      dteEnvironment: options.environment ?? "CERTIFICATION",
      dteProvider: "SII_DIRECT",
      companyRut: company.rut,
      companyLegalName: company.legalName,
      companyBusinessActivity: company.businessActivity,
      companyActivityCode: company.activityCode,
      companyAddress: company.address,
      companyCommune: company.commune,
      companyCity: company.city,
      dteResolutionNumber: company.resolutionNumber,
      dteResolutionDate: company.resolutionDate,
    }),
    list: async (table, filters = {}, sort = {}) => {
      calls.push({ table, filters, sort });
      return structuredClone(
        (rows[table] ?? []).filter((r) => Object.entries(filters).every(([k, v]) => r[k] === v)),
      );
    },
    get: async (table, rowId) => (rows[table] ?? []).find((r) => r.id === rowId),
    readFile: async (bucket, path) => {
      calls.push({ bucket, path });
      return files.get(`${bucket}/${path}`) ?? null;
    },
    saveFile: async (bucket, path, data) => {
      files.set(`${bucket}/${path}`, data);
    },
    certificationRpc: async (name, args) => {
      if (name === "finance_claim_sii_certification_submission") {
        if (submission.status !== "PREPARED") return false;
        submission.status = "SENDING";
        return true;
      }
      if (name === "finance_complete_sii_certification_submission") {
        completed++;
        if (completed <= (options.failCompletion ?? 0)) throw Error("Synthetic DB outage");
        submission.status = args.p_unknown ? "UNKNOWN" : "SUBMITTED";
        submission.trackId = args.p_track;
        submission.response = args.p_response;
        return;
      }
      if (name === "finance_record_sii_certification_status") {
        submission.status = args.p_status;
        submission.response = args.p_response;
        return true;
      }
      calls.push({ rpc: name, args });
      return 1;
    },
  };
  const context = new FinanceContext(repo, {
      client: async () => null,
      ownClientIds: async () => [],
    }),
    sii = {
      secretRef: () => "qa",
      validateCertificationArtifact: async () => {
        calls.push({ preflight: true });
        if (options.failPreflight) throw Error("Validación local fallida");
      },
      authenticate: async () => "synthetic-token",
      sendCertificationArtifact: async () => {
        sent++;
        if (options.failSend) throw Error(options.failSendMessage ?? "Synthetic timeout");
        return { trackId: "987654", status: "0" };
      },
      getSubmissionStatus: async (...args) => {
        calls.push({ statusArgs: args });
        if (options.failQuery) throw Error("SII 106: consulta no autorizada");
        return { status: "REJECTED", code: "-11", message: "Consulta no autorizada" };
      },
    };
  const service = new SiiCertificationWorkspace(
    context,
    {
      metadata: () => ({ fingerprintSha256: certificate.certificate.fingerprint256 }),
      load: () => certificate,
    },
    sii,
  );
  return {
    service,
    repo,
    rows,
    files,
    calls,
    runId,
    id,
    artifactId,
    artifact,
    submission,
    run,
    sent: () => sent,
  };
}
const admin = { role: "GERENTE_GENERAL", userId: "synthetic-qa-user" };
test("workspace: acceso incorrecto, IDs inválidos, empresa ajena y producción no leen objetos privados", async () => {
  const f = await workspaceFixture();
  await assert.rejects(
    () => f.service.detail(f.runId, { role: "PROGRAMADOR", userId: "qa" }),
    /permiso/,
  );
  await assert.rejects(() => f.service.download("no-es-uuid", f.artifactId, admin), /uuid/i);
  f.run.companyRut = "22222222-2";
  await assert.rejects(() => f.service.download(f.runId, f.artifactId, admin), /otra empresa/);
  assert.equal(f.calls.filter((c) => c.bucket).length, 0);
  const prod = await workspaceFixture({ environment: "PRODUCTION" });
  await assert.rejects(() => prod.service.overview(admin), /sólo admite certificación/);
  const missing = await workspaceFixture({ configured: false });
  await assert.rejects(() => missing.service.overview(admin), /Persistencia no configurada/);
});
test("workspace: descarga por ID rechaza rutas arbitrarias, objeto ausente y huella alterada", async () => {
  const f = await workspaceFixture(),
    original = f.artifact.storagePath,
    stored = f.files.get(`finance-documents/${original}`);
  f.artifact.storagePath = "clients/otro/comprobante.pdf";
  await assert.rejects(() => f.service.download(f.runId, f.artifactId, admin), /ajeno/);
  assert.equal(f.calls.filter((c) => c.bucket).length, 0);
  f.artifact.storagePath = original;
  f.artifact.runId = "otro";
  await assert.rejects(() => f.service.download(f.runId, f.artifactId, admin), /ajeno/);
  f.artifact.runId = f.runId;
  f.files.clear();
  await assert.rejects(() => f.service.download(f.runId, f.artifactId, admin), /no pudo leerse/);
  f.files.set(`finance-documents/${original}`, Buffer.from("cambio"));
  await assert.rejects(() => f.service.download(f.runId, f.artifactId, admin), /huella/);
  f.files.set(`finance-documents/${original}`, stored);
  assert((await f.service.download(f.runId, f.artifactId, admin)).bytes.equals(stored));
  assert(
    f.calls
      .filter((c) => c.table === "sii_certification_submissions")
      .every((c) => c.sort.order === "id"),
  );
});
test("workspace: doble clic transmite una vez; un error de consulta no prueba rechazo", async () => {
  const prior = process.env.FINANCE_ENCRYPTION_KEY;
  process.env.FINANCE_ENCRYPTION_KEY = "ab".repeat(32);
  try {
    const f = await workspaceFixture(),
      results = await Promise.allSettled([
        f.service.submit(f.runId, f.id, admin),
        f.service.submit(f.runId, f.id, admin),
      ]);
    assert(results.some((r) => r.status === "fulfilled"));
    assert.equal(f.sent(), 1);
    assert.equal(f.submission.trackId, "987654");
    await f.service.refresh(f.runId, f.id, admin);
    assert.equal(f.submission.status, "SUBMITTED");
    assert.deepEqual(f.calls.find((c) => c.statusArgs).statusArgs, [
      "987654",
      "CERTIFICATION",
      company.rut,
    ]);
  } finally {
    if (prior === undefined) delete process.env.FINANCE_ENCRYPTION_KEY;
    else process.env.FINANCE_ENCRYPTION_KEY = prior;
  }
});
test("workspace: recepción incierta bloquea el reenvío y no inventa Track ID", async () => {
  const f = await workspaceFixture({ failSend: true });
  await assert.rejects(() => f.service.submit(f.runId, f.id, admin), /bloqueado/);
  assert.equal(f.submission.status, "UNKNOWN");
  assert.equal(f.submission.trackId, null);
  await assert.rejects(() => f.service.submit(f.runId, f.id, admin), /adquirido/);
  assert.equal(f.sent(), 1);
  await assert.rejects(
    () => f.service.recoverReceipt(f.runId, f.id, admin),
    /No se encontró un recibo/,
  );
});
test("workspace: conserva códigos de transporte sin secretos ni retransmisiones", async () => {
  for (const [message, expected] of [
    ["SII HTTP/1.0 respondió 503; recepción no confirmada.", { httpStatus: 503 }],
    ["SII HTTP/1.0 sin recepción confirmada (curl 28).", { curlExitCode: 28 }],
    [
      "SII certificación: recepción no confirmada (STATUS 7); requiere revisión sin reintento automático.",
      { siiStatus: "7" },
    ],
    ["TOKEN=synthetic-secret <Documento>datos privados</Documento>", {}],
  ]) {
    const f = await workspaceFixture({ failSend: true, failSendMessage: message });
    await assert.rejects(() => f.service.submit(f.runId, f.id, admin), /bloqueado/);
    assert.equal(f.submission.status, "UNKNOWN");
    assert.equal(f.submission.trackId, null);
    assert.deepEqual(f.submission.response.diagnostic, { code: "UPLOAD_UNCONFIRMED", ...expected });
    assert(!JSON.stringify(f.submission.response).includes("synthetic-secret"));
    assert(!JSON.stringify(f.submission.response).includes("Documento"));
    await assert.rejects(() => f.service.submit(f.runId, f.id, admin), /adquirido/);
    assert.equal(f.sent(), 1);
  }
});
test("workspace: un error de consulta conserva el Track ID y el último estado confirmado", async () => {
  const f = await workspaceFixture({ failQuery: true });
  f.submission.status = "SUBMITTED";
  f.submission.trackId = "123456";
  f.submission.response = { receipt: "synthetic-confirmed-receipt" };
  await assert.rejects(() => f.service.refresh(f.runId, f.id, admin), /SII 106/);
  assert.equal(f.submission.status, "SUBMITTED");
  assert.equal(f.submission.trackId, "123456");
  assert.deepEqual(f.submission.response, { receipt: "synthetic-confirmed-receipt" });
  assert.equal(f.sent(), 0);
});
test("workspace: una validación local fallida no adquiere el envío ni registra recepción incierta", async () => {
  const f = await workspaceFixture({ failPreflight: true });
  await assert.rejects(() => f.service.submit(f.runId, f.id, admin), /Validación local fallida/);
  assert.equal(f.submission.status, "PREPARED");
  assert.equal(f.submission.trackId, null);
  assert.equal(f.sent(), 0);
  assert.equal(f.calls.filter((c) => c.preflight).length, 1);
});
test("workspace: recibo cifrado recupera fallo posterior al envío sin retransmitir", async () => {
  const prior = process.env.FINANCE_ENCRYPTION_KEY;
  process.env.FINANCE_ENCRYPTION_KEY = "cd".repeat(32);
  try {
    const f = await workspaceFixture({ failCompletion: 2 });
    await assert.rejects(() => f.service.submit(f.runId, f.id, admin), /Track ID 987654/);
    assert.equal(f.sent(), 1);
    assert.equal(f.submission.status, "SENDING");
    const receipt = f.files.get(`finance-secrets/certification-receipts/${f.runId}/${f.id}.enc`);
    assert(receipt && !receipt.toString().includes("987654"));
    await f.service.recoverReceipt(f.runId, f.id, admin);
    assert.equal(f.submission.status, "SUBMITTED");
    assert.equal(f.submission.trackId, "987654");
    assert.equal(f.sent(), 1);
  } finally {
    if (prior === undefined) delete process.env.FINANCE_ENCRYPTION_KEY;
    else process.env.FINANCE_ENCRYPTION_KEY = prior;
  }
});
test("workspace: borrador se consulta exclusivamente por empresa y usuario", async () => {
  const f = await workspaceFixture();
  assert.equal(await f.service.draft("a".repeat(64), admin), null);
  const call = f.calls.find((c) => c.table === "sii_certification_drafts");
  assert.deepEqual(call.filters, {
    companyRut: company.rut,
    createdBy: admin.userId,
    setSha256: "a".repeat(64),
  });
  assert.equal(call.sort.order, "updatedAt");
  await assert.rejects(
    () => f.service.draft("a".repeat(64), { ...admin, userId: null }),
    /identidad/,
  );
});

test("firma DTE aislada mantiene digest, referencia y certificado aun con sobre válido", () => {
  const { input, caf } = fixture();
  const built = certificationDocumentXml(input, caf, certificate);
  assert.equal(verifySiiXmlSignatures(built.xml, certificate.certificate.fingerprint256).length, 1);
  for (const changed of [
    built.xml.replace("<MntTotal>2380", "<MntTotal>2381"),
    built.xml.replace("Ítem sintético", "Otro sintético"),
    built.xml.replace('URI="#F1T33"', 'URI="https://example.invalid/document.xml"'),
    built.xml.replace(
      "http://www.w3.org/2000/09/xmldsig#sha1",
      "http://www.w3.org/2001/04/xmlenc#sha256",
    ),
  ]) {
    const outer = certificationEnvelope(
      [changed],
      company,
      "33333333-3",
      certificate,
      "CERTIFICATION",
    );
    assert.throws(() => verifySiiXmlSignatures(outer, certificate.certificate.fingerprint256));
  }
});

test("revisión parcial no permite secciones inventadas, duplicadas ni proceso inicial incompleto", async () => {
  const f = await workspaceFixture();
  const source =
    "SET BASICO - NUMERO DE ATENCION: 1234567\n\nCASO 1234567-1\n==============\nDOCUMENTO\tFACTURA ELECTRONICA\nITEM\tCANTIDAD\tPRECIO UNITARIO\nServicio QA\t1\t1000\n";
  const form = {
    runId: "66666666-6666-4666-8666-666666666666",
    date: "2026-10-23",
    reviewed: true,
    setFile: { fileName: "set-qa.txt", contentBase64: Buffer.from(source).toString("base64") },
    cases: [
      {
        caseId: "1234567-1",
        receiver: fixture().input.receiver,
        lines: [{ description: "Servicio QA", quantity: 1, unitPrice: 1000, exempt: false }],
      },
    ],
  };
  for (const extra of [
    { sectionAttentions: ["1234567"] },
    { previousRunId: f.runId, sectionAttentions: ["9999999"] },
    { previousRunId: f.runId, sectionAttentions: ["1234567", "1234567"] },
  ])
    await assert.rejects(
      () => f.service.prepare({ ...form, ...extra }, admin),
      /secciones únicas del set oficial/,
    );
  assert.equal(f.sent(), 0);
  assert.equal(f.rows.sii_certification_runs.length, 1);
});

test("retención de factura de compra y notas vincula sólo partidas afectas al impuesto del encabezado", async () => {
  for (const type of [46, 56, 61]) {
    const f = fixture(type, {
      retention: { code: 15, rate: 19 },
      lines: [
        { description: "Servicio afecto QA", quantity: 2, unitPrice: 1000, exempt: false },
        { description: "Servicio exento QA", quantity: 1, unitPrice: 500, exempt: true },
      ],
      ...([56, 61].includes(type)
        ? {
            references: [
              { type: 46, folio: "1", date: "2026-01-02", code: 3, reason: "Ajuste QA" },
            ],
          }
        : {}),
    });
    const built = certificationDocumentXml(f.input, f.caf, certificate);
    const doc = child(parseXml(built.xml), "Documento");
    const lines = doc.children.filter((node) => node.name === "Detalle");
    assert.equal(textOf(lines[0], "CodImpAdic"), "15");
    assert.equal(textOf(lines[1], "CodImpAdic"), "");
    const totals = child(child(doc, "Encabezado"), "Totales");
    assert.equal(textOf(child(totals, "ImptoReten"), "TipoImp"), "15");
    assert.equal(textOf(child(totals, "ImptoReten"), "MontoImp"), "380");
    assert.equal(textOf(totals, "MntTotal"), "2500");
    await validateCertificationXml(
      certificationEnvelope([built.xml], company, company.rut, certificate, "CERTIFICATION"),
      "EnvioDTE_v10.xsd",
    );
  }
});
