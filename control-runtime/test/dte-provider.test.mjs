import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { DteCertificateProvider, DteSchemaValidator, SiiDirectDteProvider } from '../dist/finance/finance.dte-providers.js';
import { DteService } from '../dist/finance/finance.dte.js';
import { parseXml } from '../dist/finance/finance.formats.js';

const schema = new DteSchemaValidator();
test('LOK confirma un libro aceptado sin exigir contadores de DTE; LSO sigue pendiente', async () => {
  const provider = new SiiDirectDteProvider({}, schema);
  provider.authenticate = async () => 'synthetic-token';
  provider.soap = async () => parseXml('<RESPUESTA><RESP_HDR><ESTADO>LOK</ESTADO><GLOSA>Envio de Libro Aceptado - Cuadrado</GLOSA></RESP_HDR></RESPUESTA>');
  const accepted = await provider.getSubmissionStatus('123456', 'CERTIFICATION', '76086428-5');
  assert.equal(accepted.status, 'ACCEPTED');
  assert.equal(accepted.code, 'LOK');
  assert.equal(accepted.detail.accepted, 0);
  provider.soap = async () => parseXml('<RESPUESTA><RESP_HDR><ESTADO>LSO</ESTADO><GLOSA>Schema de Envio de Libro Correcto</GLOSA></RESP_HDR></RESPUESTA>');
  assert.equal((await provider.getSubmissionStatus('123456', 'CERTIFICATION', '76086428-5')).status, 'RECEIVED_BY_SII');
});
test('errores de consulta del SII no confirman recepción, aceptación ni rechazo tributario', async () => {
  const provider = new SiiDirectDteProvider({}, schema);
  provider.authenticate = async () => 'synthetic-token';
  for (const code of ['106', '-11', '105']) {
    provider.soap = async () => parseXml(`<RESPUESTA><RESP_HDR><ESTADO>${code}</ESTADO><GLOSA>Consulta no autorizada</GLOSA></RESP_HDR></RESPUESTA>`);
    await assert.rejects(() => provider.getSubmissionStatus('123456', 'CERTIFICATION', '76086428-5'), /Se conserva el último estado/);
  }
  provider.soap = async () => parseXml('<RESPUESTA><RESP_HDR><ESTADO>EPR</ESTADO></RESP_HDR><RESP_BODY><ACEPTADOS>5</ACEPTADOS><RECHAZADOS>0</RECHAZADOS></RESP_BODY></RESPUESTA>');
  assert.equal((await provider.getSubmissionStatus('123456', 'CERTIFICATION', '76086428-5')).status, 'ACCEPTED');
});
test('encuentra los cuatro XSD desde el proceso combinado en la raíz', () => {
  assert.equal(schema.available(), true);
  assert.match(schema.directory(), /control-runtime\/resources\/sii\/xsd/);
});
test('RPR del consumo de folios es aceptación con reparos sin contadores de DTE', async () => {
  const provider = new SiiDirectDteProvider({}, schema);
  provider.authenticate = async () => 'synthetic-token';
  provider.soap = async () => parseXml('<RESPUESTA><RESP_HDR><ESTADO>RPR</ESTADO><GLOSA>Aceptado con Reparos</GLOSA></RESP_HDR></RESPUESTA>');
  const result = await provider.getSubmissionStatus('123456', 'CERTIFICATION', '76086428-5');
  assert.equal(result.status, 'ACCEPTED_WITH_REPAIRS');
  assert.equal(result.code, 'RPR');
  assert.equal(result.message, 'Aceptado con Reparos');
  assert.equal(result.detail.accepted, 0);
  provider.soap = async () => parseXml('<RESPUESTA><RESP_HDR><ESTADO>RPR</ESTADO></RESP_HDR><RESP_BODY><RECHAZADOS>1</RECHAZADOS></RESP_BODY></RESPUESTA>');
  assert.equal((await provider.getSubmissionStatus('123456', 'CERTIFICATION', '76086428-5')).status, 'REJECTED');
});
test('valida el ejemplo oficial del SII con los esquemas publicados', async () => {
  const xml = await readFile(new URL('./fixtures/F60T33-ejemplo.xml', import.meta.url), 'latin1');
  assert.deepEqual(await schema.validate(xml), []);
  assert.notDeepEqual(await schema.validate(xml.replace('<TipoDTE>33</TipoDTE>', '<TipoDTE>999</TipoDTE>')), []);
});
test('rechaza documentos fuera del formato y esquemas arbitrarios', async () => {
  assert.notDeepEqual(await schema.validate('<factura/>'), []);
  assert.deepEqual(await schema.validate('<factura/>', '../otro.xsd'), ['Esquema DTE no permitido.']);
});
test('no reemplaza el firmante por el RUT de la empresa', async () => {
  const previous = process.env.DTE_SENDER_RUT;
  try {
    delete process.env.DTE_SENDER_RUT;
    const provider = new SiiDirectDteProvider(new DteCertificateProvider(), schema);
    assert.throws(() => provider.senderRut(), /DTE_SENDER_RUT/);
    assert.equal((await provider.requirements()).find(r => r.key === 'sender').satisfied, false);
    process.env.DTE_SENDER_RUT = '76086428-5';
    assert.equal(provider.senderRut(), '76086428-5');
  } finally {
    if (previous === undefined) delete process.env.DTE_SENDER_RUT; else process.env.DTE_SENDER_RUT = previous;
  }
});
test('la preparación global muestra folios y tipo 33 pendientes aunque no haya factura', async () => {
  const repo = {
    configured: () => false,
    settings: async () => ({ dteProvider: 'SII_DIRECT', dteEnvironment: 'CERTIFICATION' }),
    list: async () => [], get: async () => ({ enabledForIssue: false }), count: async () => 0,
  };
  const service = new DteService({ repo }, {}, { requirements: async () => [], secretRef: () => 'DTE_CERTIFICATE_PEM' }, {}, { metadata: () => { throw Error('Sin certificado'); } });
  const ready = await service.readiness();
  assert.equal(ready.canIssue, false);
  for (const key of ['persistence', 'document_type', 'folios', 'certificate_registry']) assert.equal(ready.requirements.find(r => r.key === key).satisfied, false);
});

