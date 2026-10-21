-- El medio declarado en la boleta describe el documento; no confirma un movimiento de pago.
alter table public.invoices add column boleta_payment_method smallint
  check(boleta_payment_method between 1 and 5);
alter table public.tax_documents add column boleta_payment_method smallint
  check(boleta_payment_method between 1 and 5);

create function public.finance_guard_boleta_payment()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if tg_table_name='invoices' then
    if old.status in('ISSUING','ISSUED','PARTIALLY_PAID','PAID','CREDITED','VOID')
      and new.boleta_payment_method is distinct from old.boleta_payment_method
      then raise exception 'DTE_PAYMENT_METHOD_IMMUTABLE'; end if;
    if new.status='ISSUING' and new.document_type_code in(39,41) and
      (new.boleta_payment_method is null or not exists(select 1 from public.tax_documents d
        where d.id=new.tax_document_id and d.invoice_id=new.id and d.boleta_payment_method=new.boleta_payment_method))
      then raise exception 'DTE_PAYMENT_METHOD_MISMATCH'; end if;
  elsif old.boleta_payment_method is distinct from new.boleta_payment_method and
      (old.status not in('DRAFT','VALIDATED') or exists(select 1 from public.tax_document_transmissions t where t.tax_document_id=old.id))
    then raise exception 'DTE_PAYMENT_METHOD_IMMUTABLE';
  end if;
  return new;
end $$;
create trigger invoices_boleta_payment_guard before update on public.invoices
  for each row execute function public.finance_guard_boleta_payment();
create trigger tax_documents_boleta_payment_guard before update on public.tax_documents
  for each row execute function public.finance_guard_boleta_payment();
revoke all on function public.finance_guard_boleta_payment() from public,anon,authenticated;
grant execute on function public.finance_guard_boleta_payment() to service_role;

notify pgrst,'reload schema';
