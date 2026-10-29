import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { execFileSync } from "node:child_process";
import { createPublicKey, generateKeyPairSync, createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DteCertificateProvider,
  DteSchemaValidator,
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
import { productionBoletaLookupToken, verifyProductionBoletaLookupToken, verifyBoletaLookupToken, productionBoletaVerificationUrl } from "../dist/finance/finance.boleta-lookup.js";
import { publicProductionBoleta } from "../dist/finance/finance.boleta-public.js";
import { verifySiiXmlSignatures } from "../dist/finance/finance.sii-signatures.js";
import { directDteImplemented } from "../dist/finance/finance.dte-catalog.js";

let directory, provider, fixture;
const previousSecret = process.env.ZYTERON_SYNTHETIC_CERTIFICATE;
const previousSender = process.env.DTE_SENDER_RUT;
test("campos del formulario se conservan en XML, timbre e impresión con el esquema vigente",async()=>{
  const fixture=await createFixture({receiver:{rut:"22222222-2",legalName:"Receptor Sintético",businessActivity:"Pruebas",address:"Calle de prueba 200",commune:"Comuna de prueba",city:null,email:"facturas@example.com"},dueDate:null,dteOptions:{paymentForm:1,saleType:2,purchaseType:4,references:[{documentTypeCode:801,folio:"OC-101",date:"2026-01-01",reason:"Orden de compra"}]},lines:[{lineNumber:1,itemName:"Soporte mensual",description:"Servicio y atención durante enero",unit:"mes",quantity:1,unitPrice:110000,discountAmount:10000,netAmount:100000,isExempt:false}]});
  const xml=fixture.signed.toString("latin1");
  for(const tag of ["<FmaPago>1</FmaPago>","<CorreoRecep>facturas@example.com</CorreoRecep>","<TpoTranVenta>2</TpoTranVenta>","<TpoTranCompra>4</TpoTranCompra>","<NmbItem>Soporte mensual</NmbItem>","<DscItem>Servicio y atención durante enero</DscItem>","<UnmdItem>mes</UnmdItem>","<DescuentoMonto>10000</DescuentoMonto>","<IT1>Soporte mensual</IT1>","<TpoDocRef>801</TpoDocRef>","<FolioRef>OC-101</FolioRef>"])assert.ok(xml.includes(tag),tag);
  assert.deepEqual(await new DteSchemaValidator().validate(xml),[]);
  assert.equal((await renderPrintedDte(fixture.signed,fixture.envelope,fixture.record)).subarray(0,5).toString(),"%PDF-");
});
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
    signedFragment: signed,
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

test("el caso de certificación conserva SET primero y la factura original en segundo lugar", async () => {
  const item = await createFixture({
    documentTypeCode: 61,
    certificationCaseId: "1234-6",
    reference: { documentTypeCode: 33, folio: 7, date: "2026-01-01", code: 3, reason: "Corrección sintética" },
    caf: { ...fixture.input.caf, documentTypeCode: 61, cafXml: fixture.input.caf.cafXml.replace("<TD>33</TD>", "<TD>61</TD>") },
  });
  const xml = item.envelope.toString("latin1");
  assert.match(xml, /<Referencia><NroLinRef>1<\/NroLinRef><TpoDocRef>SET<\/TpoDocRef>[\s\S]*?<RazonRef>CASO 1234-6<\/RazonRef><\/Referencia>\s*<Referencia><NroLinRef>2<\/NroLinRef><TpoDocRef>33<\/TpoDocRef><FolioRef>7<\/FolioRef>/);
  assert.deepEqual(await new DteSchemaValidator().validate(xml), []);
});

test("un documento comercial normal no adquiere referencias SET", async () => {
  assert.doesNotMatch(fixture.signedFragment, /<TpoDocRef>SET<\/TpoDocRef>/);
});

const boletaFixture = async (type = 39, overrides = {}) => {
  const original = fixture.input;
  return createFixture({
    ...original, documentTypeCode: type, dueDate: null, boletaPaymentMethod:3,
    lines: original.lines.map(line => ({ ...line, isExempt: type === 41 })),
    totals: type === 41 ? { net: 0, exempt: 100000, taxRate: null, tax: 0, total: 100000 } : original.totals,
    caf: { ...original.caf, documentTypeCode: type, cafXml: original.caf.cafXml.replace('<TD>33</TD>', `<TD>${type}</TD>`) },
    ...overrides,
  });
};

test("boletas netas y exentas generan sobres propios, validan XSD y conservan las firmas", async () => {
  for (const type of [39, 41]) {
    const item = await boletaFixture(type);
    const xml = item.envelope.toString('latin1');
    assert.match(xml, /<EnvioBOLETA /);
    assert.match(xml, /<RznSocEmisor>/);
    assert.doesNotMatch(xml, /<Acteco>|<TasaIVA>|<TpoDocRef>SET/);
    assert.equal(xml.includes('<IndMntNeto>2</IndMntNeto>'), type === 39);
    assert.deepEqual(await new DteSchemaValidator().validate(xml, 'EnvioBOLETA_v11.xsd'), []);
    assert.equal(verifySiiXmlSignatures(xml).length, 2);
    assert.equal(verifySiiXmlSignatures(item.signed.toString('latin1')).length, 1);
    assert.equal((await renderPrintedDte(item.signed, item.envelope, item.record)).subarray(0, 5).toString(), '%PDF-');
  }
});

test("las boletas rechazan montos incoherentes, IVA en exentas y sobres mezclados", async () => {
  await assert.rejects(boletaFixture(41, { totals: fixture.input.totals }), /exenta|totales/);
  await assert.rejects(boletaFixture(39, { totals: { ...fixture.input.totals, tax: 19001, total: 119001 } }), /19%/);
  await assert.rejects(boletaFixture(39, { lines: [{ ...fixture.input.lines[0], quantity: 2 }] }), /Detalle/);
  await assert.rejects(boletaFixture(39, { lines: [] }), /entre 1 y 60/);
  await assert.rejects(boletaFixture(39, { lines: [{ ...fixture.input.lines[0], unitPrice: NaN }] }), /Detalle/);
  await assert.rejects(boletaFixture(39, { receiver: { ...fixture.input.receiver, legalName: 'Nombre 🙂' } }), /codificación XML/);
  await assert.rejects(boletaFixture(39, { reference: { documentTypeCode: 39, folio: 1 } }), /nota de crédito/);
  const item = await boletaFixture();
  assert.throws(() => provider.envelope([item.signedFragment, fixture.signedFragment], item.input), /sobres y servicios separados/);
  assert.throws(() => provider.envelope([item.signedFragment, item.signedFragment], item.input), /duplicados/);
});

test("un formato XML preparado no habilita emisión ni envía boletas por el servicio de facturas", async () => {
  const item = await boletaFixture();
  assert.equal(directDteImplemented(39), false);
  assert.equal((await provider.requirements('PRODUCTION', 39)).find(r => r.key === 'boleta_transport').satisfied, false);
  await assert.rejects(() => provider.send(item.signedFragment, item.input), /transporte REST de boletas requiere validación/);
  const cert = await boletaFixture(39, { certificationCaseId: 'CASO-1' });
  assert.match(cert.signedFragment, /<CodRef>SET<\/CodRef><RazonRef>CASO-1/);
  assert.throws(() => provider.envelope([cert.signedFragment], { ...cert.input, environment: 'PRODUCTION' }), /SET/);
});

test("REST autentica con semilla firmada y aísla tokens SOAP, ambientes y llamadas concurrentes", async (t) => {
  const p = new SiiDirectDteProvider({ load: () => new DteCertificateProvider().load('ZYTERON_SYNTHETIC_CERTIFICATE') }, {});
  p.token = { value: 'SOAP_ONLY', environment: 'CERTIFICATION', expires: Date.now() + 60000 };
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push(url);
    const tokenRequest = url.endsWith('.token');
    assert.equal(init.redirect, 'error');
    if (tokenRequest) {
      assert.equal(init.method, 'POST');
      assert.equal(init.headers['Content-Type'], 'application/xml');
      assert.match(init.body, /<Semilla>123456789<\/Semilla>/);
      assert.match(init.body, /<Signature xmlns=/);
      assert.doesNotMatch(init.body, /PRIVATE KEY|SOAP_ONLY/);
    }
    return new Response(tokenRequest ? '<RESPUESTA><RESP_HDR><ESTADO>00</ESTADO></RESP_HDR><RESP_BODY><TOKEN>SYNTHETIC_REST_TOKEN</TOKEN></RESP_BODY></RESPUESTA>' : '<RESPUESTA><RESP_HDR><ESTADO>00</ESTADO></RESP_HDR><RESP_BODY><SEMILLA>123456789</SEMILLA></RESP_BODY></RESPUESTA>');
  });
  assert.deepEqual(await Promise.all([p.authenticateBoleta('CERTIFICATION'),p.authenticateBoleta('CERTIFICATION')]), ['SYNTHETIC_REST_TOKEN','SYNTHETIC_REST_TOKEN']);
  assert.equal(calls.length, 2);
  await p.authenticateBoleta('CERTIFICATION');
  assert.equal(calls.length, 2);
  await p.authenticateBoleta('PRODUCTION');
  assert.deepEqual(calls.map(url => new URL(url).host), ['apicert.sii.cl','apicert.sii.cl','api.sii.cl','api.sii.cl']);
  assert.equal(p.token.value, 'SOAP_ONLY');
  await assert.rejects(() => p.authenticateBoleta('UNKNOWN'), /Ambiente/);
});

