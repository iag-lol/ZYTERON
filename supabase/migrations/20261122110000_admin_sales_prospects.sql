-- La cartera administrativa conserva una autoridad de empresa, sin crear una cuenta de empleado.
alter table public.sales_work_records drop constraint sales_work_records_owner_id_fkey;
alter table public.sales_work_proposals drop constraint sales_work_proposals_owner_id_fkey;
alter table public.sales_work_records add column owner_type text not null default 'EXECUTIVE' check(owner_type in('EXECUTIVE','ADMIN')),
 add column created_by uuid,add column converted_at timestamptz,add column converted_by uuid,add column conversion_receipt_key text;
update public.sales_work_records set created_by=owner_id;
alter table public.sales_work_proposals drop constraint sales_work_proposals_commission_rate_check;
alter table public.sales_work_proposals add check(commission_rate in(0,0.15));
create unique index sales_work_one_converted_customer on public.sales_work_records(client_id) where client_created and converted_at is not null;

create or replace function public.sales_workspace_write(p_actor uuid,p_role text,p_action text,p_target uuid,p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare r public.sales_work_records%rowtype; e public.sales_work_events%rowtype; q public.quotes%rowtype;
 result_id uuid; v_client uuid; v_lead uuid; v_owner uuid; v_status text; receipt record; previous public.sales_work_profit_settlements%rowtype;
 v_request uuid; v_created boolean:=false; v_reason text; v_stage text; v_items jsonb; item jsonb; v_total numeric;
begin
 if p_actor is null or p_role is null or p_role not in('GERENTE_GENERAL','EJECUTIVA_VENTAS') then raise exception 'SALES_FORBIDDEN';end if;
 if p_role='EJECUTIVA_VENTAS' and not exists(select 1 from auth.users where id=p_actor and raw_app_meta_data->>'role'='EJECUTIVA_VENTAS' and (banned_until is null or banned_until<now())) then raise exception 'SALES_FORBIDDEN';end if;
 if p_action in('record_review','event_review','report_review','proposal_review','acceptance_validate','profit_validate','complete') and p_role<>'GERENTE_GENERAL' then raise exception 'SALES_FORBIDDEN';end if;
 if p_action in('record_create','proposal_create','event_add','report_create') then
  v_request=(p_payload->>'requestId')::uuid;if v_request is null then raise exception 'SALES_REQUEST_REQUIRED';end if;
  perform pg_advisory_xact_lock(hashtext(p_actor::text||v_request::text));
 end if;
 if p_action='record_create' then
  select id into result_id from public.sales_work_records where owner_id=p_actor and request_id=v_request;if found then return result_id;end if;
  if nullif(p_payload->>'client_id','') is not null then
   select id into v_client from public.clients where id=(p_payload->>'client_id')::uuid and (p_role='GERENTE_GENERAL' or account_executive_id=p_actor);
   if not found then raise exception 'SALES_NOT_FOUND';end if;
   p_payload=p_payload||(select jsonb_build_object('company_name',legal_name,'rut',rut) from public.clients where id=v_client);
  end if;
  insert into public.leads(company_name,contact_name,email,phone,rut,website,interest,notes,assigned_to,status,assigned_by,assigned_at,created_by)
   values(p_payload->>'company_name',p_payload->>'contact_name',nullif(p_payload->>'email',''),nullif(p_payload->>'phone',''),nullif(p_payload->>'rut',''),nullif(p_payload->>'website',''),p_payload->>'interest',p_payload->>'notes',p_actor,'ASSIGNED',p_actor,now(),p_actor) returning id into v_lead;
  insert into public.sales_work_records(owner_type,created_by,owner_id,request_id,lead_id,client_id,company_name,contact_name,rut,email,phone,website,business_activity,address,commune,city,interest,notes,next_action_at)
   values(case when p_role='GERENTE_GENERAL' then 'ADMIN' else 'EXECUTIVE' end,p_actor,p_actor,v_request,v_lead,v_client,p_payload->>'company_name',p_payload->>'contact_name',nullif(p_payload->>'rut',''),nullif(p_payload->>'email',''),nullif(p_payload->>'phone',''),nullif(p_payload->>'website',''),p_payload->>'business_activity',p_payload->>'address',p_payload->>'commune',p_payload->>'city',p_payload->>'interest',p_payload->>'notes',(p_payload->>'next_action_at')::timestamptz) returning id into result_id;
  if p_role='GERENTE_GENERAL' then update public.sales_work_records set review_status='APPROVED',reviewed_by=p_actor,reviewed_at=now() where id=result_id;end if;
  insert into public.sales_work_events(record_id,actor_id,request_id,kind,body,stage,review_status) values(result_id,p_actor,v_request,'CONTACT_CREATED','Contacto registrado; la conversión a cliente requiere una compra confirmada.','CONTACTED',case when p_role='GERENTE_GENERAL' then 'APPROVED' else 'PENDING' end);
  return result_id;
 end if;
 if p_action='report_create' then
  select id into result_id from public.sales_work_reports where owner_id=p_actor and request_id=v_request;if found then return result_id;end if;
  if p_role<>'EJECUTIVA_VENTAS' then raise exception 'SALES_FORBIDDEN';end if;
  if nullif(p_payload->>'record_id','') is not null and not exists(select 1 from public.sales_work_records where id=(p_payload->>'record_id')::uuid and owner_id=p_actor and owner_type='EXECUTIVE') then raise exception 'SALES_NOT_FOUND';end if;
  insert into public.sales_work_reports(owner_id,request_id,record_id,title,body,period_from,period_to) values(p_actor,v_request,nullif(p_payload->>'record_id','')::uuid,p_payload->>'title',p_payload->>'body',(p_payload->>'period_from')::date,(p_payload->>'period_to')::date) returning id into result_id;return result_id;
 end if;
 if p_action='report_review' then
  update public.sales_work_reports set review_status=p_payload->>'decision',review_note=p_payload->>'reason',reviewed_by=p_actor,reviewed_at=now() where id=p_target and review_status='PENDING' returning id into result_id;
  if result_id is null then raise exception 'SALES_STALE';end if;return result_id;
 end if;
 if p_action='event_review' then
  select * into e from public.sales_work_events where id=p_target for update;if not found then raise exception 'SALES_NOT_FOUND';end if;
  update public.sales_work_events set review_status=p_payload->>'decision',review_note=p_payload->>'reason',reviewed_by=p_actor,reviewed_at=now() where id=p_target and review_status='PENDING' returning id into result_id;
  if result_id is null then raise exception 'SALES_STALE';end if;return result_id;
 end if;
 if p_action in('proposal_review','proposal_share','acceptance_validate') then
  select * into q from public.quotes where id=p_target for update;
  select record_id,owner_id into result_id,v_owner from public.sales_work_proposals where quote_id=p_target;
  if not found or(p_role='EJECUTIVA_VENTAS' and v_owner<>p_actor) or q.owner_id is distinct from v_owner then raise exception 'SALES_NOT_FOUND';end if;
  select * into r from public.sales_work_records where id=result_id for update;
 else
  select * into r from public.sales_work_records where id=p_target for update;
  if not found or(p_role='EJECUTIVA_VENTAS' and r.owner_id<>p_actor) then raise exception 'SALES_NOT_FOUND';end if;
 end if;
 if p_role='EJECUTIVA_VENTAS' and r.owner_type<>'EXECUTIVE' then raise exception 'SALES_NOT_FOUND';end if;
 if p_action='record_review' then
  if r.review_status<>'PENDING' then raise exception 'SALES_STALE';end if;
  update public.sales_work_records set review_status=p_payload->>'decision',review_note=p_payload->>'reason',reviewed_by=p_actor,reviewed_at=now(),client_id=coalesce(v_client,client_id),client_created=(client_created or v_created),updated_at=now() where id=r.id;
  if v_client is not null then update public.quotes set client_id=v_client where id in(select quote_id from public.sales_work_proposals where record_id=r.id) and client_id is null;end if;
  update public.sales_work_events set review_status=p_payload->>'decision',review_note=p_payload->>'reason',reviewed_by=p_actor,reviewed_at=now() where record_id=r.id and kind in('CONTACT_CREATED','record_update') and review_status='PENDING';
 elsif p_action='record_update' then
  if r.stage in('COMPLETED','LOST') then raise exception 'SALES_CLOSED';end if;
  update public.sales_work_records set company_name=p_payload->>'company_name',contact_name=p_payload->>'contact_name',rut=nullif(p_payload->>'rut',''),email=nullif(p_payload->>'email',''),phone=nullif(p_payload->>'phone',''),website=p_payload->>'website',business_activity=p_payload->>'business_activity',address=p_payload->>'address',commune=p_payload->>'commune',city=p_payload->>'city',interest=p_payload->>'interest',notes=p_payload->>'notes',next_action_at=(p_payload->>'next_action_at')::timestamptz,review_status=case when p_role='GERENTE_GENERAL' then 'APPROVED' else 'PENDING' end,review_note=null,reviewed_by=case when p_role='GERENTE_GENERAL' then p_actor else null end,reviewed_at=case when p_role='GERENTE_GENERAL' then now() else null end,updated_at=now() where id=r.id;
  if r.client_id is null then update public.leads set company_name=p_payload->>'company_name',contact_name=p_payload->>'contact_name',email=nullif(p_payload->>'email',''),phone=nullif(p_payload->>'phone',''),rut=nullif(p_payload->>'rut',''),interest=p_payload->>'interest',notes=p_payload->>'notes' where id=r.lead_id;end if;
 elsif p_action='event_add' then
  select id into result_id from public.sales_work_events where actor_id=p_actor and request_id=v_request;if found then return result_id;end if;
  if r.stage='COMPLETED' then raise exception 'SALES_CLOSED';end if;
  v_stage=p_payload->>'stage';
  if v_stage is null or v_stage not in('CONTACTED','RESPONDED','INTERESTED','PROPOSAL','ACCEPTED','LOST') then raise exception 'SALES_STAGE_INVALID';end if;
  if v_stage='ACCEPTED' and not exists(select 1 from public.sales_work_proposals w join public.quotes x on x.id=w.quote_id where w.record_id=r.id and x.status in('SENT','NEGOTIATING','ACCEPTED','CONVERTED')) then raise exception 'SALES_APPROVED_PROPOSAL_REQUIRED';end if;
  insert into public.sales_work_events(record_id,actor_id,request_id,kind,body,stage,next_action_at,review_status) values(r.id,p_actor,v_request,p_payload->>'kind',p_payload->>'body',v_stage,(p_payload->>'next_action_at')::timestamptz,case when p_role='GERENTE_GENERAL' then 'APPROVED' else 'PENDING' end) returning id into result_id;
  update public.sales_work_records set stage=v_stage,next_action_at=(p_payload->>'next_action_at')::timestamptz,updated_at=now() where id=r.id;
  return result_id;
 elsif p_action='proposal_create' then
  select quote_id into result_id from public.sales_work_proposals where owner_id=r.owner_id and request_id=v_request and record_id=r.id;if found then return result_id;end if;
  if r.review_status='REJECTED' or r.stage in('COMPLETED','LOST') then raise exception 'SALES_PROPOSAL_BLOCKED';end if;
  v_items=p_payload->'items';if jsonb_typeof(v_items)<>'array' or jsonb_array_length(v_items)=0 then raise exception 'SALES_ITEMS_REQUIRED';end if;
  result_id=public.create_sales_quote((p_payload->'quote')||jsonb_build_object('id',gen_random_uuid(),'owner_id',r.owner_id,'company_name',r.company_name,'contact_name',r.contact_name,'contact_email',r.email,'client_id',r.client_id,'lead_id',r.lead_id,'status','PENDING_APPROVAL'),v_items);
  insert into public.sales_work_proposals(quote_id,record_id,owner_id,request_id,commission_rate) values(result_id,r.id,r.owner_id,v_request,case when r.owner_type='ADMIN' then 0 else 0.15 end);
  update public.sales_work_records set stage='PROPOSAL',updated_at=now() where id=r.id;
  insert into public.sales_work_events(record_id,actor_id,request_id,kind,body,stage,quote_id) values(r.id,p_actor,v_request,'PROPOSAL_SUBMITTED','Propuesta enviada a revisión de administración.','PROPOSAL',result_id);return result_id;
 elsif p_action='proposal_review' then
  if q.status<>'PENDING_APPROVAL' then raise exception 'SALES_STALE';end if;
  if p_payload->>'decision'='APPROVED' and r.review_status<>'APPROVED' then raise exception 'SALES_CONTACT_REVIEW_REQUIRED';end if;
  update public.quotes set status=case when p_payload->>'decision'='APPROVED' then 'APPROVED' else 'REJECTED' end,updated_at=now() where id=q.id;
  update public.sales_work_proposals set review_note=p_payload->>'reason',reviewed_by=p_actor,reviewed_at=now() where quote_id=q.id;
  update public.sales_work_events set review_status=p_payload->>'decision',review_note=p_payload->>'reason',reviewed_by=p_actor,reviewed_at=now() where quote_id=q.id and kind='PROPOSAL_SUBMITTED' and review_status='PENDING';
 elsif p_action='proposal_share' then
  if q.status not in('APPROVED','READY_TO_SEND') then raise exception 'SALES_APPROVED_PROPOSAL_REQUIRED';end if;
  update public.quotes set status='SENT',sent_at=now(),updated_at=now() where id=q.id;
 elsif p_action='acceptance_validate' then
  if r.review_status<>'APPROVED' then raise exception 'SALES_CONTACT_REVIEW_REQUIRED';end if;
  if q.client_id is null then
   if r.rut is null then raise exception 'SALES_RUT_REQUIRED';end if;
   perform pg_advisory_xact_lock(hashtext('sales:rut:'||regexp_replace(upper(r.rut),'[^0-9K]','','g')));
   select id into v_client from public.clients where regexp_replace(upper(rut),'[^0-9K]','','g')=regexp_replace(upper(r.rut),'[^0-9K]','','g');
   if v_client is not null and r.owner_type='EXECUTIVE' and not exists(select 1 from public.clients where id=v_client and account_executive_id=r.owner_id) then raise exception 'SALES_CLIENT_ALREADY_EXISTS';end if;
   if v_client is null then
    insert into public.clients(legal_name,rut,business_activity,general_email,phone,country,commune,address,account_executive_id,status,currency,credit_days,health,health_factors)
    values(r.company_name,r.rut,r.business_activity,r.email,r.phone,'Chile',r.commune,r.address,case when r.owner_type='EXECUTIVE' then r.owner_id else null end,'ONBOARDING','CLP',0,'INSUFFICIENT_DATA','[]'::jsonb) returning id into v_client;
    v_created=true;
    if r.email is not null then insert into public.client_contacts(client_id,name,email,phone,is_primary,billing_contact,technical_contact,commercial_contact,portal_access,status,portal_status)
     values(v_client,r.contact_name,r.email,r.phone,true,false,false,true,false,'ACTIVE','DISABLED');end if;
    insert into public.client_events(client_id,event_type,title,description,visibility,metadata)
     values(v_client,'CLIENT_CREATED','Ficha para facturación','Aceptación comercial validada; compra aún no confirmada.','INTERNAL_ONLY',jsonb_build_object('record_id',r.id,'owner_type',r.owner_type,'reviewed_by',p_actor));
   end if;
   update public.sales_work_records set client_id=v_client,client_created=(client_created or v_created) where id=r.id;
   update public.leads set client_id=v_client where id=r.lead_id;
   update public.quotes set client_id=v_client where id in(select quote_id from public.sales_work_proposals where record_id=r.id) and client_id is null;
  end if;
  if q.status not in('SENT','NEGOTIATING') then raise exception 'SALES_STALE';end if;
  perform public.zyteron_accept_commercial_proposal(q.id,p_actor);
  update public.sales_work_records set stage='ACCEPTED',updated_at=now() where id=r.id;
 elsif p_action='profit_validate' then
  if r.owner_type<>'EXECUTIVE' then raise exception 'SALES_NO_EXECUTIVE_COMMISSION';end if;
  select * into receipt from public.sales_work_verified_receipts x where x.source_id=(p_payload->>'source_id')::uuid and x.source_kind=p_payload->>'source_kind' and x.quote_id in(select quote_id from public.sales_work_proposals where record_id=r.id);
  if not found or receipt.currency<>'CLP' or receipt.net_revenue<=0 then raise exception 'SALES_VERIFIED_PAYMENT_REQUIRED';end if;
  select * into previous from public.sales_work_profit_settlements where receipt_key=receipt.receipt_key;
  if found then
   if previous.net_revenue is distinct from receipt.net_revenue or previous.validated_cost is distinct from (p_payload->>'validated_cost')::numeric then raise exception 'SALES_SETTLEMENT_LOCKED';end if;return previous.id;
  end if;
  if p_payload->>'validated_cost' is null or (p_payload->>'validated_cost')::numeric<0 or (p_payload->>'validated_cost')::numeric>1000000000000 then raise exception 'SALES_COST_INVALID';end if;
  insert into public.sales_work_profit_settlements(quote_id,owner_id,source_kind,source_id,receipt_key,net_revenue,validated_cost,cost_note,approved_by)
   values(receipt.quote_id,r.owner_id,receipt.source_kind,receipt.source_id,receipt.receipt_key,receipt.net_revenue,(p_payload->>'validated_cost')::numeric,p_payload->>'cost_note',p_actor) returning id into result_id;return result_id;
 elsif p_action='complete' then
  if r.review_status<>'APPROVED' or r.client_id is null then raise exception 'SALES_CLIENT_REQUIRED';end if;
  select * into receipt from public.sales_work_verified_receipts v where v.quote_id in(select quote_id from public.sales_work_proposals where record_id=r.id)
   and (nullif(p_payload->>'source_id','') is null or (v.source_id=(p_payload->>'source_id')::uuid and v.source_kind=p_payload->>'source_kind')) order by v.collected_at,v.source_id limit 1;
  if not found or receipt.net_revenue<=0 then raise exception 'SALES_VERIFIED_PAYMENT_REQUIRED';end if;
  if r.converted_at is not null then
   if r.conversion_receipt_key=receipt.receipt_key then return r.id;end if;
  end if;
  perform pg_advisory_xact_lock(hashtext('sales:customer:'||r.client_id::text));
  v_created=r.client_created;
  if not v_created then
   select id into v_client from public.sales_work_records where client_id=r.client_id and client_created and converted_at is null and id<>r.id for update limit 1;
   if found then update public.sales_work_records set client_created=false where id=v_client;v_created=true;end if;
  end if;
  update public.sales_work_records set client_created=v_created,stage='COMPLETED',converted_at=coalesce(converted_at,now()),conversion_receipt_key=receipt.receipt_key,converted_by=p_actor,next_action_at=null,updated_at=now() where id=r.id;
  update public.leads set status='CONVERTED',client_id=r.client_id where id=r.lead_id;
  if v_created then update public.clients set status='ACTIVE' where id=r.client_id and status='ONBOARDING';end if;
  insert into public.client_events(client_id,event_type,title,description,visibility,metadata)
   values(r.client_id,'COMMERCIAL_PURCHASE_CONFIRMED','Compra confirmada desde contacto comercial',coalesce(p_payload->>'reason','Compra y cobro revisados por administración.'),'INTERNAL_ONLY',jsonb_build_object('record_id',r.id,'receipt_key',receipt.receipt_key,'converted_by',p_actor));
 else raise exception 'SALES_ACTION_INVALID';end if;
 insert into public.sales_work_events(record_id,actor_id,request_id,kind,body,stage,review_status)
  values(r.id,p_actor,gen_random_uuid(),p_action,coalesce(nullif(p_payload->>'reason',''),'Gestión registrada.'),(select stage from public.sales_work_records where id=r.id),case when p_role='GERENTE_GENERAL' then 'APPROVED' else 'PENDING' end);
 return r.id;
end $$;
revoke all on function public.sales_workspace_write(uuid,text,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.sales_workspace_write(uuid,text,text,uuid,jsonb) to service_role;

with confirmed as (
 select distinct on(r.id) r.id,v.receipt_key from public.sales_work_records r join public.sales_work_proposals w on w.record_id=r.id
 join public.sales_work_verified_receipts v on v.quote_id=w.quote_id where r.stage='COMPLETED' and r.converted_at is null order by r.id,v.collected_at,v.source_id
) update public.sales_work_records r set converted_at=r.updated_at,conversion_receipt_key=c.receipt_key from confirmed c where r.id=c.id;
notify pgrst,'reload schema';
