alter table public.invoices add column dte_options jsonb not null default '{}'::jsonb
  check(jsonb_typeof(dte_options)='object');
alter table public.invoice_lines add column item_name varchar(80);
alter table public.invoice_lines add column unit varchar(4);

create function public.finance_guard_invoice_options()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if new.dte_options is distinct from old.dte_options and
    (old.status not in('DRAFT','PENDING_APPROVAL') or exists(
      select 1 from public.tax_documents d where d.invoice_id=old.id
        and (d.status not in('REJECTED','CANCELLED') and d.folio is not null)))
    then raise exception 'DTE_OPTIONS_IMMUTABLE'; end if;
  return new;
end $$;
create trigger invoices_dte_options_guard before update on public.invoices
  for each row execute function public.finance_guard_invoice_options();
revoke all on function public.finance_guard_invoice_options() from public,anon,authenticated;
grant execute on function public.finance_guard_invoice_options() to service_role;
notify pgrst,'reload schema';
