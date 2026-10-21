import test from 'node:test';
import assert from 'node:assert/strict';
import { documentTypeCatalog } from '../dist/finance/finance.dte-catalog.js';
import { DteService } from '../dist/finance/finance.dte.js';

const actor = { userId: '10000000-0000-4000-8000-000000000001', role: 'FINANZAS' };
const codes = [33, 34, 39, 41, 43, 46, 52, 56, 61, 110, 111, 112];

function fixture({ stored = [], provider = 'SII_DIRECT', denied = false } = {}) {
  let writes = 0, reads = 0;
  const repo = {
    async list() { reads++; return stored; },
    async settings() { reads++; return { dteProvider: provider }; },
    async get(_table, code) { reads++; return stored.find(row => row.code === code); },
    async update(_table, code, patch) { writes++; return { ...stored.find(row => row.code === code), ...patch }; },
    async audit() { writes++; },
    async create() { throw Error('UNEXPECTED_INSERT'); },
  };
  const ctx = { repo, require() { if (denied) throw Error('ACCESS_DENIED'); } };
  return { service: new DteService(ctx, {}, {}, {}, {}), counts: () => ({ writes, reads }) };
}

test('catálogo vacío conserva doce opciones sin habilitar ni inventar certificaciones', () => {
  const rows = documentTypeCatalog([], 'SII_DIRECT');
  assert.deepEqual(rows.map(row => row.code), codes);
  assert(rows.every(row => !row.catalogConfigured && !row.enabledForIssue && !row.certified && !row.canEnable));
  assert.deepEqual(rows.filter(row => row.implementationStatus === 'IMPLEMENTED').map(row => row.code), [33, 34, 56, 61]);
});

test('la consulta preserva configuración, evidencia y tipos adicionales sin mutar el origen', async () => {
  const stored = [{ code: 43, name: 'Liquidación registrada', certified: true, enabledForIssue: true, notes: 'EVIDENCIA SINTÉTICA' },
    { code: 999, name: 'Tipo adicional de prueba', certified: false, enabledForIssue: false }];
  const before = structuredClone(stored), x = fixture({ stored });
  const rows = await x.service.documentTypes();
  assert.equal(rows.length, 13);
  const liquidation = rows.find(row => row.code === 43);
  assert.equal(liquidation.certified, true);
  assert.equal(liquidation.enabledForIssue, true);
  assert.equal(liquidation.notes, 'EVIDENCIA SINTÉTICA');
  assert.equal(liquidation.implementationStatus, 'PENDING_IMPLEMENTATION');
  assert.equal(liquidation.canEnable, false);
  assert.equal(rows.find(row => row.code === 999).implementationStatus, 'PENDING_IMPLEMENTATION');
  assert.deepEqual(stored, before);
  assert.equal(x.counts().writes, 0);
});

test('proveedor externo no se anuncia implementado y proveedor ausente no permite habilitar', () => {
  const stored = [{ code: 33, enabledForIssue: false, certified: false }];
  const external = documentTypeCatalog(stored, 'EXTERNAL');
  assert(external.every(row => row.implementationStatus === 'PROVIDER_DEPENDENT'));
  assert.equal(external[0].canEnable, true);
  const none = documentTypeCatalog(stored, 'NONE');
  assert(none.every(row => row.implementationStatus === 'PROVIDER_NOT_CONFIGURED' && !row.canEnable));
});

test('habilitación rechaza formatos pendientes, configuración ausente y reintentos sin escrituras', async () => {
  for (const config of [{ stored: [{ code: 43 }] }, {}, { stored: [{ code: 33 }], provider: 'NONE' }]) {
    const x = fixture(config), code = config.stored?.[0]?.code ?? 110;
    for (let retry = 0; retry < 2; retry++) await assert.rejects(x.service.updateDocumentType(code, { enabledForIssue: true }, actor));
    assert.equal(x.counts().writes, 0);
  }
});

test('IDs inválidos, booleanos ambiguos y rol ajeno se rechazan antes de leer datos', async () => {
  for (const code of [NaN, -1, 33.5, 0]) {
    const x = fixture();
    await assert.rejects(x.service.updateDocumentType(code, { enabledForIssue: true }, actor));
    assert.deepEqual(x.counts(), { writes: 0, reads: 0 });
  }
  for (const body of [{ enabledForIssue: 'false' }, { certified: 1 }]) {
    const x = fixture();
    await assert.rejects(x.service.updateDocumentType(33, body, actor));
    assert.deepEqual(x.counts(), { writes: 0, reads: 0 });
  }
  const denied = fixture({ denied: true });
  await assert.rejects(denied.service.updateDocumentType(33, { enabledForIssue: true }, actor), /ACCESS_DENIED/);
  assert.deepEqual(denied.counts(), { writes: 0, reads: 0 });
});

test('deshabilitar formato pendiente sigue permitido y registrar certificación exige evidencia', async () => {
  const x = fixture({ stored: [{ code: 43, enabledForIssue: true }] });
  const disabled = await x.service.updateDocumentType(43, { enabledForIssue: false }, actor);
  assert.equal(disabled.enabledForIssue, false);
  assert.equal(x.counts().writes, 2);
  const y = fixture({ stored: [{ code: 33 }] });
  await assert.rejects(y.service.updateDocumentType(33, { certified: true }, actor), /evidencia/);
  assert.equal(y.counts().writes, 0);
  const certified = await y.service.updateDocumentType(33, { certified: true, notes: 'SII: evidencia sintética' }, actor);
  assert.equal(certified.certified, true);
  assert.equal(certified.enabledForIssue, undefined);
});
