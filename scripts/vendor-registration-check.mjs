import fs from 'node:fs';import assert from 'node:assert/strict';import pg from 'pg';import {randomUUID} from 'node:crypto';
import {VendorService} from '../control-runtime/dist/finance/finance.payables.js';
import {can} from '../control-runtime/dist/finance/finance.access.js';
import {decryptSecret,encryptionConfigured} from '../control-runtime/dist/finance/finance.util.js';
const config=JSON.parse(fs.readFileSync(process.env.ZYTERON_VENDOR_CONFIG,'utf8'));process.env.FINANCE_ENCRYPTION_KEY=config.FINANCE_ENCRYPTION_KEY;
assert.ok(encryptionConfigured());const url=new URL(config.DATABASE_URL);if(!url.username.includes('bwybwrxrbzjkwpxhpkcr'))throw Error('UNEXPECTED_PROJECT');for(const k of ['sslmode','sslkey','sslcert','sslrootcert'])url.searchParams.delete(k);
const db=new pg.Client({connectionString:url.toString(),ssl:{rejectUnauthorized:true,ca:fs.readFileSync('src/lib/database/supabase-ca.crt','utf8')}});await db.connect();let checks=1;const plain='000123456789';const id=randomUUID();
const snake=s=>s.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());const camel=s=>s.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());
const repo={async create(table,data){assert.equal(table,'vendors');const fields=Object.entries(data).filter(([,v])=>v!==undefined);const cols=['id',...fields.map(([key])=>snake(key))];const names=cols.map(k=>'"'+k+'"').join(',');const values=[id,...fields.map(([,value])=>value)];const row=(await db.query(`INSERT INTO vendors(${names}) VALUES(${values.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,values)).rows[0];return Object.fromEntries(Object.entries(row).map(([key,value])=>[camel(key),value]));},async audit(actor,action,type,entity,summary){await db.query('INSERT INTO finance_audit_events(actor_role,action,entity_type,entity_id,summary) VALUES($1,$2,$3,$4,$5)',[actor.role,action,type,entity,summary]);}};
const ctx={repo,requireAny(actor,...permissions){assert.ok(permissions.some(p=>can(actor.role,p)));}};
const rutBase='96500002';let factor=2,sum=0;for(const digit of [...rutBase].reverse()){sum+=Number(digit)*factor;factor=factor===7?2:factor+1;}const v=11-sum%11;const rut=rutBase+'-'+(v===11?'0':v===10?'K':String(v));
try{await db.query('BEGIN');const before=(await db.query('SELECT count(*)::int as count FROM vendors')).rows[0].count;
const service=new VendorService(ctx);const vendor=await service.create({rut,legalName:'VERIFICACION ROLLBACK',paymentTermsDays:15,bankName:'QA',bankAccountType:'CHECKING',bankAccountNumber:plain},{role:'GERENTE_GENERAL',userId:null});
assert.equal(vendor.bankAccountLast4,'6789');checks++;assert.equal(vendor.hasEncryptedBankAccount,true);checks++;assert.ok(!JSON.stringify(vendor).includes(plain));checks++;assert.ok(!('bankAccountEncrypted' in vendor));checks++;
const row=(await db.query('SELECT bank_account_encrypted,bank_account_last4 FROM vendors WHERE id=$1',[id])).rows[0];assert.notEqual(row.bank_account_encrypted,plain);checks++;assert.equal(decryptSecret(row.bank_account_encrypted),plain);checks++;assert.equal(row.bank_account_last4,'6789');checks++;
const parts=row.bank_account_encrypted.split('.');const bytes=Buffer.from(parts[3],'base64');bytes[0]^=1;parts[3]=bytes.toString('base64');assert.throws(()=>decryptSecret(parts.join('.')));checks++;
await db.query('ROLLBACK');assert.equal((await db.query('SELECT count(*)::int as count FROM vendors')).rows[0].count,before);checks++;
console.log(JSON.stringify({checks,rolledBack:true,plainAccountStored:false,plainAccountInResponse:false,authenticationChanged:false,paymentsCreated:0}));
}catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}
