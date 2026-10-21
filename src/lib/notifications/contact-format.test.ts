import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contactHtml,contactTemplateSummary,parseNotificationRecipients} from './contact-format';
test('escapa contenido del contacto y conserva el enlace dentro del resumen de WhatsApp',()=>{
 const payload={kind:'lead',title:'Contacto',body:'<script>alert(1)</script>'+('x'.repeat(3000)),href:'/administracion/commercial/leads',name:'<img src=x>'};
 const html=contactHtml(payload);assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;img'));
 const summary=contactTemplateSummary(payload);assert.ok(summary.length<=1000);assert.ok(summary.endsWith('https://www.zyteron.cl/administracion/commercial/leads'));
});
test('normaliza y elimina duplicados sin aceptar destinatarios inválidos',()=>{
 assert.deepEqual(parseNotificationRecipients('Contacto@zyteron.cl; contacto@zyteron.cl\nincorrecto','EMAIL'),['contacto@zyteron.cl']);
 assert.deepEqual(parseNotificationRecipients('whatsapp:+56912345678, +56 9 1234 5678, no','WHATSAPP'),['56912345678']);
});
