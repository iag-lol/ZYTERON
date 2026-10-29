"use client";

import { useEffect, useState } from "react";
import type { Invoice } from "@zyteron/contracts";
import { FilePlus2 } from "lucide-react";
import { useAccess } from "@control/components/access-context";
import { errorText, financeApi } from "@control/lib/finance-api";
import { todayIso } from "@control/lib/finance-format";
import { Drawer, Feedback, useAction } from "./fx-ui";
import { draftItemsValid, draftPayload, InvoiceDraftForm, newDraftItem, type DraftClient, type DraftPreview, type InvoiceDraft } from "./invoice-draft-form";

const initialDraft=(type:number):InvoiceDraft=>({clientId:"",documentTypeCode:type,issueDate:todayIso(),dueDate:"",paymentTermsDays:"30",clientSnapshot:{},dteOptions:{paymentForm:2,saleType:1,purchaseType:1,references:[]},boletaPaymentMethod:"",lines:[newDraftItem()],notes:""});

export function InvoiceComposer({open,onClose,onCreated,initialType="33"}:{open:boolean;onClose:()=>void;onCreated:(id:string)=>void;initialType?:"33"|"34"}){
  const{role}=useAccess(),[draft,setDraft]=useState(()=>initialDraft(Number(initialType))),[search,setSearch]=useState(""),[clients,setClients]=useState<DraftClient[]>([]),[clientsError,setClientsError]=useState(""),[clientsLoading,setClientsLoading]=useState(false),[preview,setPreview]=useState<DraftPreview|null>(null),[previewError,setPreviewError]=useState(""),[calculating,setCalculating]=useState(false),[review,setReview]=useState(false),action=useAction();
  const payload=JSON.stringify({...draftPayload(draft),currency:"CLP"}),valid=draftItemsValid(draft)&&Boolean(draft.clientId&&draft.issueDate)&&(![39,41].includes(draft.documentTypeCode)||Boolean(draft.boletaPaymentMethod));
  useEffect(()=>{
    if(!open)return;let cancelled=false;setClientsLoading(true);
    const timer=setTimeout(()=>{void financeApi.get<DraftClient[]>(role,`/client-options${search?`?search=${encodeURIComponent(search)}`:""}`).then(value=>{if(!cancelled){setClients(value);setClientsError("");}}).catch(reason=>{if(!cancelled)setClientsError(errorText(reason));}).finally(()=>{if(!cancelled)setClientsLoading(false);});},250);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[role,search,open]);
  useEffect(()=>{
    setPreview(null);setPreviewError("");if(!open||!valid){setCalculating(false);return;}
    let cancelled=false;setCalculating(true);
    const timer=setTimeout(()=>{void financeApi.post<DraftPreview>(role,"/invoices/preview",JSON.parse(payload)).then(value=>{if(!cancelled)setPreview(value);}).catch(reason=>{if(!cancelled)setPreviewError(errorText(reason));}).finally(()=>{if(!cancelled)setCalculating(false);});},350);
    return()=>{cancelled=true;clearTimeout(timer);};
  },[role,payload,valid,open]);
  const save=async()=>{
    if(!review||!valid||!preview||calculating||previewError)return;
    const created=await action.run(()=>financeApi.post<Invoice>(role,"/invoices",JSON.parse(payload)));
    if(created){onCreated(created.id);setDraft(initialDraft(Number(initialType)));setReview(false);setSearch("");}
  };
  return <Drawer open={open} onClose={onClose} title={review?"Revisar factura":"Nueva factura"} subtitle="Completa el documento, revisa sus importes y guarda el borrador." wide className="invoice-composer-drawer">
    <form className="invoice-compose-form" onSubmit={event=>{event.preventDefault();if(valid&&preview&&!calculating&&!previewError){if(review)void save();else setReview(true);}}}>
      <InvoiceDraftForm draft={draft} onChange={value=>{setDraft(value);setReview(false);}} clients={clients} search={search} onSearch={setSearch} clientsLoading={clientsLoading} clientsError={clientsError} preview={preview} calculating={calculating} error={previewError} review={review}/>
      <Feedback error={action.error}/>
      <footer className="invoice-compose-actions"><span>{review?"Confirma los datos del borrador.":"Podrás revisar la factura antes de emitirla."}</span><div><button type="button" className="fx-btn ghost" onClick={review?()=>setReview(false):onClose}>{review?"Volver a editar":"Cancelar"}</button><button type="submit" className="fx-btn primary" disabled={action.busy||!valid||!preview||calculating||Boolean(previewError)}>{review?<FilePlus2 size={15}/>:null}{action.busy?"Guardando…":review?"Guardar borrador":"Validar y revisar"}</button></div></footer>
    </form>
  </Drawer>;
}