test('consulta todos los tipos del sobre y conserva los rechazos posteriores al primero', async () => {
  const provider = new SiiDirectDteProvider({}, schema);
  provider.authenticate = async () => 'synthetic-token';
  provider.soap = async () => parseXml('<RESPUESTA><RESP_HDR><ESTADO>EPR</ESTADO></RESP_HDR><RESP_BODY><TIPO_DOCTO>33</TIPO_DOCTO><INFORMADOS>4</INFORMADOS><ACEPTADOS>4</ACEPTADOS></RESP_BODY><RESP_BODY><TIPO_DOCTO>56</TIPO_DOCTO><INFORMADOS>1</INFORMADOS><RECHAZADOS>1</RECHAZADOS></RESP_BODY><RESP_BODY><TIPO_DOCTO>61</TIPO_DOCTO><INFORMADOS>3</INFORMADOS><RECHAZADOS>3</RECHAZADOS></RESP_BODY></RESPUESTA>');
  const result = await provider.getSubmissionStatus('123456', 'CERTIFICATION', '76086428-5');
  assert.equal(result.status, 'REJECTED');
  assert.equal(result.detail.accepted, 4);
  assert.equal(result.detail.rejected, 4);
  assert.equal(result.detail.informados, '8');
  assert.deepEqual(result.detail.statistics.map(row => row.type), ['33', '56', '61']);
  provider.soap = async () => parseXml('<RESPUESTA><RESP_HDR><ESTADO>EPR</ESTADO></RESP_HDR><RESP_BODY><TIPO_DOCTO>33</TIPO_DOCTO><INFORMADOS>4</INFORMADOS><ACEPTADOS>3</ACEPTADOS><RECHAZADOS>1</RECHAZADOS><REPAROS>0</REPAROS><TIPO_DOCTO>56</TIPO_DOCTO><INFORMADOS>1</INFORMADOS><ACEPTADOS>1</ACEPTADOS><RECHAZADOS>0</RECHAZADOS><REPAROS>0</REPAROS><TIPO_DOCTO>61</TIPO_DOCTO><INFORMADOS>3</INFORMADOS><ACEPTADOS>3</ACEPTADOS><RECHAZADOS>0</RECHAZADOS><REPAROS>0</REPAROS></RESP_BODY></RESPUESTA>');
  const flattened = await provider.getSubmissionStatus('123456', 'CERTIFICATION', '76086428-5');
  assert.equal(flattened.detail.accepted,7);
  assert.equal(flattened.detail.rejected,1);
  assert.equal(flattened.detail.informados,'8');
  assert.equal(flattened.detail.statistics.length,3);
  provider.soap = async () => parseXml('<RESPUESTA><RESP_HDR><ESTADO>EPR</ESTADO></RESP_HDR><RESP_BODY><ACEPTADOS>NaN</ACEPTADOS></RESP_BODY></RESPUESTA>');
  await assert.rejects(() => provider.getSubmissionStatus('123456', 'CERTIFICATION', '76086428-5'), /Contadores SII inválidos/);
});

test('multipart SII conserva bytes firmados, longitud exacta, campos y cierre RFC 1867', async () => {
  const { siiUploadBody } = await import('../dist/finance/finance.sii-upload.js');
  const xml = '<?xml version="1.0" encoding="ISO-8859-1"?><DTE>áñ& amp;</DTE>';
  const upload = siiUploadBody(xml, '76086428-5', '76086428-5', 'envio_1.xml');
  assert.equal(upload.headers['Content-Length'], String(upload.body.length));
  const boundary = upload.headers['Content-Type'].split('boundary=')[1];
  const source = upload.body.toString('latin1');
  assert.ok(source.startsWith(`--${boundary}\r\n`));
  assert.ok(source.endsWith(`\r\n--${boundary}--\r\n`));
  assert.equal(source.split(`--${boundary}`).length, 7);
  assert.ok(source.includes('name="rutSender"\r\n\r\n76086428\r\n'));
  assert.ok(source.includes('name="dvCompany"\r\n\r\n5\r\n'));
  assert.ok(upload.body.includes(Buffer.from(xml, 'latin1')));
  assert.ok(!upload.body.includes(Buffer.from('á', 'utf8')));
  assert.throws(() => siiUploadBody(xml, '76086428-5', '76086428-5', 'x.xml\r\nInjected: yes'));
  assert.throws(() => siiUploadBody('<DTE>😀</DTE>', '76086428-5', '76086428-5', 'x.xml'));
});

