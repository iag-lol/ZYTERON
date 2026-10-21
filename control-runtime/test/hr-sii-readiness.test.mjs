import test from 'node:test';
import assert from 'node:assert/strict';
import { DteService } from '../dist/finance/finance.dte.js';
import { FinanceContext } from '../dist/finance/finance.core.js';
import { FinanceController } from '../dist/finance/finance.controller.js';
import { siiDocumentCatalog } from '@zyteron/contracts';

const actor = { role: 'FINANZAS', userId: '10000000-0000-4000-8000-000000000001' };
function fixture() {
  const queries = [], writes = [];
  const settings = { dteProvider: 'SII_DIRECT', dteEnvironment: 'CERTIFICATION', companyRut: '11111111-1', companyLegalName: 'EMPRESA SINTÉTICA', companyBusinessActivity: 'Pruebas', companyActivityCode: '620200', companyAddress: 'Dirección sintética', companyCommune: 'Comuna sintética', dteResolutionNumber: 0, dteResolutionDate: '2026-01-01' };
  const repo = {
    configured() { return true; },
    async settings() { queries.push(['settings']); return settings; },
    async list(table) { queries.push(['list', table]); return []; },
    async get(table, code) { queries.push(['get', table, code]); return { code, enabledForIssue: true, certified: false }; },
    async count(table, filters) { queries.push(['count', table, filters]); return filters.documentTypeCode === 52 ? 7 : 0; },
    async update() { writes.push('update'); throw Error('UNEXPECTED_WRITE'); },
    async create() { writes.push('create'); throw Error('UNEXPECTED_WRITE'); },
    async reserveFolio() { writes.push('reserveFolio'); throw Error('UNEXPECTED_RESERVATION'); },
  };
  const sii = { secretRef: () => 'SYNTHETIC_CERT', async requirements(environment, code) { queries.push(['requirements', environment, code]); return [{ key: 'document_format', label: 'Formato', satisfied: [33, 34, 56, 61].includes(code), detail: 'Estado sintético' }]; } };
  const certificates = { metadata() { throw Error('No certificado de prueba'); } };
  return { service: new DteService(new FinanceContext(repo, {}), {}, sii, {}, certificates), queries, writes };
}

test('preparación por tipo conserva doce opciones y consulta CAF del tipo correcto sin reservar folios', async () => {
  for (const { code } of siiDocumentCatalog) {
    const x = fixture(), result = await x.service.documentTypeReadiness(code, actor);
    assert.equal(result.canIssue, false);
    assert.equal(result.environment, 'CERTIFICATION');
    assert(x.queries.some(q => q[0] === 'get' && q[2] === code));
    assert(x.queries.some(q => q[0] === 'count' && q[2].documentTypeCode === code));
    assert(x.queries.some(q => q[0] === 'requirements' && q[2] === code));
    assert.equal(result.requirements.find(item => item.key === 'folios').satisfied, code === 52);
    assert.equal(result.requirements.find(item => item.key === 'document_format').satisfied, [33, 34, 56, 61].includes(code));
    assert.deepEqual(x.writes, []);
  }
});

test('RRHH y perfiles ajenos no leen preparación ni catálogo financiero en servidor', async () => {
  for (const role of ['RRHH', 'PROGRAMADOR', 'EJECUTIVA_VENTAS']) {
    const x = fixture(), denied = { ...actor, role };
    await assert.rejects(x.service.documentTypeReadiness(33, denied), error => error.getStatus() === 403);
    await assert.rejects(x.service.documentTypes(denied), error => error.getStatus() === 403);
    await assert.rejects(x.service.readiness(undefined, denied), error => error.getStatus() === 403);
    assert.deepEqual(x.queries, []);
    assert.deepEqual(x.writes, []);
  }
});

test('códigos inválidos se rechazan antes de acceder a configuración o saldos', async () => {
  for (const code of [0, -1, 999, 33.5, NaN]) {
    const x = fixture();
    await assert.rejects(x.service.documentTypeReadiness(code, actor), error => error.getStatus() === 400);
    assert.deepEqual(x.queries, []);
    assert.deepEqual(x.writes, []);
  }
});

test('controlador transmite identidad verificada a las consultas de catálogo y preparación', async () => {
  const calls = [];
  const dte = { documentTypes(value) { calls.push(value); }, documentTypeReadiness(code, value) { calls.push({ code, ...value }); }, readiness(_id, value) { calls.push(value); } };
  const actual = new FinanceController({}, {}, {}, {}, {}, {}, dte);
  const headers = { 'x-zyteron-user-id': actor.userId, 'x-zyteron-role': actor.role };
  actual.documentTypes(headers); actual.documentTypeReadiness('52', headers); actual.dteReadiness(headers);
  assert.deepEqual(calls, [actor, { code: 52, ...actor }, actor]);
});
