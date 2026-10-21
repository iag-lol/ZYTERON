-- La adquisición persiste antes del envío. Un resultado incierto nunca permite retransmitir.
create table public.tax_document_transmissions (
  tax_document_id uuid primary key references public.tax_documents(id) on delete restrict,
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  state text not null check(state in('PREPARING','LOCAL_FAILED','SENDING','UNKNOWN','SUBMITTED')),
  actor_id text not null,
  signed_sha256 text,
  envelope_sha256 text,
  envelope_path text,
  track_id text,
  message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  check(signed_sha256 is null or signed_sha256 ~ '^[a-f0-9]{64}$'),
  check(envelope_sha256 is null or envelope_sha256 ~ '^[a-f0-9]{64}$'),
  check(track_id is null or (track_id ~ '^[0-9]{1,30}$' and track_id !~ '^0+$')),
  check(state <> 'SUBMITTED' or track_id is not null)
);
alter table public.tax_document_transmissions enable row level security;
revoke all on public.tax_document_transmissions from public,anon,authenticated,service_role;
grant select,insert,update on public.tax_document_transmissions to service_role;
create index tax_document_transmissions_invoice_idx on public.tax_document_transmissions(invoice_id);

create function public.finance_guard_active_dte_invoice()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if old.status='ISSUING' and (new.status in('DRAFT','PENDING_APPROVAL','READY_TO_ISSUE','CANCELLED','VOID')
      or new.tax_document_id is distinct from old.tax_document_id) then
    if exists(select 1 from public.tax_document_transmissions t join public.tax_documents d on d.id=t.tax_document_id
        where t.invoice_id=old.id and t.state in('PREPARING','SENDING','UNKNOWN','SUBMITTED') and d.status not in('REJECTED','CANCELLED'))
      then raise exception 'DTE_INVOICE_LOCKED: el intento de emisión está activo o requiere revisión'; end if;
  end if;
  return new;
end $$;
create trigger invoices_active_dte_guard before update on public.invoices
  for each row execute function public.finance_guard_active_dte_invoice();

