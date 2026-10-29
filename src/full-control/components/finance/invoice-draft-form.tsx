"use client";

import type { ClientBillingSnapshot } from "@zyteron/contracts";
import { Plus, Trash2 } from "lucide-react";
import { day, money } from "@control/lib/finance-format";
import { DateInput, Field } from "./fx-ui";

import { newDraftItem, draftNumber, type DraftItem, type DraftClient, type InvoiceDraft, type DraftPreview } from "./invoice-draft-input";
export { newDraftItem, draftPayload, draftItemsValid } from "./invoice-draft-input";
export type { DraftClient, DraftPreview, InvoiceDraft } from "./invoice-draft-input";

export function InvoiceDraftForm({draft,onChange,clients,search,onSearch,clientsLoading,clientsError,preview,calculating,error,review=false}:{draft:InvoiceDraft;onChange:(value:InvoiceDraft)=>void;clients:DraftClient[];search:string;onSearch:(value:string)=>void;clientsLoading:boolean;clientsError:string;preview:DraftPreview|null;calculating:boolean;error:string;review?:boolean}){
  const set=(patch:Partial<InvoiceDraft>)=>onChange({...draft,...patch});
  const receiver=draft.clientSnapshot,boleta=[39,41].includes(draft.documentTypeCode),exempt=[34,41].includes(draft.documentTypeCode);
  const setReceiver=(key:keyof ClientBillingSnapshot,value:string)=>set({clientSnapshot:{...receiver,[key]:value}});
  const setItem=(index:number,patch:Partial<DraftItem>)=>set({lines:draft.lines.map((l,i)=>i===index?{...l,...patch}:l)});
  return <div className={`invoice-compose${review?" is-review":""}`}>
    <div className="invoice-compose-main">
      {review?<div className="invoice-review-banner"><strong>Revisa los datos antes de guardar</strong><p>La emisión y el envío al SII se realizan después, desde el detalle del borrador.</p></div>:null}
      <fieldset disabled={review} className="invoice-section"><legend><b>01</b> Documento y pago</legend>
        <div className="invoice-grid three">
          <Field label="Tipo de documento"><select value={draft.documentTypeCode} onChange={e=>set({documentTypeCode:Number(e.target.value)})}><option value="33">Factura electrónica · 33</option><option value="34">Factura exenta · 34</option><option value="39">Boleta electrónica · 39</option><option value="41">Boleta exenta · 41</option></select></Field>
          <Field label="Fecha de emisión"><DateInput required value={draft.issueDate} onChange={v=>set({issueDate:v,...(draft.dteOptions.paymentForm===1?{dueDate:v}:{})})}/></Field>
          <Field label="Moneda"><input readOnly value="Pesos chilenos · CLP"/></Field>
          {!boleta?<><Field label="Forma de pago"><select value={draft.dteOptions.paymentForm??2} onChange={e=>set({dteOptions:{...draft.dteOptions,paymentForm:Number(e.target.value)},...(e.target.value==="1"?{paymentTermsDays:"0",dueDate:draft.issueDate}:{})})}><option value="1">Contado</option><option value="2">Crédito</option></select></Field>
          <Field label="Tipo de venta"><select value={draft.dteOptions.saleType??1} onChange={e=>set({dteOptions:{...draft.dteOptions,saleType:Number(e.target.value)}})}><option value="1">Del giro</option><option value="2">Activo fijo y otras ventas</option><option value="3">Bienes raíces</option></select></Field>
          <Field label="Tipo de compra del receptor" hint="Sugerencia para el registro del comprador."><select value={draft.dteOptions.purchaseType??1} onChange={e=>set({dteOptions:{...draft.dteOptions,purchaseType:Number(e.target.value)}})}>{["Del giro","Supermercados y similares","Bienes raíces","Activo fijo","IVA de uso común","Sin derecho a crédito fiscal","No incluir"].map((v,i)=><option key={v} value={i+1}>{v}</option>)}</select></Field></>:<Field label="Medio de pago declarado"><select value={draft.boletaPaymentMethod} onChange={e=>set({boletaPaymentMethod:e.target.value})}><option value="">Seleccionar</option>{["Efectivo","Pago electrónico","Transferencia","Cheque","Otro"].map((v,i)=><option key={v} value={i+1}>{v}</option>)}</select></Field>}
          <Field label="Plazo de pago (días)"><input type="number" min="0" max="365" value={draft.paymentTermsDays} disabled={!boleta&&draft.dteOptions.paymentForm===1} onChange={e=>set({paymentTermsDays:e.target.value})}/></Field>
          <Field label="Fecha de vencimiento" hint="Sin fecha: emisión más plazo de pago."><DateInput disabled={!boleta&&draft.dteOptions.paymentForm===1} value={draft.dueDate} onChange={v=>set({dueDate:v})}/></Field>
        </div>
      </fieldset>

      <fieldset disabled={review} className="invoice-section"><legend><b>02</b> Receptor</legend>
        <div className="invoice-client-search"><Field label="Buscar cliente"><input placeholder="Razón social o RUT" value={search} onChange={e=>onSearch(e.target.value)}/></Field><Field label="Cliente seleccionado"><select value={draft.clientId} onChange={e=>{const c=clients.find(c=>c.id===e.target.value);if(!c)return;set({clientId:c.id,clientSnapshot:{rut:c.rut,legalName:c.legalName,businessActivity:c.businessActivity??"",address:c.address??"",commune:c.commune??"",city:c.city??"",dteEmail:c.dteEmail??""},paymentTermsDays:draft.dteOptions.paymentForm===1?"0":String(c.creditDays??30)});}}><option value="">{clientsLoading?"Buscando clientes…":"Selecciona un cliente"}</option>{draft.clientId&&!clients.some(c=>c.id===draft.clientId)?<option value={draft.clientId}>{receiver.legalName}</option>:null}{clients.map(c=><option key={c.id} value={c.id}>{c.name} · {c.rut}</option>)}</select></Field></div>
        {clientsError?<p role="alert" className="invoice-error">{clientsError}</p>:null}
        {draft.clientId?<><div className="invoice-receiver-name"><strong>{receiver.legalName||"Completa la razón social"}</strong><span>RUT {receiver.rut}</span></div><div className="invoice-grid two">
          <Field label="Razón social"><textarea rows={2} maxLength={100} value={receiver.legalName??""} onChange={e=>setReceiver("legalName",e.target.value.replace(/\n/g," "))}/></Field>
          <Field label="Giro"><input maxLength={40} value={receiver.businessActivity??""} placeholder="Actividad comercial del receptor" onChange={e=>setReceiver("businessActivity",e.target.value)}/></Field>
          <Field label="Dirección tributaria"><input maxLength={70} value={receiver.address??""} onChange={e=>setReceiver("address",e.target.value)}/></Field>
          <Field label="Comuna"><input maxLength={20} value={receiver.commune??""} onChange={e=>setReceiver("commune",e.target.value)}/></Field>
          <Field label="Ciudad"><input maxLength={20} value={receiver.city??""} onChange={e=>setReceiver("city",e.target.value)}/></Field>
          <Field label="Correo del receptor"><input type="email" maxLength={80} value={receiver.dteEmail??""} onChange={e=>setReceiver("dteEmail",e.target.value)}/></Field>
        </div><p className="invoice-help">Estos datos se guardan con esta factura. Revisa que correspondan a la información tributaria del cliente.</p></>:<p className="invoice-help">Selecciona al receptor para revisar y completar sus datos tributarios.</p>}
      </fieldset>

      <fieldset disabled={review} className="invoice-section"><legend><b>03</b> Productos o servicios</legend>
        <p className="invoice-help">Precios netos en pesos chilenos, sin IVA. Los descuentos se aplican a cada línea.</p>
        <div className="invoice-items">{draft.lines.map((l,i)=><div className="invoice-item" key={i}><div className="invoice-item-heading"><strong>Ítem {i+1}</strong>{draft.lines.length>1?<button type="button" className="fx-icon" aria-label={`Quitar ítem ${i+1}`} onClick={()=>set({lines:draft.lines.filter((_,n)=>n!==i)})}><Trash2 size={15}/></button>:null}</div>
          <Field label="Producto o servicio"><input maxLength={80} placeholder="Nombre del producto o servicio" value={l.itemName} onChange={e=>setItem(i,{itemName:e.target.value})}/></Field>
          <Field label="Descripción adicional (opcional)"><textarea rows={2} maxLength={1000} placeholder="Alcance, período del servicio u otro detalle" value={l.description} onChange={e=>setItem(i,{description:e.target.value})}/></Field>
          <div className="invoice-item-numbers"><Field label="Cantidad"><input inputMode="decimal" value={l.quantity} onChange={e=>setItem(i,{quantity:e.target.value})}/></Field><Field label="Unidad"><input maxLength={4} placeholder="un / mes" value={l.unit} onChange={e=>setItem(i,{unit:e.target.value})}/></Field><Field label="Precio neto unitario"><input inputMode="decimal" placeholder="0" value={l.unitPrice} onChange={e=>setItem(i,{unitPrice:e.target.value})}/></Field><Field label="Descuento ($)"><input inputMode="decimal" placeholder="0" value={l.discountAmount} onChange={e=>setItem(i,{discountAmount:e.target.value})}/></Field></div>
          <div className="invoice-item-bottom"><label><input type="checkbox" checked={exempt||l.isExempt} disabled={exempt} onChange={e=>setItem(i,{isExempt:e.target.checked})}/> Exento de IVA</label><span>Monto neto <strong>{Number.isFinite(draftNumber(l.quantity)*draftNumber(l.unitPrice))?money(Math.round(draftNumber(l.quantity)*draftNumber(l.unitPrice)-(l.discountAmount?draftNumber(l.discountAmount):0))):"—"}</strong></span></div>
        </div>)}</div>
        {!review?<button type="button" className="fx-btn ghost" disabled={draft.lines.length>=60} onClick={()=>set({lines:[...draft.lines,newDraftItem()]})}><Plus size={15}/>Agregar producto o servicio</button>:null}
      </fieldset>

      {!boleta?<fieldset disabled={review} className="invoice-section"><legend><b>04</b> Referencias <small>Opcional</small></legend>
        {(draft.dteOptions.references??[]).map((ref,i)=><div className="invoice-reference" key={i}><div className="invoice-grid two"><Field label="Documento"><select value={ref.documentTypeCode} onChange={e=>set({dteOptions:{...draft.dteOptions,references:draft.dteOptions.references!.map((r,n)=>n===i?{...r,documentTypeCode:Number(e.target.value)}:r)}})}><option value="801">Orden de compra</option><option value="802">Nota de pedido</option><option value="803">Contrato</option><option value="52">Guía de despacho electrónica</option></select></Field><Field label="Número o folio"><input maxLength={18} value={ref.folio} onChange={e=>set({dteOptions:{...draft.dteOptions,references:draft.dteOptions.references!.map((r,n)=>n===i?{...r,folio:e.target.value}:r)}})}/></Field><Field label="Fecha"><DateInput required value={ref.date} onChange={value=>set({dteOptions:{...draft.dteOptions,references:draft.dteOptions.references!.map((r,n)=>n===i?{...r,date:value}:r)}})}/></Field><Field label="Detalle de la referencia"><input maxLength={90} value={ref.reason} onChange={e=>set({dteOptions:{...draft.dteOptions,references:draft.dteOptions.references!.map((r,n)=>n===i?{...r,reason:e.target.value}:r)}})}/></Field></div><button className="fx-btn ghost" type="button" onClick={()=>set({dteOptions:{...draft.dteOptions,references:draft.dteOptions.references!.filter((_,n)=>n!==i)}})}>Quitar referencia</button></div>)}
        {!review?<button type="button" className="fx-btn ghost" disabled={(draft.dteOptions.references?.length??0)>=10} onClick={()=>set({dteOptions:{...draft.dteOptions,references:[...(draft.dteOptions.references??[]),{documentTypeCode:801,folio:"",date:draft.issueDate,reason:""}]}})}><Plus size={15}/>Agregar referencia</button>:null}
      </fieldset>:null}
      <fieldset disabled={review} className="invoice-section"><legend>Notas internas</legend><Field label="Observaciones para administración"><textarea maxLength={1000} rows={2} value={draft.notes} onChange={e=>set({notes:e.target.value})}/></Field><p className="invoice-help">No se incluyen en el documento tributario.</p></fieldset>
    </div>

    <aside className="invoice-summary" aria-label="Resumen de la factura" aria-live="polite"><span className="invoice-summary-tag">BORRADOR</span><h4>Resumen de la factura</h4><p>{draft.clientSnapshot.legalName||"Selecciona un receptor"}</p><dl><div><dt>Emisión</dt><dd>{day(draft.issueDate)}</dd></div><div><dt>Moneda</dt><dd>CLP</dd></div><div><dt>Neto afecto</dt><dd>{preview&&!calculating?money(preview.netAmount):"—"}</dd></div><div><dt>Monto exento</dt><dd>{preview&&!calculating?money(preview.exemptAmount):"—"}</dd></div><div><dt>IVA {preview?.taxRate?`${Number((preview.taxRate*100).toFixed(2))}%`:""}</dt><dd>{preview&&!calculating?money(preview.taxAmount):"—"}</dd></div><div className="invoice-total"><dt>Total factura</dt><dd>{preview&&!calculating?money(preview.totalAmount):"—"}</dd></div></dl><p className="invoice-help">{calculating?"Calculando importes…":"El IVA se calcula según la fecha de emisión."}</p>{error?<p role="alert" className="invoice-error">{error}</p>:null}{preview?.missing.length?<div className="invoice-warning"><strong>Datos por completar</strong><p>{preview.missing.join(" · ")}</p></div>:null}<div className="invoice-summary-note">Guardar crea un borrador. Todavía no asigna folio ni envía la factura al SII.</div></aside>
  </div>;
}
