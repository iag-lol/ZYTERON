import fs from 'node:fs';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import pg from 'pg';
const env=JSON.parse(fs.readFileSync('../../.tools/control-cloud-private.json','utf8'));
const db=new pg.Client({connectionString:env.DATABASE_URL,ssl:{rejectUnauthorized:true,ca:fs.readFileSync('src/lib/database/supabase-ca.crt','utf8')}});let checks=0;const check=(test)=>{assert.ok(test);checks++};
await db.connect();await db.query('BEGIN');
try{
 const links=(await db.query('SELECT l.user_id,l.client_id FROM zyteron_legacy_client_link l JOIN "User" u ON u.id=l.user_id WHERE u."accountStatus"=\'ACTIVE\' AND u."emailVerifiedAt" IS NOT NULL ORDER BY l.user_id LIMIT 2')).rows;assert.equal(links.length,2);
 const [a,b]=links,project=randomUUID(),workOrder=randomUUID(),ticket=randomUUID(),publicMessage=randomUUID(),internalMessage=randomUUID(),type=randomUUID(),document=randomUUID(),privateDocument=randomUUID(),version=randomUUID();
 await db.query('INSERT INTO work_orders(id,work_order_number,client_id,title,status,scope) VALUES($1,$2,$3,\'TX-QA order\',\'PENDING_PLANNING\',\'Transaction-only\')',[workOrder,'TX_QA_'+workOrder,a.client_id]);
 await db.query('INSERT INTO projects(id,project_number,work_order_id,client_id,name,scope,client_visibility) VALUES($1,$2,$3,$4,\'TX-QA project\',\'Transaction-only\',\'CLIENT_VISIBLE\')',[project,'TX_QA_'+project,workOrder,a.client_id]);
 await db.query('INSERT INTO support_tickets(id,ticket_number,client_id,subject,description,requester_type,ticket_type,channel,client_visibility) VALUES($1,$3,$2,\'TX-QA support\',\'Transaction-only scope validation\',\'CLIENT\',\'SERVICE_REQUEST\',\'PORTAL\',\'CLIENT_VISIBLE\')',[ticket,a.client_id,'TX_QA_'+ticket]);
 await db.query('INSERT INTO ticket_messages(id,ticket_id,author_type,message_type,body,visibility) VALUES($1,$3,\'AGENT\',\'MESSAGE\',\'Visible response\',\'PUBLIC_REPLY\'),($2,$3,\'AGENT\',\'MESSAGE\',\'Private internal note\',\'INTERNAL_NOTE\')',[publicMessage,internalMessage,ticket]);
 await db.query('INSERT INTO document_types(id,code,name) VALUES($1,$2,\'Transaction-only document type\')',[type,'TX_QA_'+type]);
 await db.query('INSERT INTO documents(id,title,type_id,classification,client_visible,status) VALUES($1,\'Visible fixture\',$3,\'CLIENT\',true,\'PUBLISHED\'),($2,\'Private fixture\',$3,\'INTERNAL\',false,\'PUBLISHED\')',[document,privateDocument,type]);
 await db.query('INSERT INTO document_links(document_id,link_type,linked_id) VALUES($1,\'CLIENT\',$3),($2,\'CLIENT\',$3)',[document,privateDocument,a.client_id]);
 await db.query('INSERT INTO document_versions(id,document_id,version_number,filename,storage_path,mime_type,size_bytes,sha256,malware_status) VALUES($1,$2,1,\'fixture.pdf\',\'not-uploaded/fixture.pdf\',\'application/pdf\',1,$3,\'CLEAN\')',[version,document,'1'.repeat(64)]);
 await db.query('UPDATE documents SET current_version_id=$1 WHERE id=$2',[version,document]);
 async function identity(userId){await db.query('RESET ROLE');await db.query("SELECT set_config('zyteron.portal_user_id',$1,true)",[userId]);await db.query('SET LOCAL ROLE zyteron_portal_client');}
 await identity(a.user_id);
 check((await db.query('SELECT id FROM projects WHERE id=$1',[project])).rowCount===1);
 check((await db.query('SELECT id FROM support_tickets WHERE id=$1',[ticket])).rowCount===1);
 check((await db.query('SELECT id FROM ticket_messages WHERE ticket_id=$1',[ticket])).rowCount===1);
 check((await db.query('SELECT id FROM documents WHERE id=ANY($1)',[[document,privateDocument]])).rowCount===1);
 check((await db.query('SELECT id FROM document_versions WHERE id=$1',[version])).rowCount===1);
 await db.query('INSERT INTO ticket_messages(id,ticket_id,author_type,message_type,body,visibility) VALUES($1,$2,\'CLIENT\',\'PORTAL_REPLY\',\'Own reply\',\'PUBLIC_REPLY\')',[randomUUID(),ticket]);checks++;
 async function denied(sql,args){await db.query('SAVEPOINT denied');let failed=false;try{await db.query(sql,args)}catch(e){failed=e.code==='42501'}await db.query('ROLLBACK TO SAVEPOINT denied');check(failed);}
 await denied('INSERT INTO ticket_messages(id,ticket_id,author_type,message_type,body,visibility) VALUES($1,$2,\'AGENT\',\'MESSAGE\',\'Spoofed\',\'INTERNAL_NOTE\')',[randomUUID(),ticket]);
 await denied('UPDATE support_tickets SET status=\'CLOSED\' WHERE id=$1',[ticket]);
 await identity(b.user_id);
 for(const [table,record] of [['projects',project],['support_tickets',ticket],['ticket_messages',publicMessage],['documents',document],['document_versions',version]])check((await db.query(`SELECT id FROM ${table} WHERE id=$1`,[record])).rowCount===0);
 await denied('INSERT INTO ticket_messages(id,ticket_id,author_type,message_type,body,visibility) VALUES($1,$2,\'CLIENT\',\'PORTAL_REPLY\',\'Foreign reply\',\'PUBLIC_REPLY\')',[randomUUID(),ticket]);
 await db.query('RESET ROLE');await db.query('SET LOCAL ROLE anon');for(const table of ['projects','documents','support_tickets','ticket_messages']){await db.query('SAVEPOINT anon_check');let inaccessible=false;try{inaccessible=(await db.query(`SELECT id FROM ${table} LIMIT 1`)).rowCount===0;}catch(e){inaccessible=e.code==='42501';}await db.query('ROLLBACK TO SAVEPOINT anon_check');check(inaccessible);}
 console.log({publicationSecurityChecks:checks,passed:true,persistentTestData:0,emails:0,payments:0});
}finally{await db.query('ROLLBACK');await db.end();}
