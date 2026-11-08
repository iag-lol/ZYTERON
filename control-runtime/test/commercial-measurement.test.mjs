import test from 'node:test';
import assert from 'node:assert/strict';
import { Temporal } from '@js-temporal/polyfill';
import { reportingWindow, summarizeMeasurement } from '../dist/commercial/measurement-report.js';
test('períodos completos en Chile conservan el calendario a través del cambio de hora', () => {
 const window = reportingWindow(7, Temporal.Instant.from('2026-09-08T15:00:00Z'));
 assert.equal(window.start, '2026-09-01T04:00:00Z'); assert.equal(window.end, '2026-09-08T03:00:00Z');
 assert.equal(window.previousStart, '2026-08-25T04:00:00Z');
});
test('deduplica etapas y ventas, separa monedas y no atribuye fuentes desconocidas a la web', () => {
 const sale = { id: 'sale', quote_id: 'quote', status: 'WON', closed_at: '2026-11-05T12:00:00Z', amount: 100, currency: 'CLP' };
 const data = {
  leads: [{ id: 'lead', created_at: '2026-11-02T12:00:00Z', interest: 'PACKAGE_BUILDER', notes: 'contact_v1:'+JSON.stringify({service:'Tienda online'}), lead_sources: { code: 'COTIZADOR_WEB' } }],
  qualifications: [{ aggregate_id: 'lead', occurred_at: '2026-11-03T12:00:00Z' }, { aggregate_id: 'lead', occurred_at: '2026-11-04T12:00:00Z' }],
  quotes: [{ id: 'quote', lead_id: 'lead', sent_at: '2026-11-04T12:00:00Z' }, { id: 'accepted-only', lead_id: 'lead', sent_at: null }],
  opportunities: [],
  sales: [sale, sale, { ...sale, id: 'cancelled', status: 'CANCELLED' }, { ...sale, id: 'uf', amount: 2, currency: 'UF' }, { ...sale, id: 'unknown', quote_id: null, amount: 3 }],
 };
 const result = summarizeMeasurement(data, '2026-11-01T03:00:00Z', '2026-11-08T03:00:00Z');
 const web = result.find(r => r.source === 'web_registrada');
 assert.equal(web.received, 1); assert.equal(web.qualified, 1); assert.equal(web.proposals, 1); assert.equal(web.sales, 2);
 assert.deepEqual(web.salesValue, { CLP: 100, UF: 2 });
 assert.equal(result.find(r => r.source === 'sin_atribucion_web').sales, 1);
 assert.equal(JSON.stringify(result).includes('lead_id'), false);
});

test('las nuevas solicitudes de personas y operaciones conservan la clasificación comercial', () => {
 const result = summarizeMeasurement({ leads: [{ id:'people', created_at:'2026-11-02T12:00:00Z', notes:'contact_v1:'+JSON.stringify({service:'Gestión de personas o recursos humanos'}), lead_sources:{code:'CONTACTO_WEB'} }], qualifications:[], quotes:[], opportunities:[], sales:[] }, '2026-11-01T03:00:00Z','2026-11-08T03:00:00Z');
 assert.equal(result.find(r=>r.source==='web_registrada').serviceLine,'sistemas_automatizacion');
});
