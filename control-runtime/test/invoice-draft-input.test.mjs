import test from "node:test";
import assert from "node:assert/strict";
import { draftNumber,draftPayload,draftItemsValid,newDraftItem,existingInvoiceDraft } from "../../src/full-control/components/finance/invoice-draft-input.ts";

test("importes chilenos, decimales y cantidades se interpretan sin perder la coma",()=>{
  for(const [input,expected] of [["100.000",100000],["100.000,50",100000.5],["1,5",1.5],["1000.50",1000.5],["0",0]])assert.equal(draftNumber(input),expected);
  for(const input of ["","-1","1,2,3","12.34,5","100 pesos"])assert.ok(Number.isNaN(draftNumber(input)));
});
test("editar conserva fecha, receptor, referencias y cantidades decimales sin multiplicarlas",()=>{
  const invoice={clientId:"same",documentTypeCode:33,issueDate:"2026-10-29",dueDate:"2026-11-28",paymentTermsDays:30,clientSnapshot:{rut:"22222222-2",legalName:"Cliente de prueba",commune:"Santiago"},dteOptions:{paymentForm:2,saleType:2,purchaseType:4,references:[{documentTypeCode:801,folio:"OC-1",date:"2026-10-29",reason:""}]},lines:[{itemName:"Servicio",description:"Detalle",unit:"mes",quantity:1.234,unitPrice:1000,discountAmount:10,isExempt:false}]};
  const payload=draftPayload(existingInvoiceDraft(invoice));assert.equal(payload.lines[0].quantity,1.234);assert.equal(payload.lines[0].unitPrice,1000);assert.equal(payload.lines[0].discountAmount,10);assert.equal(payload.clientId,"same");assert.deepEqual(payload.clientSnapshot,invoice.clientSnapshot);assert.deepEqual(payload.dteOptions,invoice.dteOptions);assert.equal(payload.issueDate,invoice.issueDate);
});
test("detalle, descuentos y exención llegan al servidor como números",()=>{
  const draft={clientId:"test",documentTypeCode:34,lines:[{...newDraftItem(),itemName:"Servicio",quantity:"1,5",unitPrice:"100.000",discountAmount:"10.000"}]};
  assert.equal(draftItemsValid(draft),true);const payload=draftPayload(draft);
  assert.equal(payload.lines[0].quantity,1.5);assert.equal(payload.lines[0].unitPrice,100000);assert.equal(payload.lines[0].discountAmount,10000);assert.equal(payload.lines[0].isExempt,true);assert.equal(payload.lines[0].description,"Servicio");
  assert.equal(draftItemsValid({...draft,lines:[newDraftItem()]}),false);
});
