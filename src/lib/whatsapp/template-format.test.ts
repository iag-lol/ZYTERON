import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildTemplateMessage,templateFields,type WhatsappTemplate} from './template-format';
const base:WhatsappTemplate={id:'qa',name:'seguimiento',status:'APPROVED',language:'es_CL',category:'UTILITY',components:[{type:'BODY',text:'Hola {{1}}, consulta {{2}}.'}]};
test('construye componentes y vista previa desde la plantilla aprobada',()=>{
 const built=buildTemplateMessage(base,{'body:1':'María','body:2':'Web'});
 assert.equal(built.preview,'Hola María, consulta Web.');assert.deepEqual(built.components,[{type:'body',parameters:[{type:'text',text:'María'},{type:'text',text:'Web'}]}]);
});
test('rechaza plantilla pendiente, variables incompletas y multimedia no configurada',()=>{
 assert.throws(()=>buildTemplateMessage({...base,status:'PENDING'},{'body:1':'Ana','body:2':'Web'}),/aprobada/);
 assert.throws(()=>buildTemplateMessage(base,{'body:1':'Ana'}),/Completa/);
 assert.throws(()=>templateFields({...base,components:[{type:'HEADER',format:'IMAGE'}]}),/archivo/);
});
test('admite variables con nombre y enlaces dinámicos sin aceptar componentes arbitrarios',()=>{
 const t={...base,parameter_format:'NAMED',components:[{type:'BODY',text:'Hola {{nombre}}'},{type:'BUTTONS',buttons:[{type:'URL',text:'Ver solicitud',url:'https://zyteron.cl/{{1}}'}]}]};
 const built=buildTemplateMessage(t,{'body:nombre':'Ana','button:0':'solicitud'});
 assert.equal((built.components[0]?.parameters as Array<{parameter_name:string}>)[0]?.parameter_name,'nombre');assert.equal(built.components[1]?.sub_type,'url');
});
