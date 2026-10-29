import test from "node:test";
import assert from "node:assert/strict";
import { InvoiceService } from "../dist/finance/finance.billing.js";
import { invoiceOptions, receiverSnapshot } from "../dist/finance/finance.invoice-input.js";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const clientId="11111111-1111-4111-8111-111111111111",actor={role:"FINANZAS",userId:"synthetic"};
function fixture({allowed=true}={}){
  const rows={invoices:[],invoice_lines:[]},writes=[],dates=[];
  const repo={
    settings:async()=>({defaultPaymentTermsDays:30}),
    create:async(table,row)=>{writes.push(table);const created={...row,id:table==="invoices"?"22222222-2222-4222-8222-222222222222":crypto.randomUUID(),invoiceNumber:"TEST",balanceDue:row.totalAmount};rows[table].push(created);return created;},
    list:async(table)=>rows[table]??[],
    update:async(table,id,patch)=>{writes.push(table);const row=rows[table].find(r=>r.id===id);Object.assign(row,patch);return row;},
    removeWhere:async(table)=>{writes.push(table);rows[table]=[];},
    audit:async()=>{},notify:async()=>{},
  };
  const ctx={repo,require(){},requireAny(){},assertClientAccess:async(a,id)=>{assert.equal(id,clientId);if(!allowed)throw Error("CLIENT_DENIED");},sources:{client:async()=>({rut:"22222222-2",legalName:"Cliente sintético",currency:"CLP",creditDays:0,businessActivity:"Software",address:"Dirección 1",commune:"Santiago",region:"RM"})},taxRate:async(code,date)=>{dates.push(date);return{rate:date==="2026-01-01"?0.18:0.19,versionId:null};},must:async(table,id)=>rows[table].find(r=>r.id===id),withClientNames:async(r)=>r};
  return{service:new InvoiceService(ctx,{}),rows,writes,dates};
}
const body=()=>({clientId,documentTypeCode:33,issueDate:"2026-01-01",dueDate:"2026-01-31",dteOptions:{paymentForm:2,saleType:2,purchaseType:4,references:[{documentTypeCode:801,folio:"OC-2026-01",date:"2026-01-01",reason:"Orden de compra"}]},clientSnapshot:{rut:"22.222.222-2",legalName:"Cliente sintético SpA",businessActivity:"Servicios TI",address:"Dirección 200",commune:"Providencia",city:"Santiago"},lines:[{itemName:"Soporte",description:"Servicio mensual",unit:"mes",quantity:2,unitPrice:10000,discountAmount:1000,isExempt:false},{itemName:"Servicio exento",description:"Servicio exento",quantity:1,unitPrice:3000,isExempt:true}]});

