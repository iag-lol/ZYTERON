import fs from 'node:fs';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
const config=JSON.parse(fs.readFileSync(process.env.ZYTERON_QUOTE_CONFIG,'utf8'));const base='https://www.zyteron.cl';
const login=await fetch(base+'/administracion/login/submit',{method:'POST',redirect:'manual',headers:{origin:base,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({pwd:config.ADMIN_PASSWORD})});
const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');const get=async(path)=>{const r=await fetch(base+path,{headers:{cookie},signal:AbortSignal.timeout(50000)});assert.equal(r.status,200);return r.json()};
const path='/api/control-core/api/quotes';const all=await get(path+'?pageSize=100');assert.ok(all.items.every(q=>q.billing));
assert.ok(all.items.every((q,i)=>!i||all.items[i-1].createdAt>=q.createdAt));
const first=await get(path+'?pageSize=5&page=1'),second=await get(path+'?pageSize=5&page=2');assert.deepEqual([...first.items,...second.items].map(q=>q.id),all.items.slice(0,10).map(q=>q.id));
const client=all.items.find(q=>q.clientId)?.clientId;if(client){const filtered=await get(path+'?pageSize=100&clientId='+encodeURIComponent(client));assert.ok(filtered.items.length&&filtered.items.every(q=>q.clientId===client));}
const native=all.items.find(q=>q.billing.source==='WEBSITE');const detail='/api/portal/admin/quotes/'+native.id+'/billing';const rows=await get(detail);assert.ok(Array.isArray(rows.rows));
assert.equal((await fetch(base+detail)).status,401);
const blocked=await fetch(base+'/api/portal/admin/quotes/'+randomUUID()+'/billing',{method:'PATCH',headers:{cookie,origin:'https://untrusted.invalid','content-type':'application/json'},body:JSON.stringify({frequency:'MONTHLY'})});assert.equal(blocked.status,403);
const report={at:new Date().toISOString(),quotes:all.items.length,sorted:true,pagination:true,clientFilter:true,billingDetail:true,anonymousDenied:true,crossOriginDenied:true,mutations:0,charges:0,externalMessages:0};fs.writeFileSync('docs/portal/quote-register-http-check.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
