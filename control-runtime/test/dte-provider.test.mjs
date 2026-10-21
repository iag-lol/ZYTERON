import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { DteCertificateProvider, DteSchemaValidator, SiiDirectDteProvider } from '../dist/finance/finance.dte-providers.js';
import { DteService } from '../dist/finance/finance.dte.js';

const schema = new DteSchemaValidator();
test('encuentra los cuatro XSD desde el proceso combinado en la raíz', () => {
  assert.equal(schema.available(), true);
  assert.match(schema.directory(), /control-runtime\/resources\/sii\/xsd/);
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
