-- La vuelta a borrador y el inicio de un DTE se serializan mediante la factura.
create or replace function public.finance_reopen_invoice_draft(p_invoice uuid)
returns boolean language plpgsql security invoker set search_path=public as $$
declare i public.invoices%rowtype;
begin
  select * into i from public.invoices where id=p_invoice for update;
  if not found then raise exception 'FINANCE_NOT_FOUND: Factura no encontrada.'; end if;
  if i.status is distinct from 'READY_TO_ISSUE' or i.document_type_code is null or i.document_type_code not in(33,34,39,41)
    then raise exception 'FINANCE_STATE: La factura cambió; sólo se vuelve a borrador un documento aprobado sin emisión iniciada.'; end if;
  if i.tax_document_id is not null or exists(select 1 from public.tax_documents where invoice_id=i.id)
    then raise exception 'FINANCE_STATE: La factura tiene un intento DTE registrado. Revisa su estado antes de corregirla.'; end if;
  update public.invoices set status='DRAFT',approval_required=false,approved_by=null,approved_at=null where id=i.id;
  return true;
end $$;
revoke all on function public.finance_reopen_invoice_draft(uuid) from public,anon,authenticated;
grant execute on function public.finance_reopen_invoice_draft(uuid) to service_role;

create or replace function public.finance_guard_dte_invoice_preparation()
returns trigger language plpgsql security invoker set search_path=public as $$
declare invoice_status text;
begin
  if new.invoice_id is null then return new; end if;
  select status into invoice_status from public.invoices where id=new.invoice_id for update;
  if invoice_status is distinct from 'READY_TO_ISSUE'
    then raise exception 'FINANCE_STATE: La factura volvió a borrador o cambió de estado. Revisa y aprueba sus datos antes de emitir.'; end if;
  return new;
end $$;
drop trigger if exists tax_documents_invoice_preparation_guard on public.tax_documents;
create trigger tax_documents_invoice_preparation_guard before insert on public.tax_documents
  for each row execute function public.finance_guard_dte_invoice_preparation();
notify pgrst,'reload schema';
