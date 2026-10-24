import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {verifyPortalFlowBridge} from '../dist/finance/flow.portal-controller.js';
test('canal de pago contable: firma, identidad de transporte, caducidad y replay',()=>{
 const key='bridge-key-for-isolated-tests',time=String(Date.now()),nonce=randomUUID(),rawBody=Buffer.from('{"userId":"verified-client","amount":1368100}');
 const signature=createHmac('sha256',key).update(`portal-invoice-flow\n${time}\n${nonce}\n`).update(rawBody).digest('hex');
 const request={ip:'127.0.0.1',headers:{'x-zyteron-time':time,'x-zyteron-nonce':nonce,'x-zyteron-signature':signature},rawBody};
 assert.throws(()=>verifyPortalFlowBridge({...request,ip:'203.0.113.1'},key));
 assert.throws(()=>verifyPortalFlowBridge({...request,rawBody:Buffer.from('{}')},key));
 assert.throws(()=>verifyPortalFlowBridge({...request,headers:{...request.headers,'x-zyteron-time':'1000000000000'}},key));
 assert.doesNotThrow(()=>verifyPortalFlowBridge(request,key));
 assert.throws(()=>verifyPortalFlowBridge(request,key));
});
test('PostgreSQL: reservas únicas, integridad de importes, relaciones y tokens inaccesibles al cliente',async()=>{
 const db=new PGlite();try{
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE zyteron_portal_client;CREATE ROLE service_role;CREATE TABLE "User"(id text PRIMARY KEY);CREATE TABLE "Receivable"(id text PRIMARY KEY);CREATE TABLE "Payment"(id text PRIMARY KEY);INSERT INTO "User" VALUES('client');INSERT INTO "Receivable" VALUES('bill');`);
 await db.exec(await readFile(new URL('../../supabase/migrations/20261024143000_receivable_flow_checkout.sql',import.meta.url),'utf8'));
 const reserve=()=>db.query(`INSERT INTO zyteron_receivable_flow(id,receivable_id,user_id,account_hash,amount,state,commerce_order) VALUES($1,'bill','client','account',1368100,'CREATING',$2)`,[randomUUID(),randomUUID()]);
 await reserve();await assert.rejects(reserve(),e=>e.code==='23505');
 await db.exec(`UPDATE zyteron_receivable_flow SET state='REJECTED'`);await reserve();
 await assert.rejects(db.query(`INSERT INTO zyteron_receivable_flow(id,receivable_id,user_id,account_hash,amount,state,commerce_order) VALUES($1,'bill','client','other',-1,'CREATING','bad')`,[randomUUID()]),e=>e.code==='23514');
 for(const role of ['anon','authenticated','zyteron_portal_client']){await db.exec(`SET ROLE ${role}`);await assert.rejects(db.query('SELECT token_cipher FROM zyteron_receivable_flow'),e=>e.code==='42501');await db.exec('RESET ROLE');}
 }finally{await db.close();}
});

test('portal contable: rechaza otra empresa y saldo obsoleto antes de crear la orden',async()=>{
 const {FlowFinanceService}=await import('../dist/finance/flow.service.js');
 const user='native-client',client='10000000-0000-4000-8000-000000000001';
 let balance=1368100,owner=client,starts=0;
 const values={User:{id:user,role:'CLIENT',email:'qa@example.invalid',accountStatus:'ACTIVE',emailVerifiedAt:'2026-10-24'},zyteron_legacy_client_link:{client_id:client},client_portal_settings:{enabled:true,invoices_visible:true}};
 const repo={supabase:{from(table){return{select(){return this},eq(){return this},async maybeSingle(){return{data:values[table],error:null}}}}},async findOne(){return{id:'link'}},async create(_table,input){return{id:'grant',...input}}};
 const service=new FlowFinanceService({repo,async must(){return{clientId:owner,status:'PARTIALLY_PAID',currency:'CLP',balanceDue:balance,documentTypeCode:33}}},{},{});
 service.ready=async()=>({});service.start=async(_grant,_key,email)=>{starts++;assert.equal(email,'qa@example.invalid');return{checkoutUrl:'https://www.flow.cl/?token=isolated'}};
 await assert.rejects(service.portalStart(user,'invoice',100,randomUUID()));assert.equal(starts,0);
 owner='other';await assert.rejects(service.portalStart(user,'invoice',1368100,randomUUID()));assert.equal(starts,0);
 owner=client;const result=await service.portalStart(user,'invoice',1368100,randomUUID());assert.equal(starts,1);assert.equal(result.amount,1368100);
});

test('conciliación de pagos contables no activa suscripciones ni acciones de mantención',async()=>{
 const {FlowWorker}=await import('../dist/finance/flow.worker.js');
 const repo={async list(){return[]}};
 const blocked=new Proxy({},{get(){throw new Error('No se deben procesar suscripciones ni mantenimiento')}});
 const worker=new FlowWorker({repo},blocked,blocked,blocked,blocked,blocked);
 assert.deepEqual(await worker.runPayments(),{processed:0});
});