test("la vista previa aplica IVA por fecha y descuentos sin guardar ni asignar folios",async()=>{
  const f=fixture(),preview=await f.service.preview(body(),actor);
  assert.equal(preview.netAmount,19000);assert.equal(preview.exemptAmount,3000);assert.equal(preview.taxAmount,3420);assert.equal(preview.totalAmount,25420);
  assert.deepEqual(f.dates,["2026-01-01"]);assert.deepEqual(f.writes,[]);assert.deepEqual(preview.missing,[]);
  assert.equal(preview.clientSnapshot.commune,"Providencia");assert.equal(preview.dteOptions.references[0].folio,"OC-2026-01");
});
test("la vista previa respeta el alcance del cliente",async()=>{
  const f=fixture({allowed:false});await assert.rejects(()=>f.service.preview(body(),actor),/CLIENT_DENIED/);assert.deepEqual(f.writes,[]);assert.deepEqual(f.dates,[]);
});
test("el borrador conserva fecha, datos tributarios y metadatos hasta preparar la emisión",async()=>{
  const f=fixture(),draft=await f.service.createDraft(body(),actor);
  assert.equal(draft.paymentTermsDays,0);assert.equal(draft.issueDate,"2026-01-01");assert.equal(draft.clientSnapshot.city,"Santiago");assert.equal(draft.lines[0].itemName,"Soporte");assert.equal(draft.lines[0].unit,"mes");
  f.rows.invoices[0].status="READY_TO_ISSUE";
  const ready=await f.service.prepareForIssue(draft.id,"2026-10-29");assert.equal(ready.issueDate,"2026-01-01");assert.equal(ready.clientSnapshot.address,"Dirección 200");assert.equal(ready.clientSnapshot.commune,"Providencia");assert.equal(ready.totalAmount,25420);assert.equal(ready.dteOptions.saleType,2);
});
test("fecha y referencias inválidas, descuentos excesivos y RUT de otro cliente se rechazan sin escribir",async()=>{
  for(const patch of [{issueDate:"2099-01-01"},{paymentTermsDays:1.5},{paymentTermsDays:"abc"},{lines:[{description:"Servicio",quantity:1,unitPrice:100,discountAmount:0.49}]},{dueDate:"2025-12-31"},{clientSnapshot:{rut:"11111111-1"}},{dteOptions:{paymentForm:9}},{dteOptions:{references:[{documentTypeCode:33,folio:"1",date:"2026-01-01"}]}},{lines:[{description:"Servicio",quantity:1,unitPrice:100,discountAmount:101}]}]){
    const f=fixture();await assert.rejects(()=>f.service.createDraft({...body(),...patch},actor));assert.deepEqual(f.writes,[]);
  }
});
test("cambiar datos tributarios o fecha invalida la aprobación pendiente y recalcula IVA",async()=>{
  const f=fixture(),draft=await f.service.createDraft(body(),actor);f.rows.invoices[0].status="PENDING_APPROVAL";
  const updated=await f.service.updateDraft(draft.id,{issueDate:"2026-01-02",dteOptions:{paymentForm:1,saleType:1,purchaseType:1}},actor);
  assert.equal(updated.dueDate,"2026-01-02");assert.equal(updated.paymentTermsDays,0);assert.equal(updated.status,"DRAFT");assert.equal(updated.taxAmount,3610);assert.equal(updated.totalAmount,25610);
  f.rows.invoices[0].status="ISSUED";await assert.rejects(()=>f.service.updateDraft(draft.id,{dteOptions:{saleType:3}},actor),/Sólo se editan borradores/);
});
test("una edición inválida no borra las líneas del borrador",async()=>{
  const f=fixture(),draft=await f.service.createDraft(body(),actor);f.writes.length=0;
  await assert.rejects(()=>f.service.updateDraft(draft.id,{lines:body().lines,dueDate:"2025-01-01"},actor));assert.deepEqual(f.writes,[]);assert.equal(f.rows.invoice_lines.length,2);
});
test("se validan longitudes tributarias y formas de pago admitidas",()=>{
  assert.throws(()=>receiverSnapshot({rut:"22222222-2"},{commune:"a".repeat(21)}));assert.throws(()=>receiverSnapshot({rut:"22222222-2"},{dteEmail:"correo inválido"}));assert.throws(()=>invoiceOptions({paymentForm:3}));
});
test("SQL impide cambiar metadatos tributarios de documentos emitidos",async()=>{
  const db=new PGlite();try{
    await db.exec("create role anon;create role authenticated;create role service_role;create table invoices(id uuid primary key,status text);create table invoice_lines(id uuid);create table tax_documents(invoice_id uuid,status text,folio integer);");
    await db.exec(await readFile(new URL('../../supabase/migrations/20261029103000_invoice_composer_fields.sql',import.meta.url),'utf8'));
    await db.exec(`insert into invoices(id,status)values('${clientId}','DRAFT');update invoices set dte_options='{"paymentForm":2}';update invoices set status='ISSUED';`);
    await assert.rejects(()=>db.exec('update invoices set dte_options=\'{"paymentForm":1}\''),/DTE_OPTIONS_IMMUTABLE/);
    assert.equal((await db.query('select dte_options from invoices')).rows[0].dte_options.paymentForm,2);
  }finally{await db.close();}
});