test("REST rechaza errores, HTML, semilla alterada y respuestas enormes; un reintento puede recuperarse", async (t) => {
  let reply = () => new Response('unavailable', {status:503});
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; return reply(); });
  const make = () => new SiiDirectDteProvider({ load: () => new DteCertificateProvider().load('ZYTERON_SYNTHETIC_CERTIFICATE') }, {});
  const p = make();
  for (const response of [() => new Response('unavailable',{status:503}), () => new Response('<html>not xml</html>'), () => new Response('<RESPUESTA><RESP_HDR><ESTADO>00</ESTADO></RESP_HDR><RESP_BODY><SEMILLA>&lt;attacker&gt;</SEMILLA></RESP_BODY></RESPUESTA>'), () => new Response('x'.repeat(16385))]) {
    reply = response;
    await assert.rejects(() => p.authenticateBoleta('CERTIFICATION'));
  }
  const failedCalls = calls;
  reply = () => new Response('<RESPUESTA><RESP_HDR><ESTADO>00</ESTADO></RESP_HDR><RESP_BODY><SEMILLA>1234</SEMILLA><TOKEN>SYNTHETIC_REST_TOKEN</TOKEN></RESP_BODY></RESPUESTA>');
  assert.equal(await p.authenticateBoleta('CERTIFICATION'), 'SYNTHETIC_REST_TOKEN');
  assert.equal(calls, failedCalls+2);
  let phase = 0;
  reply = () => new Response(++phase === 1 ? '<RESPUESTA><RESP_HDR><ESTADO>00</ESTADO></RESP_HDR><RESP_BODY><SEMILLA>1234</SEMILLA></RESP_BODY></RESPUESTA>' : '<RESPUESTA><RESP_HDR><ESTADO>11</ESTADO></RESP_HDR><RESP_BODY><TOKEN>DO_NOT_USE</TOKEN></RESP_BODY></RESPUESTA>');
  await assert.rejects(() => make().authenticateBoleta('CERTIFICATION'), /no confirmó la autenticación/);
});

