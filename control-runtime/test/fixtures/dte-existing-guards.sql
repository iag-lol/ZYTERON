-- Protecciones existentes del esquema financiero; verificación de compatibilidad sin datos reales.
alter table invoices add client_id uuid,add reference_invoice_id uuid,add updated_at timestamptz;
alter table tax_documents add updated_at timestamptz;
CREATE OR REPLACE FUNCTION public.finance_folio_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if tg_op='DELETE' then raise exception 'FINANCE_IMMUTABLE: los folios no se eliminan'; end if;
  if old.status in('USED','VOIDED') and new.status<>old.status then raise exception 'FINANCE_FOLIO: un folio usado o anulado nunca se reutiliza'; end if;
  if old.folio<>new.folio or old.document_type_code<>new.document_type_code or old.environment<>new.environment then raise exception 'FINANCE_IMMUTABLE: identidad de folio inmutable'; end if;
  return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.finance_invoice_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if tg_op='DELETE' then raise exception 'FINANCE_IMMUTABLE: las facturas no se eliminan; cancela el borrador o emite nota de crédito'; end if;
  if old.status in('ISSUING','ISSUED','PARTIALLY_PAID','PAID','CREDITED','VOID') and
     (new.client_id,new.document_type_code,new.net_amount,new.exempt_amount,new.tax_amount,new.total_amount,new.issue_date,new.client_snapshot,new.reference_invoice_id,new.currency)
     is distinct from (old.client_id,old.document_type_code,old.net_amount,old.exempt_amount,old.tax_amount,old.total_amount,old.issue_date,old.client_snapshot,old.reference_invoice_id,old.currency) then
    raise exception 'FINANCE_IMMUTABLE: un documento en emisión o emitido no se edita; usa nota de crédito o débito';
  end if;
  if old.status in('CANCELLED','VOID') and new.status<>old.status then raise exception 'FINANCE_STATE: documento anulado'; end if;
  new.updated_at:=now();
  return new;
end $function$
;
CREATE OR REPLACE FUNCTION public.finance_tax_document_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if tg_op='DELETE' then raise exception 'FINANCE_IMMUTABLE: los documentos tributarios no se eliminan'; end if;
  if old.status in('ACCEPTED','ACCEPTED_WITH_REPAIRS','REJECTED') and (new.folio,new.total_amount,new.xml_signed_sha256) is distinct from (old.folio,old.total_amount,old.xml_signed_sha256) then
    raise exception 'FINANCE_IMMUTABLE: un DTE resuelto por el SII es inmutable';
  end if;
  new.updated_at:=now();
  return new;
end $function$
;
create trigger invoices_guard before update on invoices for each row execute function finance_invoice_guard();
create trigger tax_documents_guard before update on tax_documents for each row execute function finance_tax_document_guard();
create trigger tax_folios_guard before update on tax_folios for each row execute function finance_folio_guard();
