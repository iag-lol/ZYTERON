import { BadRequestException } from "@nestjs/common";
import type { ClientBillingSnapshot, InvoiceDteOptions } from "@zyteron/contracts";
import { isoDate, normalizeRut, optionalText, todayCl, type Row } from "./finance.util.js";

export function fiscalText(value:unknown,label:string,max:number){
  if(value!==undefined&&value!==null&&(typeof value!=="string"||value.trim().length>max))throw new BadRequestException(`${label}: máximo ${max} caracteres.`);
  return optionalText(value,max);
}

export function invoiceDate(value:unknown){
  const date=value?isoDate(value,"Fecha de emisión"):todayCl();
  if(date>todayCl())throw new BadRequestException("La fecha de emisión no puede ser futura.");
  return date;
}
export function invoiceTerms(value:unknown,fallback:number){
  if(value===undefined||value===null||value==="")return fallback;
  const days=Number(value);if(!Number.isInteger(days)||days<0||days>365)throw new BadRequestException("El plazo de pago debe ser un número entero entre 0 y 365 días.");
  return days;
}
export function receiverSnapshot(original:Partial<ClientBillingSnapshot>,value:unknown){
  if(value===undefined)return original;
  if(!value||typeof value!=="object"||Array.isArray(value))throw new BadRequestException("Datos tributarios del receptor inválidos.");
  const input=value as Row;
  if(input.rut!==undefined&&normalizeRut(input.rut)!==normalizeRut(original.rut))throw new BadRequestException("El RUT debe corresponder al cliente seleccionado.");
  const result={...original};
  for(const [key,max] of [["legalName",100],["businessActivity",40],["address",70],["commune",20],["city",20],["dteEmail",80]] as const){
    if(input[key]!==undefined){const text=fiscalText(input[key],key,max);if(key==="legalName")result.legalName=text??"";else result[key]=text;}
  }
  if(result.dteEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.dteEmail))throw new BadRequestException("Correo del receptor inválido.");
  return result;
}
export function invoiceOptions(value:unknown):InvoiceDteOptions{
  if(value===undefined||value===null)return {};
  if(typeof value!=="object"||Array.isArray(value))throw new BadRequestException("Datos del documento inválidos.");
  const raw=value as Row,result:InvoiceDteOptions={};
  for(const [key,max] of [["paymentForm",2],["saleType",3],["purchaseType",7]] as const){
    if(raw[key]!==undefined){const n=Number(raw[key]);if(!Number.isInteger(n)||n<1||n>max)throw new BadRequestException(`Valor inválido: ${key}.`);result[key]=n;}
  }
  if(raw.references!==undefined){
    if(!Array.isArray(raw.references)||raw.references.length>10)throw new BadRequestException("Máximo 10 referencias comerciales.");
    result.references=raw.references.map((ref:Row)=>{
      if(!ref||typeof ref!=="object"||![801,802,803,52].includes(Number(ref.documentTypeCode)))throw new BadRequestException("Tipo de referencia comercial inválido.");
      const folio=fiscalText(ref.folio,"Folio",18);if(!folio||!/^[A-Za-z0-9-]+$/.test(folio))throw new BadRequestException("Folio de referencia inválido (máximo 18 caracteres).");
      return{documentTypeCode:Number(ref.documentTypeCode),folio,date:isoDate(ref.date,"Fecha de referencia"),reason:fiscalText(ref.reason,"Referencia",90)??""};
    });
  }
  return result;
}
