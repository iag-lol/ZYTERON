import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { QuotePaymentService } from '../dist/finance/finance.quote-payments.js';
import { FinanceContext } from '../dist/finance/finance.core.js';
import { FinanceRepository } from '../dist/finance/finance.repository.js';
import { FinanceSources } from '../dist/finance/finance.sources.js';

const ids=Array.from({length:7},(_,i)=>`10000000-0000-4000-8000-00000000000${i+1}`);
const [lead,client,quote,plan,installment,paid,actorId]=ids;
const migration=await readFile(new URL('../../supabase/migrations/20261024090000_client_finance_and_lead_enrollment.sql',import.meta.url),'utf8');
const fixture=await readFile(new URL('./fixtures/client-finance-lifecycle.sql',import.meta.url),'utf8');
const passwordHash='$2b$12$'+'a'.repeat(53);

test('Supabase: conversión atómica, reintento sin cambiar contraseña, RUT y correo únicos, verificación pendiente y RLS',async()=>{
  const db=new PGlite();
  try{
    await db.exec(fixture);await db.exec(migration);
    await db.query('insert into leads(id,company_name,contact_name,email) values($1,$2,$3,$4)',[lead,'Empresa sintética','Contacto QA','qa@example.invalid']);
    const enroll=async(id,rut='11111111-1',email='qa@example.invalid',hash=passwordHash)=>db.query('select zyteron_enroll_lead($1,$2,$3,$4,$5,null) as result',[id,rut,'Empresa sintética',email,hash]);
    const first=(await enroll(lead)).rows[0].result;assert.equal(first.created,true);
    const before=(await db.query('select * from "User"')).rows;assert.equal(before.length,1);assert.equal(before[0].role,'CLIENT');assert.equal(before[0].accountStatus,'PENDING');assert.equal(before[0].emailVerifiedAt,null);assert.equal(before[0].passwordHash,passwordHash);
    const retry=(await enroll(lead,undefined,undefined,'$2b$12$'+'b'.repeat(53))).rows[0].result;assert.equal(retry.created,false);assert.equal(retry.clientId,first.clientId);assert.deepEqual((await db.query('select * from "User"')).rows,before);
    assert.equal((await db.query('select enabled from client_portal_settings')).rows[0].enabled,true);
    assert.equal((await db.query('select status from leads')).rows[0].status,'CONVERTED');
    await db.query('insert into leads(id,company_name,contact_name,email) values($1,$2,$3,$4)',[client,'Otra empresa','Otro QA','other@example.invalid']);
    for(const args of [[client,'11111111-2','bad@example.invalid'],[client,'22222222-2','qa@example.invalid'],[client,'11111111-1','other@example.invalid']])await assert.rejects(enroll(...args));
    assert.equal((await db.query('select count(*)::int as n from clients')).rows[0].n,1);
    assert.equal((await db.query('select status from leads where id=$1',[client])).rows[0].status,'NEW');
    for(const role of ['anon','authenticated','zyteron_portal_client']){
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query('select * from zyteron_portal_login_ruts'),e=>e.code==='42501');
      await assert.rejects(enroll(lead),e=>e.code==='42501');await db.exec('reset role');
    }
  }finally{await db.close();}
});

test('Supabase: reprogramación conserva pagadas, rechaza estados cerrados y fechas obsoletas, y mantiene excepciones al editar el plan',async()=>{
  const db=new PGlite();
  try{
    await db.exec(fixture);await db.exec(migration);
    await db.query('insert into quote_payment_plans(id,frequency,start_date,payment_day,amount,currency,status,total_installments) values($1,$2,$3,15,1500,$4,$5,3)',[plan,'MONTHLY','2026-10-01','CLP','ACTIVE']);
    await db.query('insert into quote_payment_installments(id,plan_id,sequence,due_date,period_key,amount,currency,status) values($1,$2,1,$3,$4,1000,$5,$6),($7,$2,2,$8,$9,1000,$5,$10)',[paid,plan,'2026-10-15','2026-10','CLP','PAID',installment,'2026-11-15','2026-11','SCHEDULED']);
    const paidBefore=(await db.query('select * from quote_payment_installments where id=$1',[paid])).rows;
    await db.query('select quote_payment_move_due($1,$2,$3,$4,$5)',[installment,'2026-11-15','2026-11-25','Acuerdo de fecha con cliente',actorId]);
    await assert.rejects(db.query('select quote_payment_move_due($1,$2,$3,$4,$5)',[installment,'2026-11-15','2026-11-26','Cambio obsoleto',actorId]),/STALE/);
    await assert.rejects(db.query('select quote_payment_move_due($1,$2,$3,$4,$5)',[paid,'2026-10-15','2026-10-20','No se permite',actorId]),/CLOSED/);
    await db.query('select quote_payment_reschedule($1)',[plan]);
    const pending=(await db.query('select due_date::text,amount::int from quote_payment_installments where id=$1',[installment])).rows[0];assert.equal(pending.due_date,'2026-11-25');assert.equal(pending.amount,1500);
    assert.deepEqual((await db.query('select * from quote_payment_installments where id=$1',[paid])).rows,paidBefore);
    await db.query("update quote_payment_plans set status='CANCELLED',cancel_reason='Fin del servicio' where id=$1",[plan]);await db.query('select quote_payment_reschedule($1)',[plan]);
    assert.equal((await db.query('select status from quote_payment_installments where id=$1',[installment])).rows[0].status,'CANCELLED');
    assert.equal((await db.query('select count(*)::int as n from zyteron_quote_date_changes')).rows[0].n,1);
    assert.deepEqual((await db.query('select * from quote_payment_installments where id=$1',[paid])).rows,paidBefore);
  }finally{await db.close();}
});

test('API: rol y propiedad se validan antes de reprogramar; no se alteran cuotas pagadas',async()=>{
  const repo=new FinanceRepository(),sources=new FinanceSources(),ctx=new FinanceContext(repo,sources),service=new QuotePaymentService(ctx);
  sources.fixtures.quotes.set(quote,{id:quote,quoteNumber:'QA',companyName:'QA',clientId:client,ownerId:actorId,status:'ACCEPTED',currency:'CLP',totalAmount:1000,acceptedAt:null});
  await repo.create('quote_payment_plans',{id:plan,quoteId:quote,clientId:client,status:'ACTIVE',frequency:'MONTHLY',startDate:'2026-10-01',paymentDay:15,activationDaysBefore:5,totalInstallments:3,amount:1000,currency:'CLP'});
  await repo.create('quote_payment_installments',{id:installment,planId:plan,quoteId:quote,clientId:client,status:'SCHEDULED',sequence:1,dueDate:'2026-11-15',periodKey:'2026-11',amount:1000,currency:'CLP'});
  const body={dueDate:'2026-11-25',expectedDueDate:'2026-11-15',reason:'Acuerdo de pago'};
  for(const actor of [{role:'PROGRAMADOR',userId:actorId},{role:'EJECUTIVA_VENTAS',userId:client},{role:'FINANZAS',userId:null}])await assert.rejects(service.rescheduleInstallment(installment,body,actor));
  assert.equal((await repo.get('quote_payment_installments',installment)).dueDate,'2026-11-15');
  const result=await service.rescheduleInstallment(installment,body,{role:'FINANZAS',userId:actorId});assert.equal(result.dueDate,'2026-11-25');
  await assert.rejects(service.rescheduleInstallment(installment,body,{role:'FINANZAS',userId:actorId}));
});
