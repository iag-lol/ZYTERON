import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { PDFDocument } from 'pdf-lib';
import { ContractPortalDocumentController, verifyContractDocumentBridge } from '../dist/contracts/contract-portal.controller.js';

test('contrato: canal local firmado rechaza manipulación, caducidad, otra finalidad y replay', () => {
  const key='isolated-contract-test-key', time=String(Date.now()), nonce=randomUUID(),rawBody=Buffer.from('{"contractId":"test"}');
  const signature=createHmac('sha256',key).update(`portal-contract-document\n${time}\n${nonce}\n`).update(rawBody).digest('hex');
  const req={ip:'127.0.0.1',headers:{'x-zyteron-time':time,'x-zyteron-nonce':nonce,'x-zyteron-signature':signature},rawBody};
  assert.throws(()=>verifyContractDocumentBridge({...req,ip:'198.51.100.3'},key));
  assert.throws(()=>verifyContractDocumentBridge({...req,rawBody:Buffer.from('{}')},key));
  assert.throws(()=>verifyContractDocumentBridge({...req,headers:{...req.headers,'x-zyteron-time':'1000000000000'}},key));
  const other=createHmac('sha256',key).update(`portal-invoice-flow\n${time}\n${nonce}\n`).update(rawBody).digest('hex');
  assert.throws(()=>verifyContractDocumentBridge({...req,headers:{...req.headers,'x-zyteron-signature':other}},key));
  assert.doesNotThrow(()=>verifyContractDocumentBridge(req,key));
  assert.throws(()=>verifyContractDocumentBridge(req,key));
});

test('PostgreSQL: publicación de borrador separada de aprobación y limitada a empresa, módulo y estado',async()=>{
  const db=new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE zyteron_portal_client; CREATE ROLE service_role;
      CREATE TABLE client_contracts(id uuid PRIMARY KEY,client_id uuid,status text,portal_visible boolean DEFAULT false,
        approval_status text DEFAULT 'DRAFT',frozen_at timestamptz,archived_at timestamptz,created_at timestamptz DEFAULT now(),version int DEFAULT 1,builder_values jsonb,
        CONSTRAINT contract_portal_approved_summary CHECK(NOT portal_visible OR(approval_status='APPROVED' AND frozen_at IS NOT NULL)));
      CREATE FUNCTION zyteron_client_business(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT $1::text=current_setting('test.client',true) $$;
      ALTER TABLE client_contracts ENABLE ROW LEVEL SECURITY;
      GRANT SELECT(id,client_id,status,portal_visible,approval_status,frozen_at) ON client_contracts TO zyteron_portal_client;
      CREATE POLICY module_guard ON client_contracts AS RESTRICTIVE FOR SELECT TO zyteron_portal_client USING(current_setting('test.documents',true)='true');`);
    await db.exec(await readFile(new URL('../../supabase/migrations/20261024153000_client_contract_review_publication.sql',import.meta.url),'utf8'));
    const owner=randomUUID(),other=randomUUID(),id=randomUUID();
    await db.query(`INSERT INTO client_contracts(id,client_id,status) VALUES($1,$2,'DRAFT')`,[id,owner]);
    const visible=async(client,enabled='true')=>{
      await db.query(`SELECT set_config('test.client',$1,false),set_config('test.documents',$2,false)`,[client,enabled]);
      await db.exec('SET ROLE zyteron_portal_client');
      try {return(await db.query('SELECT id,status,portal_review_visible FROM client_contracts')).rows;}finally{await db.exec('RESET ROLE');}
    };
    assert.equal((await visible(owner)).length,0);
    await db.exec('UPDATE client_contracts SET portal_review_visible=true');
    assert.equal((await visible(owner))[0].status,'DRAFT');
    assert.equal((await visible(other)).length,0);
    assert.equal((await visible(owner,'false')).length,0);
    await assert.rejects(db.exec('UPDATE client_contracts SET portal_visible=true'),e=>e.code==='23514');
    await db.exec('SET ROLE zyteron_portal_client');
    await assert.rejects(db.query('SELECT builder_values FROM client_contracts'),e=>e.code==='42501');
    await db.exec('RESET ROLE');
    await db.exec("UPDATE client_contracts SET archived_at=now()");assert.equal((await visible(owner)).length,0);
    await db.exec("UPDATE client_contracts SET archived_at=null,approval_status='APPROVED',frozen_at=now(),status='IN_REVIEW'");
    assert.equal((await visible(owner)).length,0);
    await db.exec('UPDATE client_contracts SET portal_visible=true');assert.equal((await visible(owner)).length,1);
    await db.exec('SET ROLE anon');await assert.rejects(db.query('SELECT id FROM client_contracts'),e=>e.code==='42501');
    await db.exec('RESET ROLE');
  }finally{await db.close();}
});

test('PDF de revisión sólo para la empresa autorizada, sin modificar firma ni activación',async()=>{
  const pdf=await PDFDocument.create();pdf.addPage();const bytes=Buffer.from(await pdf.save());
  let renders=0, gets=0;
  const owner=randomUUID(),id=randomUUID();
  const data={User:{role:'CLIENT',accountStatus:'ACTIVE',emailVerifiedAt:'2026-10-24'},zyteron_legacy_client_link:{client_id:owner},client_portal_settings:{enabled:true,documents_visible:true},client_contracts:{client_id:owner,status:'DRAFT',portal_review_visible:true,portal_visible:false,approval_status:'DRAFT',frozen_at:null,archived_at:null}};
  const db={from(table){return{select(){return this},eq(){return this},async maybeSingle(){return{data:data[table],error:null}}}}};
  const repo={async get(){gets++;return{id,clientId:owner,status:'DRAFT',signatureStatus:'NOT_CONFIGURED',effectiveStatus:'NOT_STARTED'}}};
  const renderer={async render(contract){renders++;assert.equal(contract.status,'DRAFT');return{bytes,filename:'CTR-test-v1.pdf',unresolved:[]}}};
  const controller=new ContractPortalDocumentController(repo,renderer);
  data.client_contracts.client_id=randomUUID();await assert.rejects(controller.forCustomer('client',id,db));assert.equal(renders,0);assert.equal(gets,0);
  data.client_contracts.client_id=owner;data.client_portal_settings.documents_visible=false;
  await assert.rejects(controller.forCustomer('client',id,db));assert.equal(renders,0);
  data.client_portal_settings.documents_visible=true;data.client_contracts.portal_review_visible=false;
  await assert.rejects(controller.forCustomer('client',id,db));assert.equal(renders,0);
  data.client_contracts.portal_review_visible=true;
  const result=await controller.forCustomer('client',id,db);
  assert.equal(result.filename,'BORRADOR-CTR-test-v1.pdf');assert.equal((await PDFDocument.load(Buffer.from(result.contentBase64,'base64'))).getPageCount(),1);
  assert.equal(data.client_contracts.status,'DRAFT');assert.equal(data.client_contracts.approval_status,'DRAFT');
  data.client_contracts.frozen_at='2026-10-24';data.client_contracts.approval_status='APPROVED';data.client_contracts.portal_visible=true;
  await assert.rejects(controller.forCustomer('client',id,db));assert.equal(renders,1,'nunca regenerar una copia congelada');
});