create function public.finance_claim_dte_issue(p_document uuid,p_actor text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare d public.tax_documents%rowtype; i public.invoices%rowtype;
begin
  select * into d from public.tax_documents where id=p_document for update;
  if not found then raise exception 'DTE_NOT_FOUND'; end if;
  if exists(select 1 from public.tax_document_transmissions where tax_document_id=p_document) then return false; end if;
  if d.status is null or d.status not in('DRAFT','VALIDATED') or length(trim(coalesce(p_actor,'')))=0 then raise exception 'DTE_NOT_PREPARABLE'; end if;
  select * into i from public.invoices where id=d.invoice_id for update;
  if not found or i.status is distinct from 'READY_TO_ISSUE' then raise exception 'DTE_INVOICE_NOT_READY'; end if;
  if i.currency is distinct from 'CLP' then raise exception 'DTE_CURRENCY_NOT_SUPPORTED'; end if;
  if (d.document_type_code,d.issue_date,d.total_amount,d.net_amount,d.exempt_amount,d.tax_amount)
      is distinct from (i.document_type_code,i.issue_date,i.total_amount,i.net_amount,i.exempt_amount,i.tax_amount)
    then raise exception 'DTE_SNAPSHOT_CHANGED'; end if;
  if d.receiver_rut is null or d.receiver_rut is distinct from i.client_snapshot->>'rut' then raise exception 'DTE_RECEIVER_CHANGED'; end if;
  if not exists(select 1 from public.finance_settings s where s.company_rut=d.emitter_rut
      and s.dte_environment=d.environment and s.dte_provider=d.provider
      and (d.environment='CERTIFICATION' or s.dte_production_authorized))
    then raise exception 'DTE_ENVIRONMENT_CHANGED'; end if;
  insert into public.tax_document_transmissions(tax_document_id,invoice_id,state,actor_id)
    values(d.id,d.invoice_id,'PREPARING',p_actor);
  update public.invoices set status='ISSUING',tax_document_id=d.id where id=d.invoice_id;
  return true;
end $$;

create or replace function public.finance_reserve_folio(p_type integer,p_environment text,p_tax_document uuid)
returns bigint language plpgsql security invoker set search_path=public as $$
declare d public.tax_documents%rowtype; v_id uuid; v_folio bigint;
begin
  select * into d from public.tax_documents where id=p_tax_document for update;
  if not found or d.document_type_code is distinct from p_type or d.environment is distinct from p_environment
    or d.status is null or d.status not in('DRAFT','VALIDATED','SIGNED') then raise exception 'DTE_FOLIO_DOCUMENT_MISMATCH'; end if;
  if not exists(select 1 from public.tax_document_transmissions where tax_document_id=d.id and state='PREPARING')
    then raise exception 'DTE_NOT_ACQUIRED'; end if;
  if (select count(*) from public.tax_folios where tax_document_id=d.id and status in('RESERVED','USED')) > 1
    then raise exception 'DTE_MULTIPLE_FOLIOS_REQUIRE_REVIEW'; end if;
  select folio into v_folio from public.tax_folios where tax_document_id=d.id
    and document_type_code=p_type and environment=p_environment and status='RESERVED';
  if v_folio is not null then return v_folio; end if;
  if exists(select 1 from public.tax_folios where tax_document_id=d.id and status in('RESERVED','USED'))
    then raise exception 'DTE_FOLIO_MISMATCH'; end if;
  select f.id,f.folio into v_id,v_folio from public.tax_folios f
    where f.document_type_code=p_type and f.environment=p_environment and f.status='AVAILABLE'
    and exists(select 1 from public.tax_folio_authorizations a where a.id=f.authorization_id and a.status='ACTIVE')
    order by f.folio limit 1 for update skip locked;
  if v_id is null then raise exception 'FINANCE_NO_FOLIOS'; end if;
  update public.tax_folios set status='RESERVED',tax_document_id=d.id,reserved_at=now() where id=v_id;
  update public.tax_documents set folio=v_folio where id=d.id;
  return v_folio;
end $$;

create function public.finance_update_dte_preparation(p_document uuid,p_status text,p_path text,p_sha text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare d public.tax_documents%rowtype; t public.tax_document_transmissions%rowtype; base text;
begin
  select * into d from public.tax_documents where id=p_document for update;
  if not found then raise exception 'DTE_NOT_FOUND'; end if;
  select * into t from public.tax_document_transmissions where tax_document_id=p_document for update;
  if not found or t.state <> 'PREPARING' then return false; end if;
  if not exists(select 1 from public.finance_settings s where s.company_rut=d.emitter_rut
      and s.dte_environment=d.environment and s.dte_provider=d.provider
      and (d.environment='CERTIFICATION' or s.dte_production_authorized))
    then raise exception 'DTE_ENVIRONMENT_CHANGED'; end if;
  base:='dte/'||lower(d.environment)||'/'||d.document_type_code||'/'||d.folio||'/';
  if p_sha is null or p_sha !~ '^[a-f0-9]{64}$' or d.folio is null
    or p_status not in('VALIDATED','SIGNED') then raise exception 'DTE_ARCHIVE_MISMATCH'; end if;
  if p_status='VALIDATED' and d.status='DRAFT' and p_path=base||'unsigned.xml' then
    update public.tax_documents set status=p_status,xml_unsigned_path=p_path,xml_unsigned_sha256=p_sha where id=d.id;
  elsif p_status='SIGNED' and d.status='VALIDATED' and p_path=base||'signed.xml' then
    update public.tax_documents set status=p_status,xml_signed_path=p_path,xml_signed_sha256=p_sha where id=d.id;
  else raise exception 'DTE_PREPARATION_STATE_CHANGED'; end if;
  return true;
end $$;

create function public.finance_start_dte_transmission(p_document uuid,p_signed_sha text,p_envelope_sha text,p_envelope_path text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare d public.tax_documents%rowtype; t public.tax_document_transmissions%rowtype; i public.invoices%rowtype;
begin
  select * into d from public.tax_documents where id=p_document for update;
  if not found then raise exception 'DTE_NOT_FOUND'; end if;
  select * into t from public.tax_document_transmissions where tax_document_id=p_document for update;
  if not found or t.state <> 'PREPARING' then return false; end if;
  select * into i from public.invoices where id=d.invoice_id for update;
  if not found or i.status is distinct from 'ISSUING' or i.tax_document_id is distinct from d.id then raise exception 'DTE_INVOICE_NOT_READY'; end if;
  if not exists(select 1 from public.finance_settings s where s.company_rut=d.emitter_rut
      and s.dte_environment=d.environment and s.dte_provider=d.provider
      and (d.environment='CERTIFICATION' or s.dte_production_authorized))
    then raise exception 'DTE_ENVIRONMENT_CHANGED'; end if;
  if d.status is distinct from 'SIGNED' or p_signed_sha is null or p_envelope_sha is null
    or d.xml_signed_sha256 is distinct from p_signed_sha
    or p_signed_sha !~ '^[a-f0-9]{64}$' or p_envelope_sha !~ '^[a-f0-9]{64}$'
    or p_envelope_path is distinct from 'dte/'||lower(d.environment)||'/'||d.document_type_code||'/'||d.folio||'/envio.xml'
    or d.xml_signed_path is distinct from 'dte/'||lower(d.environment)||'/'||d.document_type_code||'/'||d.folio||'/signed.xml'
    then raise exception 'DTE_ARCHIVE_MISMATCH'; end if;
  if (select count(*) from public.tax_folios where tax_document_id=d.id and status='RESERVED'
      and environment=d.environment and document_type_code=d.document_type_code and folio=d.folio) <> 1
    then raise exception 'DTE_FOLIO_MISMATCH'; end if;
  update public.tax_document_transmissions set state='SENDING',signed_sha256=p_signed_sha,
    envelope_sha256=p_envelope_sha,envelope_path=p_envelope_path,started_at=now() where tax_document_id=d.id;
  return true;
end $$;

create function public.finance_fail_dte_issue(p_document uuid,p_message text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare d public.tax_documents%rowtype; t public.tax_document_transmissions%rowtype;
begin
  select * into d from public.tax_documents where id=p_document for update;
  if not found then raise exception 'DTE_NOT_FOUND'; end if;
  select * into t from public.tax_document_transmissions where tax_document_id=p_document for update;
  if not found or t.state in('LOCAL_FAILED','SUBMITTED') then return false; end if;
  if t.state='PREPARING' then
    update public.tax_document_transmissions set state='LOCAL_FAILED',message=left(p_message,500) where tax_document_id=d.id;
    update public.invoices set status='READY_TO_ISSUE' where id=d.invoice_id and status='ISSUING';
    update public.tax_documents set status_message='Fallo local antes del envío; requiere revisar o abandonar este intento.' where id=d.id;
  else
    update public.tax_document_transmissions set state='UNKNOWN',message=left(p_message,500) where tax_document_id=d.id;
    update public.tax_documents set status_message='Recepción no confirmada; no retransmitir. Recupera el recibo o revisa el envío en el SII.' where id=d.id and status='SIGNED';
  end if;
  return true;
end $$;

create function public.finance_complete_dte_submission(p_document uuid,p_signed_sha text,p_envelope_sha text,p_track text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare d public.tax_documents%rowtype; t public.tax_document_transmissions%rowtype;
begin
  select * into d from public.tax_documents where id=p_document for update;
  if not found then raise exception 'DTE_NOT_FOUND'; end if;
  select * into t from public.tax_document_transmissions where tax_document_id=p_document for update;
  if not found or t.state not in('SENDING','UNKNOWN','SUBMITTED') then raise exception 'DTE_NOT_TRANSMITTED'; end if;
  if p_track is null or p_track !~ '^[0-9]{1,30}$' or p_track ~ '^0+$' or t.signed_sha256 is distinct from p_signed_sha
    or t.envelope_sha256 is distinct from p_envelope_sha or d.xml_signed_sha256 is distinct from p_signed_sha
    or (t.track_id is not null and t.track_id <> p_track)
    or (d.track_id is not null and d.track_id <> p_track) then raise exception 'DTE_RECEIPT_MISMATCH'; end if;
  if d.status in('SUBMITTED','RECEIVED_BY_SII','ACCEPTED','ACCEPTED_WITH_REPAIRS','REJECTED') then
    if d.track_id is distinct from p_track then raise exception 'DTE_RECEIPT_MISMATCH'; end if;
    return true;
  end if;
  if d.status is distinct from 'SIGNED' then raise exception 'DTE_NOT_SIGNED'; end if;
  perform id from public.tax_folios where tax_document_id=d.id for update;
  if (select count(*) from public.tax_folios where tax_document_id=d.id and status in('RESERVED','USED')
      and environment=d.environment and document_type_code=d.document_type_code and folio=d.folio) <> 1
    then raise exception 'DTE_FOLIO_MISMATCH'; end if;
  update public.tax_folios set status='USED',used_at=coalesce(used_at,now()) where tax_document_id=d.id
    and status in('RESERVED','USED') and environment=d.environment and document_type_code=d.document_type_code and folio=d.folio;
  update public.tax_documents set status='SUBMITTED',track_id=p_track,submitted_at=coalesce(submitted_at,now()),
    response_path=t.envelope_path,status_message='Envío recibido por el SII; pendiente de validación.' where id=d.id;
  update public.tax_document_transmissions set state='SUBMITTED',track_id=p_track,completed_at=now() where tax_document_id=d.id;
  return true;
end $$;

create function public.finance_abandon_dte_issue(p_document uuid,p_reason text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare d public.tax_documents%rowtype; t public.tax_document_transmissions%rowtype;
begin
  select * into d from public.tax_documents where id=p_document for update;
  if not found then raise exception 'DTE_NOT_FOUND'; end if;
  select * into t from public.tax_document_transmissions where tax_document_id=p_document for update;
  if d.status is null or d.status not in('DRAFT','VALIDATED','SIGNED') or length(trim(coalesce(p_reason,'')))=0
    or (t.tax_document_id is not null and t.state not in('LOCAL_FAILED','PREPARING'))
    or (d.status='SIGNED' and t.tax_document_id is null)
    then raise exception 'DTE_REQUIRES_SII_REVIEW: no se puede abandonar un envío activo o incierto'; end if;
  if exists(select 1 from public.tax_folios where tax_document_id=d.id and status='USED')
    then raise exception 'DTE_FOLIO_ALREADY_USED'; end if;
  update public.tax_folios set status='VOIDED',voided_at=now(),void_reason=left(p_reason,300)
    where tax_document_id=d.id and status='RESERVED';
  update public.tax_documents set status='CANCELLED',status_message='Abandonado: '||left(p_reason,300) where id=d.id;
  update public.tax_document_transmissions set state='LOCAL_FAILED',message='Abandonado antes del envío: '||left(p_reason,300) where tax_document_id=d.id;
  update public.invoices set status='READY_TO_ISSUE',tax_document_id=null where id=d.invoice_id and tax_document_id=d.id
    and status in('ISSUING','READY_TO_ISSUE');
  return true;
end $$;

create function public.finance_dte_journal_ready()
returns boolean language sql stable security invoker set search_path=public as $$
  select to_regprocedure('public.finance_claim_dte_issue(uuid,text)') is not null
    and to_regprocedure('public.finance_update_dte_preparation(uuid,text,text,text)') is not null
    and to_regprocedure('public.finance_start_dte_transmission(uuid,text,text,text)') is not null
    and to_regprocedure('public.finance_fail_dte_issue(uuid,text)') is not null
    and to_regprocedure('public.finance_complete_dte_submission(uuid,text,text,text)') is not null
    and to_regprocedure('public.finance_abandon_dte_issue(uuid,text)') is not null
    and exists(select 1 from pg_class where oid='public.tax_document_transmissions'::regclass and relrowsecurity)
    and exists(select 1 from pg_trigger where tgrelid='public.invoices'::regclass and tgname='invoices_active_dte_guard' and not tgisinternal);
$$;

revoke all on function public.finance_claim_dte_issue(uuid,text),public.finance_start_dte_transmission(uuid,text,text,text),
  public.finance_fail_dte_issue(uuid,text),public.finance_complete_dte_submission(uuid,text,text,text),
  public.finance_abandon_dte_issue(uuid,text),public.finance_update_dte_preparation(uuid,text,text,text),
  public.finance_reserve_folio(integer,text,uuid),public.finance_guard_active_dte_invoice(),public.finance_dte_journal_ready() from public,anon,authenticated;
grant execute on function public.finance_claim_dte_issue(uuid,text),public.finance_start_dte_transmission(uuid,text,text,text),
  public.finance_fail_dte_issue(uuid,text),public.finance_complete_dte_submission(uuid,text,text,text),
  public.finance_abandon_dte_issue(uuid,text),public.finance_update_dte_preparation(uuid,text,text,text),
  public.finance_reserve_folio(integer,text,uuid),public.finance_guard_active_dte_invoice(),public.finance_dte_journal_ready() to service_role;
