import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { DteCertificateProvider, DteSchemaValidator, SiiDirectDteProvider } from '../dist/finance/finance.dte-providers.js';
import { DteService } from '../dist/finance/finance.dte.js';
import { parseXml } from '../dist/finance/finance.formats.js';

const schema = new DteSchemaValidator();
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
