import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { ClientContract } from "@zyteron/contracts";
import { renderContractPdf, type ContractPdfOptions } from "./contract-pdf-layout.js";
import { chileanContractTemplates } from "./contract-template-catalog.js";

const flat=(source:Record<string,unknown>,prefix=""):Record<string,string>=>Object.entries(source).reduce<Record<string,string>>((acc,[key,value])=>{const path=prefix?`${prefix}.${key}`:key;if(value&&typeof value==="object"&&!Array.isArray(value))Object.assign(acc,flat(value as Record<string,unknown>,path));else acc[path]=Array.isArray(value)?value.map(item=>typeof item==="object"?JSON.stringify(item):String(item)).join("\n"):String(value??"");return acc;},{});


export function renderContractText(contract:ClientContract){
  const selected=new Set(contract.templateCodes??["ZT-PROYECTO-CL","ZT-CONDICIONES-CL"]),values=flat(contract.builderValues??{});
  values["contrato.numero"]||=contract.contractNumber;
  const sections=chileanContractTemplates.filter(template=>selected.has(template.code)).map(template=>{
    let body=template.body;
    if(template.code==="ZT-CONDICIONES-CL")body=selectIpMode(body,values["pi.modalidad"]);
    for(const[key,value]of Object.entries(values))body=body.replaceAll(`{{${key}}}`,value);
    return{code:template.code,name:template.name,text:body};
  });
  return sections;
}

function selectIpMode(body:string,mode?:string){
  const normalized=(mode??"").toUpperCase();
  if(!["A","B","C"].includes(normalized))return body;
  const labels=["A","B","C"];
  for(const label of labels)if(label!==normalized){const start=body.indexOf(`MODALIDAD ${label} —`);if(start>=0){const candidates=[...labels.filter(value=>value!==label).map(value=>body.indexOf(`MODALIDAD ${value} —`,start+1)),body.indexOf("REGLA APLICABLE A TODAS LAS MODALIDADES.",start+1)].filter(value=>value>start);const end=Math.min(...candidates);body=body.slice(0,start)+body.slice(end);}}
  return body.replace("INSTRUCCIÓN DEL GENERADOR:\nSeleccionar UNA modalidad y retirar las demás del PDF.\n\n","");
}

@Injectable()
export class ContractDocumentService{
  preview(contract:ClientContract){
    const sections=renderContractText(contract),unresolved=[...new Set(sections.flatMap(section=>[...section.text.matchAll(/\{\{([^}]+)\}\}/g)].map(match=>match[1])))];
    const html=sections.map(section=>`<section data-template="${section.code}"><h1>${escape(section.name)}</h1>${section.text.split(/\n{2,}/).map(paragraph=>`<p>${escape(paragraph).replaceAll("\n","<br>")}</p>`).join("")}</section>`).join("");
    return{html,sections,unresolved,watermark:"BORRADOR — REVISIÓN LEGAL REQUERIDA"};
  }

  async render(contract:ClientContract,options:ContractPdfOptions={}){
    const {sections,unresolved}=this.preview(contract);
    const bytes=await renderContractPdf(contract,sections,options);
    const hash=createHash("sha256").update(bytes).digest("hex");
    return{bytes,hash,filename:`${contract.contractNumber}-v${contract.version}.pdf`,unresolved};
  }
}

function escape(value:string){return value.replace(/[<>&"']/g,char=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&#39;"}[char]!));}
