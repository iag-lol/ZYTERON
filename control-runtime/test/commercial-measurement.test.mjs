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
 const ai = summarizeMeasurement({ leads: [{ id:'ai-site', created_at:'2026-11-02T12:00:00Z', notes:'contact_v1:'+JSON.stringify({service:'/servicios/asistentes-ia-para-webs'}), lead_sources:{code:'CONTACTO_WEB'} }], qualifications:[], quotes:[], opportunities:[], sales:[] }, '2026-11-01T03:00:00Z','2026-11-08T03:00:00Z');
 assert.equal(ai.find(r=>r.source==='web_registrada').serviceLine,'sistemas_automatizacion');
});

test('apoyo empresarial conserva solicitudes, calificaciones y ventas fuera de la línea web', () => {
  const stamp = '2026-11-05T12:00:00Z';
  const services = ['Creación de empresas', 'Regalos corporativos', 'Apoyo empresarial y administrativo', '/servicios/regalos-corporativos-chile'];
  const leads = services.map((service, index) => ({ id: `business-${index}`, created_at: stamp, notes: 'contact_v1:' + JSON.stringify({ service }), lead_sources: { code: 'CONTACTO_WEB' } }));
  const result = summarizeMeasurement({
    leads,
    qualifications: [...leads.map(lead => ({ aggregate_id: lead.id, occurred_at: stamp, payload: { service_line: 'apoyo_empresarial' } })), { aggregate_id: 'explicit-only', occurred_at: stamp, payload: { service_line: 'apoyo_empresarial' } }],
    quotes: [{ id: 'business-quote', lead_id: leads[0].id, sent_at: stamp }],
    opportunities: [],
    sales: [{ id: 'business-sale', quote_id: 'business-quote', status: 'WON', closed_at: stamp, amount: 100, currency: 'CLP' }],
  }, '2026-11-01T03:00:00Z', '2026-11-08T03:00:00Z');
  const business = result.find(row => row.source === 'web_registrada');
  assert.equal(business.serviceLine, 'apoyo_empresarial');
  assert.equal(business.received, 4);
  assert.equal(business.qualified, 4);
  assert.equal(business.proposals, 1);
  assert.equal(business.sales, 1);
  assert.deepEqual(business.salesValue, { CLP: 100 });
  const unattributed = result.find(row => row.source === 'sin_atribucion_web');
  assert.equal(unattributed.serviceLine, 'apoyo_empresarial');
  assert.equal(unattributed.qualified, 1);
  assert.equal(result.some(row => row.serviceLine === 'web_ecommerce'), false);
});

test('apps Android o iOS por etiqueta y slug recorren la medición como software', () => {
  const stamp = '2026-11-05T12:00:00Z';
  const leads = ['Aplicación móvil Android o iOS', '/servicios/desarrollo-apps-moviles'].map((service, index) => ({ id: `mobile-${index}`, created_at: stamp, notes: 'contact_v1:' + JSON.stringify({ service }), lead_sources: { code: 'CONTACTO_WEB' } }));
  const result = summarizeMeasurement({
    leads,
    qualifications: leads.map(lead => ({ aggregate_id: lead.id, occurred_at: stamp, payload: { service_line: 'sistemas_automatizacion' } })),
    quotes: [{ id: 'mobile-quote', lead_id: leads[0].id, sent_at: stamp }],
    opportunities: [],
    sales: [{ id: 'mobile-sale', quote_id: 'mobile-quote', status: 'WON', closed_at: stamp, amount: 100, currency: 'CLP' }],
  }, '2026-11-01T03:00:00Z', '2026-11-08T03:00:00Z');
  assert.equal(result.length, 1);
  assert.equal(result[0].serviceLine, 'sistemas_automatizacion');
  assert.equal(result[0].received, 2);
  assert.equal(result[0].qualified, 2);
  assert.equal(result[0].proposals, 1);
  assert.equal(result[0].sales, 1);
});
