import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const migration=await readFile(new URL("../../supabase/migrations/20261122090000_invoice_draft_reopening.sql",import.meta.url),"utf8");
const invoice="11111111-1111-4111-8111-111111111111";
async function fixture(){
  const db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create table invoices(id uuid primary key,status text,document_type_code integer,tax_document_id uuid,approval_required boolean,approved_by text,approved_at timestamptz,client_snapshot jsonb,total_amount integer);
    create table tax_documents(id uuid primary key default gen_random_uuid(),invoice_id uuid references invoices(id),status text,folio integer);
    insert into invoices values('${invoice}','READY_TO_ISSUE',33,null,true,'approver','2026-01-01T10:00:00Z','{"rut":"22222222-2","businessActivity":null}',1190);
    grant select,update on invoices to service_role;grant select,insert on tax_documents to service_role;`);
  await db.exec(migration);return db;
}
const reopen=db=>db.query("select finance_reopen_invoice_draft($1)",[invoice]);
test("SQL devuelve a borrador, elimina aprobación y conserva receptor y montos; migración repetible",async()=>{
  const db=await fixture();try{
    await db.exec(migration);await db.exec("set role service_role");await reopen(db);
    const row=(await db.query("select * from invoices")).rows[0];
    assert.equal(row.status,"DRAFT");assert.equal(row.approved_by,null);assert.equal(row.approved_at,null);assert.equal(row.approval_required,false);assert.equal(row.total_amount,1190);assert.equal(row.client_snapshot.businessActivity,null);
    await assert.rejects(()=>reopen(db),/FINANCE_STATE/);
  }finally{await db.close();}
});
test("SQL rechaza estados cerrados o en emisión, tipos no editables y vínculos DTE",async()=>{
  const db=await fixture();try{
    for(const status of ["ISSUING","ISSUED","PARTIALLY_PAID","PAID","CREDITED","CANCELLED","VOID",null]){
      await db.query("update invoices set status=$1",[status]);await assert.rejects(()=>reopen(db),/FINANCE_STATE/);
    }
    await db.exec("update invoices set status='READY_TO_ISSUE',document_type_code=61");await assert.rejects(()=>reopen(db),/FINANCE_STATE/);
    await db.exec("update invoices set document_type_code=33,tax_document_id=gen_random_uuid()");await assert.rejects(()=>reopen(db),/intento DTE/);
    await db.exec("update invoices set tax_document_id=null;insert into tax_documents(invoice_id,status,folio)values('"+invoice+"','ACCEPTED',99)");
    await assert.rejects(()=>reopen(db),/intento DTE/);assert.equal((await db.query("select folio from tax_documents")).rows[0].folio,99);
  }finally{await db.close();}
});
test("si la preparación DTE gana no se reabre; si gana la reapertura no se crea ni envía un DTE tardío",async()=>{
  const db=await fixture();try{
    await db.query("insert into tax_documents(invoice_id,status)values($1,'DRAFT')",[invoice]);
    await assert.rejects(()=>reopen(db),/intento DTE/);
  }finally{await db.close();}
  const other=await fixture();try{
    await reopen(other);
    for(const status of ["DRAFT","SUBMITTED"]){await assert.rejects(()=>other.query("insert into tax_documents(invoice_id,status)values($1,$2)",[invoice,status]),/FINANCE_STATE/);}
    assert.equal((await other.query("select count(*)::int n from tax_documents")).rows[0].n,0);
    await other.query("insert into tax_documents(status)values('DRAFT')");
    assert.equal((await other.query("select count(*)::int n from tax_documents where invoice_id is null")).rows[0].n,1);
  }finally{await other.close();}
});
test("anon y authenticated no pueden reabrir facturas",async()=>{
  const db=await fixture();try{
    for(const role of ["anon","authenticated"]){await db.exec(`set role ${role}`);await assert.rejects(()=>reopen(db),/permission denied/);await db.exec("reset role");}
    assert.equal((await db.query("select status from invoices")).rows[0].status,"READY_TO_ISSUE");
  }finally{await db.close();}
});
