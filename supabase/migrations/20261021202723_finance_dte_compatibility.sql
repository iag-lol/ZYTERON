-- Los registros de Finanzas conservan los campos obligatorios del esquema DTE anterior.
-- La instalación no reescribe documentos; la adaptación actúa sobre escrituras posteriores.
-- El formato SII admite folios de diez dígitos, superiores al límite de integer.
alter table public.tax_documents alter column folio type bigint using folio::bigint;
create function public.finance_sync_dte_compatibility()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if tg_op='UPDATE' and old.invoice_id is not null and new.invoice_id is distinct from old.invoice_id
    then raise exception 'DTE_INVOICE_BINDING_IMMUTABLE'; end if;
  if new.invoice_id is null then return new; end if;
  if new.document_type_code is null or new.status is null or new.id is null
    then raise exception 'DTE_REQUIRED_IDENTITY'; end if;
  if tg_op='UPDATE' then
    if (new.id,new.document_type_code,new.environment,new.idempotency_key)
        is distinct from (old.id,old.document_type_code,old.environment,old.idempotency_key)
      then raise exception 'DTE_IDENTITY_IMMUTABLE'; end if;
    if new.status is not distinct from old.status and
      (new.document_type,new.internal_status,new.sii_status) is distinct from (old.document_type,old.internal_status,old.sii_status)
      then raise exception 'DTE_FINANCE_WORKFLOW_REQUIRED'; end if;
    if old.folio is not null and new.folio is distinct from old.folio then raise exception 'DTE_FOLIO_IMMUTABLE'; end if;
    if exists(select 1 from public.tax_document_transmissions where tax_document_id=old.id) and
      (new.emitter_rut,new.receiver_rut,new.issue_date,new.net_amount,new.exempt_amount,new.tax_amount,new.total_amount)
      is distinct from (old.emitter_rut,old.receiver_rut,old.issue_date,old.net_amount,old.exempt_amount,old.tax_amount,old.total_amount)
      then raise exception 'DTE_SNAPSHOT_IMMUTABLE'; end if;
    if old.status in('SIGNED','SUBMITTED','RECEIVED_BY_SII','ACCEPTED','ACCEPTED_WITH_REPAIRS','REJECTED') and
      (new.xml_signed_path,new.xml_signed_sha256) is distinct from (old.xml_signed_path,old.xml_signed_sha256)
      then raise exception 'DTE_SIGNED_ARCHIVE_IMMUTABLE'; end if;
  end if;
  if new.document_type is not null and new.document_type<>new.document_type_code then raise exception 'DTE_TYPE_MISMATCH'; end if;
  new.document_type:=new.document_type_code;
  new.idempotency_key:=coalesce(nullif(trim(new.idempotency_key),''),'finance:dte:'||new.id);
  new.internal_status:=case new.status when 'DRAFT' then 'draft' when 'VALIDATED' then 'validated'
    when 'SIGNED' then 'signing' when 'SUBMITTED' then 'sending' when 'RECEIVED_BY_SII' then 'sending'
    when 'ACCEPTED' then 'emitted' when 'ACCEPTED_WITH_REPAIRS' then 'emitted' when 'REJECTED' then 'error'
    when 'CANCELLED' then 'voided' else null end;
  new.sii_status:=case new.status when 'SUBMITTED' then 'sent' when 'RECEIVED_BY_SII' then 'in_process'
    when 'ACCEPTED' then 'accepted' when 'ACCEPTED_WITH_REPAIRS' then 'accepted_with_remarks'
    when 'REJECTED' then 'rejected' else 'not_sent' end;
  if new.internal_status is null then raise exception 'DTE_STATUS_UNSUPPORTED'; end if;
  if new.status='SIGNED' and exists(select 1 from public.tax_document_transmissions where tax_document_id=new.id and state in('SENDING','UNKNOWN'))
    then new.internal_status:='sending'; new.sii_status:='in_process'; end if;
  return new;
end $$;
create trigger tax_documents_compatibility before insert or update on public.tax_documents
  for each row execute function public.finance_sync_dte_compatibility();
revoke all on function public.finance_sync_dte_compatibility() from public,anon,authenticated;
grant execute on function public.finance_sync_dte_compatibility() to service_role;
notify pgrst,'reload schema';
