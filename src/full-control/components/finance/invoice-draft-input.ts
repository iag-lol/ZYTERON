import type { ClientBillingSnapshot, Invoice, InvoiceDteOptions } from "@zyteron/contracts";

export type DraftItem={itemName:string;description:string;unit:string;quantity:string;unitPrice:string;discountAmount:string;isExempt:boolean};
export type DraftClient={id:string;name:string;legalName:string;rut:string;dteEmail:string|null;businessActivity?:string|null;address?:string|null;commune?:string|null;city?:string|null;creditDays?:number|null;currency?:string;complete:boolean};
export type InvoiceDraft={clientId:string;documentTypeCode:number;issueDate:string;dueDate:string;paymentTermsDays:string;clientSnapshot:Partial<ClientBillingSnapshot>;dteOptions:InvoiceDteOptions;boletaPaymentMethod:string;lines:DraftItem[];notes:string};
export type DraftPreview={netAmount:number;exemptAmount:number;taxAmount:number;totalAmount:number;taxRate:number|null;currency:string;missing:string[]};
export const newDraftItem=():DraftItem=>({itemName:"",description:"",unit:"",quantity:"1",unitPrice:"",discountAmount:"",isExempt:false});
export function existingInvoiceDraft(invoice:Invoice):InvoiceDraft{
  const decimal=(value:number)=>String(value).replace(".",",");
  return{clientId:invoice.clientId,documentTypeCode:invoice.documentTypeCode,issueDate:invoice.issueDate??"",dueDate:invoice.dueDate??"",paymentTermsDays:String(invoice.paymentTermsDays??0),clientSnapshot:{...invoice.clientSnapshot},dteOptions:{paymentForm:2,saleType:1,purchaseType:1,...invoice.dteOptions},boletaPaymentMethod:String(invoice.boletaPaymentMethod??""),notes:invoice.notes??"",lines:(invoice.lines??[]).map(l=>({itemName:l.itemName||l.description.slice(0,80),description:l.itemName===l.description?"":l.description,unit:l.unit??"",quantity:decimal(l.quantity),unitPrice:decimal(l.unitPrice),discountAmount:l.discountAmount?decimal(l.discountAmount):"",isExempt:l.isExempt}))};
}

// La coma es el separador decimal; los puntos de agrupación se aceptan al pegar importes chilenos.
export function draftNumber(value:string){
  const raw=value.trim();if(!raw)return NaN;
  if(raw.includes(",")){if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,6}$/.test(raw))return NaN;return Number(raw.replaceAll(".","").replace(",","."));}
  if(/^\d{1,3}(?:\.\d{3})+$/.test(raw))return Number(raw.replaceAll(".",""));
  return /^\d+(?:\.\d{1,6})?$/.test(raw)?Number(raw):NaN;
}
export function draftPayload(draft:InvoiceDraft){return{...draft,dteOptions:[39,41].includes(draft.documentTypeCode)?{}:draft.dteOptions,paymentTermsDays:Number(draft.paymentTermsDays||0),dueDate:draft.dueDate||undefined,boletaPaymentMethod:Number(draft.boletaPaymentMethod)||undefined,lines:draft.lines.map(l=>({...l,description:l.description.trim()||l.itemName,quantity:draftNumber(l.quantity),unitPrice:draftNumber(l.unitPrice),discountAmount:l.discountAmount?draftNumber(l.discountAmount):0,isExempt:[34,41].includes(draft.documentTypeCode)||l.isExempt}))};}
export function draftItemsValid(draft:InvoiceDraft){return draft.lines.length>0&&draft.lines.every(l=>Boolean(l.itemName.trim())&&draftNumber(l.quantity)>0&&draftNumber(l.unitPrice)>=0&&(!l.discountAmount||draftNumber(l.discountAmount)>=0));}