test('HTTP 1.0 sólo transmite al SII con token sin controles ni destinos arbitrarios', async () => {
  const { siiHttp10Upload, siiHttp10Available, siiUploadBody } = await import('../dist/finance/finance.sii-upload.js');
  const body=siiUploadBody('<DTE/>','76086428-5','76086428-5','envio.xml');
  assert.equal(siiHttp10Available(),true);
  await assert.rejects(()=>siiHttp10Upload('example.invalid','synthetic-token',body),/Destino o autenticación/);
  await assert.rejects(()=>siiHttp10Upload('maullin.sii.cl','invalid\r\nInjected: yes',body),/Destino o autenticación/);
});

test('carga curl usa XML privado, limpia el temporal y no repite un transporte fallido', async () => {
  const { mkdtemp, writeFile, rm, access } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { siiHttp10Upload, siiUploadBody } = await import('../dist/finance/finance.sii-upload.js');
  const directory = await mkdtemp(join(tmpdir(), 'sii-transport-test-'));
  const capture = join(directory, 'captured.json');
  const oldPath = process.env.PATH;
  const oldCapture = process.env.SII_TEST_CAPTURE;
  const oldFailure = process.env.SII_TEST_FAILURE;
  try {
    await writeFile(join(directory, 'curl'), `#!/usr/bin/env node
const fs=require('node:fs'),path=require('node:path');let config='';process.stdin.setEncoding('utf8');process.stdin.on('data',b=>config+=b);process.stdin.on('end',()=>{
 const args=process.argv.slice(2),part=args.find(x=>x.startsWith('archivo=@')),file=part.slice(9).split(';')[0];
 fs.writeFileSync(process.env.SII_TEST_CAPTURE,JSON.stringify({attempt:fs.existsSync(process.env.SII_TEST_CAPTURE)?JSON.parse(fs.readFileSync(process.env.SII_TEST_CAPTURE,'utf8')).attempt+1:1,args,config,file,xml:fs.readFileSync(file).toString('base64'),mode:fs.statSync(file).mode&511,directoryMode:fs.statSync(path.dirname(file)).mode&511}),{mode:384});
 if(process.env.SII_TEST_FAILURE==='1')process.exit(28);process.stdout.write('<RECEPCIONDTE><STATUS>0</STATUS><TRACKID>123456</TRACKID></RECEPCIONDTE>\\n200');
});\n`, { mode: 0o700 });
    process.env.PATH = `${directory}:${oldPath}`;
    process.env.SII_TEST_CAPTURE = capture;
    delete process.env.SII_TEST_FAILURE;
    const xml = '<?xml version="1.0" encoding="ISO-8859-1"?><DTE>áñ</DTE>';
    const body = siiUploadBody(xml, '76086428-5', '76086428-5', 'envio.xml');
    assert.match(await siiHttp10Upload('maullin.sii.cl', 'synthetic-token', body), /<TRACKID>123456/);
    const sent = JSON.parse(await readFile(capture, 'utf8'));
    assert.equal(Buffer.from(sent.xml, 'base64').toString('latin1'), xml);
    assert.equal(sent.mode, 0o600);
    assert.equal(sent.attempt, 1);
    assert.equal(sent.directoryMode & 0o077, 0);
    assert.ok(sent.args.includes('--http1.0'));
    assert.ok(sent.args.includes('rutSender=76086428'));
    assert.ok(!sent.args.some(value => value.includes('synthetic-token') || value.includes('<DTE>')));
    assert.match(sent.config, /Cookie: TOKEN=synthetic-token/);
    assert.doesNotMatch(sent.config, /Content-Length|Content-Type/);
    await assert.rejects(() => access(sent.file));
    process.env.SII_TEST_FAILURE = '1';
    await assert.rejects(() => siiHttp10Upload('maullin.sii.cl', 'synthetic-token', body), /curl 28/);
    const failed = JSON.parse(await readFile(capture, 'utf8'));
    assert.equal(failed.attempt, 2);
    await assert.rejects(() => access(failed.file));
  } finally {
    if(oldPath===undefined)delete process.env.PATH;else process.env.PATH=oldPath;
    if(oldCapture===undefined)delete process.env.SII_TEST_CAPTURE;else process.env.SII_TEST_CAPTURE=oldCapture;
    if(oldFailure===undefined)delete process.env.SII_TEST_FAILURE;else process.env.SII_TEST_FAILURE=oldFailure;
    await rm(directory, { recursive: true, force: true });
  }
});
