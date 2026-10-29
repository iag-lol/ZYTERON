import test from "node:test";
import assert from "node:assert/strict";
import { draftNumber,draftPayload,draftItemsValid,newDraftItem } from "../../src/full-control/components/finance/invoice-draft-input.ts";

test("importes chilenos, decimales y cantidades se interpretan sin perder la coma",()=>{
  for(const [input,expected] of [["100.000",100000],["100.000,50",100000.5],["1,5",1.5],["1000.50",1000.5],["0",0]])assert.equal(draftNumber(input),expected);
  for(const input of ["","-1","1,2,3","12.34,5","100 pesos"])assert.ok(Number.isNaN(draftNumber(input)));
});
test("detalle, descuentos y exención llegan al servidor como números",()=>{
  const draft={clientId:"test",documentTypeCode:34,lines:[{...newDraftItem(),itemName:"Servicio",quantity:"1,5",unitPrice:"100.000",discountAmount:"10.000"}]};
  assert.equal(draftItemsValid(draft),true);const payload=draftPayload(draft);
  assert.equal(payload.lines[0].quantity,1.5);assert.equal(payload.lines[0].unitPrice,100000);assert.equal(payload.lines[0].discountAmount,10000);assert.equal(payload.lines[0].isExempt,true);assert.equal(payload.lines[0].description,"Servicio");
  assert.equal(draftItemsValid({...draft,lines:[newDraftItem()]}),false);
});