test("el código productivo vincula ID y huella sin admitir códigos de certificación ni alterados", () => {
  const oldKey = process.env.FINANCE_ENCRYPTION_KEY;
  process.env.FINANCE_ENCRYPTION_KEY = 'b'.repeat(64);
  try {
    const id = '11111111-1111-4111-8111-111111111111', hash = 'a'.repeat(64);
    const token = productionBoletaLookupToken(id, hash);
    assert.ok(token.length <= 220);
    assert.deepEqual(verifyProductionBoletaLookupToken(token), { documentId: id, signedXmlSha256: hash });
    for (const bad of [token.replace('v2.', 'v1.'), token.slice(0, -2) + 'xx', token + '.', '../archivo']) assert.throws(() => verifyProductionBoletaLookupToken(bad));
    assert.throws(() => verifyBoletaLookupToken(token));
    assert.throws(() => productionBoletaLookupToken('../archivo', hash));
  } finally { if (oldKey === undefined) delete process.env.FINANCE_ENCRYPTION_KEY; else process.env.FINANCE_ENCRYPTION_KEY = oldKey; }
});

test("consulta productiva exige habilitación, empresa, aceptación, tipo, ruta, huella y firma", async () => {
  const previous = { key: process.env.FINANCE_ENCRYPTION_KEY, enabled: process.env.DTE_BOLETA_PUBLIC_LOOKUP_ENABLED, office: process.env.DTE_SII_OFFICE };
  process.env.FINANCE_ENCRYPTION_KEY = 'b'.repeat(64);
  process.env.DTE_SII_OFFICE = 'OFICINA DE PRUEBA';
  const item = await boletaFixture(39, { environment: 'PRODUCTION' });
  const id = '11111111-1111-4111-8111-111111111111';
  const hash = createHash('sha256').update(item.signed).digest('hex');
  const base = 'dte/production/39/42';
  const document = { ...item.record, id, environment: 'PRODUCTION', status: 'ACCEPTED', responsePath: `${base}/envio.xml`, xmlSignedPath: `${base}/signed.xml`, xmlSignedSha256: hash };
  const token = productionBoletaLookupToken(id, hash);
  let current = document, reads = [], content = item.signed;
  const repo = { configured: () => true, settings: async () => ({ companyRut: item.input.company.rut }), get: async (table, requested) => { assert.equal(table, 'tax_documents'); assert.equal(requested, id); return current; }, readFile: async (bucket, path) => { assert.equal(bucket, 'finance-documents'); reads.push(path); return path.endsWith('signed.xml') ? content : item.envelope; } };
  try {
    delete process.env.DTE_BOLETA_PUBLIC_LOOKUP_ENABLED;
    await assert.rejects(() => publicProductionBoleta(repo, token), /no está disponible/);
    assert.equal(reads.length, 0);
    process.env.DTE_BOLETA_PUBLIC_LOOKUP_ENABLED = 'true';
    const result = await publicProductionBoleta(repo, token);
    assert.equal(result.bytes.subarray(0, 5).toString(), '%PDF-');
    assert.deepEqual(reads, [`${base}/signed.xml`, `${base}/envio.xml`]);
    const pdf = await PDFDocument.load(result.bytes);
    assert.ok(pdf.getPages().length > 0);
    for (const patch of [ { id: '22222222-2222-4222-8222-222222222222' }, { emitterRut: '22222222-2' }, { environment: 'CERTIFICATION' }, { documentTypeCode: 33 }, { provider: 'EXTERNAL' }, { xmlSignedPath: '../other/signed.xml' }, { responsePath: 'another/envio.xml' }, { xmlSignedSha256: 'c'.repeat(64) }, ...['DRAFT','SIGNED','SUBMITTED','REJECTED','CANCELLED'].map(status => ({status})) ]) {
      current = { ...document, ...patch }; reads = [];
      await assert.rejects(() => publicProductionBoleta(repo, token), /no está disponible/);
      assert.equal(reads.length, 0);
    }
    current = document; content = Buffer.from(item.signed.toString('latin1').replace('100000', '100001'), 'latin1');
    await assert.rejects(() => publicProductionBoleta(repo, token), /no está disponible/);
    content = null;
    await assert.rejects(() => publicProductionBoleta(repo, token), /no está disponible/);
    assert.match(productionBoletaVerificationUrl(id, hash), /#v2\./);
  } finally {
    for (const [name, value] of [['FINANCE_ENCRYPTION_KEY',previous.key],['DTE_BOLETA_PUBLIC_LOOKUP_ENABLED',previous.enabled],['DTE_SII_OFFICE',previous.office]]) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  }
});

test("referencias de pruebas inválidas o productivas se rechazan antes de generar el timbre", async () => {
  for (const certificationCaseId of ["", "1234", "1234-0", "1234-1<xml>", " 1234-1", "1234-1\n"]) {
    await assert.rejects(provider.createDraft({ ...fixture.input, certificationCaseId }), /referencia SET/);
  }
  await assert.rejects(provider.createDraft({ ...fixture.input, certificationCaseId: "1234-1", environment: "PRODUCTION" }), /referencia SET/);
});

test("un envío mixto declara cantidades reales por tipo y mantiene el orden oficial de los casos", async () => {
  const second = await createFixture({
    documentTypeCode: 34, folio: 43, certificationCaseId: "1234-2",
    lines: fixture.input.lines.map(line => ({ ...line, isExempt: true })),
    totals: { net: 0, exempt: 100000, taxRate: null, tax: 0, total: 100000 },
    caf: { ...fixture.input.caf, documentTypeCode: 34, cafXml: fixture.input.caf.cafXml.replace("<TD>33</TD>", "<TD>34</TD>") },
  });
  const third = await createFixture({ folio: 44, certificationCaseId: "1234-3" });
  const xml = provider.envelope([fixture.signedFragment, second.signedFragment, third.signedFragment], fixture.input);
  assert.match(xml, /<SubTotDTE><TpoDTE>33<\/TpoDTE><NroDTE>2<\/NroDTE><\/SubTotDTE>/);
  assert.match(xml, /<SubTotDTE><TpoDTE>34<\/TpoDTE><NroDTE>1<\/NroDTE><\/SubTotDTE>/);
  assert.ok(xml.indexOf('ID="F42T33"') < xml.indexOf('ID="F43T34"'));
  assert.ok(xml.indexOf('ID="F43T34"') < xml.indexOf('ID="F44T33"'));
  assert.deepEqual(await new DteSchemaValidator().validate(xml), []);
});

test("el envío rechaza duplicados, otro emisor y documentos sin firma", () => {
  assert.throws(() => provider.envelope([], fixture.input), /al menos un documento/);
  assert.throws(() => provider.envelope([fixture.signedFragment, fixture.signedFragment], fixture.input), /duplicados/);
  assert.throws(() => provider.envelope([fixture.signedFragment.replace("<RUTEmisor>11111111-1</RUTEmisor>", "<RUTEmisor>22222222-2</RUTEmisor>")], fixture.input), /otro emisor/);
  assert.throws(() => provider.envelope([fixture.signedFragment.replace(/<Signature[\s\S]*?<\/Signature>/, "")], fixture.input), /firmado inválido/);
});

test("un documento SET ya firmado tampoco puede ensobrarse para producción", async () => {
  const item = await createFixture({ certificationCaseId: "1234-1" });
  assert.throws(() => provider.envelope([item.signedFragment], { ...fixture.input, environment: "PRODUCTION" }), /SET no están permitidas en producción/);
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
  const printed = await PDFDocument.load(pdf);
  assert.equal(printed.getPageCount(), 1);
  assert.ok(Math.abs(printed.getPage(0).getWidth() * 2.54 / 72 - 21.5) < 0.001);
  assert.ok(printed.getPage(0).getHeight() * 2.54 / 72 <= 33);
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
  for (const code of [46, 52]) {
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

test("boleta productiva identifica al cliente e incorpora medio de pago sin acreditar dinero",async()=>{
  const item=await boletaFixture(39,{environment:'PRODUCTION',boletaPaymentMethod:3});
  assert.match(item.signed.toString('latin1'),/<MedioPago>3<\/MedioPago>/);
  assert.deepEqual(await new DteSchemaValidator().validate(item.envelope.toString('latin1'),'EnvioBOLETA_v11.xsd'),[]);
  await assert.rejects(boletaFixture(39,{environment:'PRODUCTION',boletaPaymentMethod:undefined}),/medio de pago/);
  await assert.rejects(boletaFixture(39,{environment:'PRODUCTION',receiver:{...fixture.input.receiver,rut:'66666666-6'}}),/RUT real/);
  await assert.rejects(boletaFixture(41,{boletaPaymentMethod:6}),/Medio de pago/);
});

test('factura de sesenta líneas conserva firma, XSD y límites del upload sin cortar el XML', async () => {
  const lines=Array.from({length:60},(_,index)=>({lineNumber:index+1,description:'Servicio sintético '+index+' '+ 'a'.repeat(900),quantity:1,unitPrice:1000,discountAmount:0,netAmount:1000,isExempt:false}));
  const item=await createFixture({lines,totals:{net:60000,exempt:0,taxRate:0.19,tax:11400,total:71400}});
  assert.equal(verifySiiXmlSignatures(item.envelope.toString('latin1')).length,2);
  assert.deepEqual(await new DteSchemaValidator().validate(item.envelope.toString('latin1')),[]);
  assert.ok(Math.max(...item.envelope.toString('latin1').split(/\r?\n/).map(line=>Buffer.byteLength(line,'latin1'))) <= 4090);
  const certificate=item.envelope.toString('latin1').match(/<X509Certificate>([^<]+)<\/X509Certificate>/)[1];
  assert.ok(certificate.split('\n').every(line=>line.length <= 76));
  assert.equal(printedDteData(item.signed,item.envelope,item.record).lines.length,60);
});
