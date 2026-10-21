import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { LeadsService } from '../dist/commercial/leads.service.js';
import { CommercialRepository } from '../dist/commercial/commercial.repository.js';

const ids = ['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004'];
test('calificar envía un único filtro por ID y conserva los otros leads y sus fechas', async () => {
  const previousUrl=process.env.SUPABASE_URL, previousKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rows=new Map(ids.map((id,i)=>[id,{id,company_name:`Empresa sintética ${i+1}`,contact_name:`Contacto ${i+1}`,status:i===1||i===2?'QUALIFIED':'NEW',score:null,created_at:'2026-10-10T00:00:00Z',updated_at:'2026-10-10T00:00:00Z',archived_at:null}]));
  const before=structuredClone([...rows.values()]), writes=[], events=[];
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url,'http://127.0.0.1');let body='';for await (const chunk of req)body+=chunk;
    const json=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
    if(url.pathname==='/rest/v1/leads'){
      const filter=url.searchParams.get('id');const row=rows.get((filter||'').replace(/^eq\./,''));
      if(req.method==='GET')return json(row?[row]:[]);
      if(req.method==='PATCH'){
        writes.push({filter,body:JSON.parse(body)});
        if(!filter?.startsWith('eq.')||!row)return json({message:'A single lead ID is required'},400);
        Object.assign(row,JSON.parse(body));return json(row);
      }
    }
    if(req.method==='POST'&&url.pathname==='/rest/v1/commercial_events'){
      const event={id:ids[3],...JSON.parse(body),occurred_at:new Date().toISOString()};events.push(event);return json(event);
    }
    if(req.method==='POST'&&url.pathname==='/rest/v1/business_event_outbox')return json({});
    return json({message:'Unexpected request'},500);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    process.env.SUPABASE_URL=`http://127.0.0.1:${server.address().port}`;process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-only-key';
    const service=new LeadsService(new CommercialRepository());
    const result=await service.qualify(ids[0],ids[3]);
    assert.equal(result.id,ids[0]);assert.equal(result.status,'QUALIFIED');
    assert.equal(writes.length,1);assert.equal(writes[0].filter,'eq.'+ids[0]);
    assert.deepEqual([...rows.values()].slice(1),before.slice(1));
    assert.deepEqual(events.map(e=>({id:e.aggregate_id,type:e.event_type})),[{id:ids[0],type:'LEAD_QUALIFIED'}]);
    await assert.rejects(service.qualify('not-an-id',ids[3]));assert.equal(writes.length,1);
  } finally {
    if(previousUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=previousUrl;
    if(previousKey===undefined)delete process.env.SUPABASE_SERVICE_ROLE_KEY;else process.env.SUPABASE_SERVICE_ROLE_KEY=previousKey;
    await new Promise(resolve=>server.close(resolve));
  }
});

test('un lead inexistente o cerrado no actualiza registros ni publica una calificación',async()=>{
  let writes=0;
  for(const status of [undefined,'CONVERTED','DISQUALIFIED']){
    const service=new LeadsService({async getLead(){return status?{id:ids[0],status}:undefined;},async updateLead(){writes++;},async publish(){writes++;}});
    await assert.rejects(service.qualify(ids[0],ids[3]));
  }
  assert.equal(writes,0);
});
