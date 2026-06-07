-- Bootstrap del modulo "Contador Auditor Inteligente"
-- Reutiliza public."Project" como fuente operativa para trazabilidad y
-- agrega el resto de la estructura contable sin duplicar el modelo actual.

create extension if not exists pgcrypto;

create or replace function public.accounting_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.accounting_tax_period(p_date date)
returns text
language sql
immutable
as $$
  select to_char(p_date, 'YYYY-MM');
$$;

create table if not exists public.tax_periods (
  id uuid primary key default gen_random_uuid(),
  period text not null unique,
  declared_in_sii boolean not null default false,
  declared_at timestamptz,
  declared_by uuid,
  locked boolean not null default false,
  f29_document_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tax_periods_period_format_chk check (period ~ '^[0-9]{4}-[0-9]{2}$')
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  name text not null,
  rut text not null,
  email text,
  phone text,
  address text,
  business_activity text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_type_chk check (type in ('CLIENT', 'SUPPLIER', 'BOTH'))
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  category text not null,
  status text not null default 'PENDIENTE',
  tax_period text not null references public.tax_periods(period),
  project_id text references public."Project"(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,
  document_number text,
  document_date date not null,
  due_date date,
  issuer_name text,
  issuer_rut text,
  receiver_name text,
  receiver_rut text,
  description text,
  neto numeric(14,2) not null default 0,
  iva numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  paid_at date,
  payment_method text,
  document_url text,
  document_storage_path text,
  locked boolean not null default false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_type_chk check (type in ('IN', 'OUT')),
  constraint transactions_category_chk check (
    category in (
      'FACTURA_EMITIDA',
      'FACTURA_RECIBIDA',
      'GASTO',
      'F29',
      'HONORARIO',
      'BOLETA',
      'COMPROBANTE',
      'OTRO'
    )
  ),
  constraint transactions_status_chk check (status in ('PENDIENTE', 'PAGADO', 'ANULADO', 'OBSERVADO')),
  constraint transactions_neto_chk check (neto >= 0),
  constraint transactions_iva_chk check (iva >= 0),
  constraint transactions_total_chk check (total >= 0),
  constraint transactions_total_sum_chk check (round(total, 2) = round(neto + iva, 2))
);

create table if not exists public.business_documents (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions(id) on delete cascade,
  project_id text references public."Project"(id) on delete cascade,
  tax_period text references public.tax_periods(period),
  file_name text not null,
  file_type text not null,
  storage_path text not null,
  public_url text,
  document_kind text not null,
  uploaded_by uuid,
  created_at timestamptz not null default now(),
  constraint business_documents_kind_chk check (
    document_kind in (
      'FACTURA_EMITIDA',
      'FACTURA_RECIBIDA',
      'GASTO',
      'F29',
      'COMPROBANTE_PAGO',
      'COTIZACION',
      'OT',
      'RESPALDO'
    )
  )
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  constraint audit_logs_action_chk check (
    action in (
      'INSERT',
      'UPDATE',
      'DELETE',
      'LOCK',
      'DECLARE_F29',
      'UPLOAD_DOCUMENT',
      'MARK_AS_PAID',
      'CANCEL_TRANSACTION'
    )
  )
);

create table if not exists public.smart_alerts (
  id uuid primary key default gen_random_uuid(),
  severity text not null,
  title text not null,
  message text not null,
  module text not null,
  related_table text,
  related_id uuid,
  tax_period text,
  status text not null default 'OPEN',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid,
  constraint smart_alerts_severity_chk check (severity in ('INFO', 'WARNING', 'CRITICAL')),
  constraint smart_alerts_status_chk check (status in ('OPEN', 'RESOLVED'))
);

create index if not exists idx_tax_periods_period on public.tax_periods(period);
create index if not exists idx_tax_periods_declared on public.tax_periods(declared_in_sii, locked);
create unique index if not exists idx_companies_rut on public.companies(rut);
create index if not exists idx_companies_type_active on public.companies(type, active);
create index if not exists idx_transactions_period on public.transactions(tax_period, document_date desc);
create index if not exists idx_transactions_project on public.transactions(project_id);
create index if not exists idx_transactions_company on public.transactions(company_id);
create index if not exists idx_transactions_status_due on public.transactions(status, due_date);
create index if not exists idx_transactions_category on public.transactions(category);
create index if not exists idx_business_documents_period on public.business_documents(tax_period, created_at desc);
create index if not exists idx_business_documents_transaction on public.business_documents(transaction_id);
create index if not exists idx_audit_logs_table_record on public.audit_logs(table_name, record_id, changed_at desc);
create index if not exists idx_smart_alerts_status on public.smart_alerts(status, severity, created_at desc);

drop trigger if exists trg_tax_periods_updated_at on public.tax_periods;
create trigger trg_tax_periods_updated_at
before update on public.tax_periods
for each row
execute function public.accounting_set_updated_at();

drop trigger if exists trg_companies_updated_at on public.companies;
create trigger trg_companies_updated_at
before update on public.companies
for each row
execute function public.accounting_set_updated_at();

drop trigger if exists trg_transactions_updated_at on public.transactions;
create trigger trg_transactions_updated_at
before update on public.transactions
for each row
execute function public.accounting_set_updated_at();

create or replace function public.accounting_prepare_tax_period()
returns trigger
language plpgsql
as $$
declare
  v_period text;
  v_locked boolean;
  v_declared boolean;
begin
  if tg_op = 'UPDATE' and coalesce(old.locked, false) then
    raise exception 'La transaccion esta bloqueada y no puede modificarse.';
  end if;

  new.neto = coalesce(new.neto, 0);
  new.iva = coalesce(new.iva, 0);
  new.total = coalesce(new.total, 0);

  if new.neto < 0 or new.iva < 0 or new.total < 0 then
    raise exception 'Los montos neto, iva y total deben ser mayores o iguales a cero.';
  end if;

  if round(new.total, 2) <> round(new.neto + new.iva, 2) then
    raise exception 'El total debe ser igual a neto + iva.';
  end if;

  v_period := public.accounting_tax_period(new.document_date);
  new.tax_period := v_period;

  insert into public.tax_periods (period)
  values (v_period)
  on conflict (period) do nothing;

  select locked, declared_in_sii
  into v_locked, v_declared
  from public.tax_periods
  where period = v_period;

  if coalesce(v_locked, false) or coalesce(v_declared, false) then
    raise exception 'El periodo tributario % esta bloqueado y no admite cambios.', v_period;
  end if;

  if new.status = 'PAGADO' and new.paid_at is null then
    new.paid_at := current_date;
  end if;

  if new.locked and new.status <> 'ANULADO' then
    new.updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_transactions_prepare_tax_period on public.transactions;
create trigger trg_transactions_prepare_tax_period
before insert or update on public.transactions
for each row
execute function public.accounting_prepare_tax_period();

create or replace function public.accounting_lock_declared_period()
returns trigger
language plpgsql
as $$
begin
  if new.declared_in_sii and not coalesce(old.declared_in_sii, false) then
    new.declared_at := coalesce(new.declared_at, now());
    new.locked := true;
  end if;

  if coalesce(old.locked, false) and new.period <> old.period then
    raise exception 'No se puede cambiar el identificador de un periodo bloqueado.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tax_periods_lock_declared on public.tax_periods;
create trigger trg_tax_periods_lock_declared
before update on public.tax_periods
for each row
execute function public.accounting_lock_declared_period();

create or replace function public.accounting_guard_document_period()
returns trigger
language plpgsql
as $$
declare
  v_locked boolean;
  v_declared boolean;
begin
  if tg_op = 'UPDATE' then
    if exists (
      select 1
      from public.tax_periods
      where period = coalesce(old.tax_period, new.tax_period)
        and (locked or declared_in_sii)
    ) then
      raise exception 'No se pueden modificar documentos de un periodo declarado.';
    end if;
  end if;

  if new.tax_period is not null then
    insert into public.tax_periods (period)
    values (new.tax_period)
    on conflict (period) do nothing;

    select locked, declared_in_sii
    into v_locked, v_declared
    from public.tax_periods
    where period = new.tax_period;

    if coalesce(v_locked, false) or coalesce(v_declared, false) then
      raise exception 'El periodo % esta bloqueado para respaldos documentales.', new.tax_period;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_business_documents_period_guard on public.business_documents;
create trigger trg_business_documents_period_guard
before insert or update on public.business_documents
for each row
execute function public.accounting_guard_document_period();

create or replace function public.accounting_register_audit()
returns trigger
language plpgsql
as $$
declare
  v_record_id uuid;
  v_action text;
begin
  v_action := case
    when tg_op = 'INSERT' then 'INSERT'
    when tg_op = 'UPDATE' then
      case
        when tg_table_name = 'tax_periods'
          and coalesce(new.locked, false)
          and not coalesce(old.locked, false) then 'LOCK'
        when tg_table_name = 'tax_periods'
          and coalesce(new.declared_in_sii, false)
          and not coalesce(old.declared_in_sii, false) then 'DECLARE_F29'
        when tg_table_name = 'transactions'
          and new.status = 'PAGADO'
          and coalesce(old.status, '') <> 'PAGADO' then 'MARK_AS_PAID'
        when tg_table_name = 'transactions'
          and new.status = 'ANULADO'
          and coalesce(old.status, '') <> 'ANULADO' then 'CANCEL_TRANSACTION'
        else 'UPDATE'
      end
    else 'DELETE'
  end;

  v_record_id := coalesce((to_jsonb(new)->>'id')::uuid, (to_jsonb(old)->>'id')::uuid);

  insert into public.audit_logs (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_by
  )
  values (
    tg_table_name,
    v_record_id,
    v_action,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    coalesce((to_jsonb(new)->>'updated_by')::uuid, (to_jsonb(new)->>'created_by')::uuid)
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_tax_periods_audit on public.tax_periods;
create trigger trg_tax_periods_audit
after insert or update or delete on public.tax_periods
for each row
execute function public.accounting_register_audit();

drop trigger if exists trg_companies_audit on public.companies;
create trigger trg_companies_audit
after insert or update or delete on public.companies
for each row
execute function public.accounting_register_audit();

drop trigger if exists trg_transactions_audit on public.transactions;
create trigger trg_transactions_audit
after insert or update or delete on public.transactions
for each row
execute function public.accounting_register_audit();

drop trigger if exists trg_business_documents_audit on public.business_documents;
create trigger trg_business_documents_audit
after insert or update or delete on public.business_documents
for each row
execute function public.accounting_register_audit();

drop trigger if exists trg_smart_alerts_audit on public.smart_alerts;
create trigger trg_smart_alerts_audit
after insert or update or delete on public.smart_alerts
for each row
execute function public.accounting_register_audit();

create or replace function public.mark_tax_period_declared(
  p_period text,
  p_f29_document_url text default null,
  p_notes text default null
)
returns public.tax_periods
language plpgsql
as $$
declare
  v_row public.tax_periods;
begin
  insert into public.tax_periods (period, declared_in_sii, locked, declared_at, f29_document_url, notes)
  values (p_period, true, true, now(), p_f29_document_url, p_notes)
  on conflict (period) do update
    set declared_in_sii = true,
        locked = true,
        declared_at = coalesce(public.tax_periods.declared_at, excluded.declared_at),
        f29_document_url = coalesce(excluded.f29_document_url, public.tax_periods.f29_document_url),
        notes = coalesce(excluded.notes, public.tax_periods.notes),
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

create or replace view public.accounting_monthly_summary as
select
  tp.period,
  tp.declared_in_sii,
  tp.declared_at,
  tp.locked,
  tp.f29_document_url,
  count(t.id) as transactions_count,
  count(*) filter (where t.type = 'IN') as income_count,
  count(*) filter (where t.type = 'OUT') as expense_count,
  coalesce(sum(t.neto) filter (where t.type = 'IN' and t.status <> 'ANULADO'), 0)::numeric(14,2) as income_neto,
  coalesce(sum(t.iva) filter (where t.type = 'IN' and t.status <> 'ANULADO'), 0)::numeric(14,2) as income_iva,
  coalesce(sum(t.total) filter (where t.type = 'IN' and t.status <> 'ANULADO'), 0)::numeric(14,2) as income_total,
  coalesce(sum(t.neto) filter (where t.type = 'OUT' and t.status <> 'ANULADO'), 0)::numeric(14,2) as expense_neto,
  coalesce(sum(t.iva) filter (where t.type = 'OUT' and t.status <> 'ANULADO'), 0)::numeric(14,2) as expense_iva,
  coalesce(sum(t.total) filter (where t.type = 'OUT' and t.status <> 'ANULADO'), 0)::numeric(14,2) as expense_total,
  coalesce(sum(t.iva) filter (where t.type = 'IN' and t.status <> 'ANULADO'), 0)::numeric(14,2) as iva_debito,
  coalesce(sum(t.iva) filter (where t.type = 'OUT' and t.status <> 'ANULADO'), 0)::numeric(14,2) as iva_credito,
  (
    coalesce(sum(t.iva) filter (where t.type = 'IN' and t.status <> 'ANULADO'), 0) -
    coalesce(sum(t.iva) filter (where t.type = 'OUT' and t.status <> 'ANULADO'), 0)
  )::numeric(14,2) as iva_balance,
  coalesce(sum(t.total) filter (where t.status = 'PENDIENTE'), 0)::numeric(14,2) as pending_total,
  coalesce(sum(t.total) filter (where t.status = 'PAGADO'), 0)::numeric(14,2) as paid_total,
  count(*) filter (
    where t.status <> 'ANULADO'
      and coalesce(t.document_url, '') = ''
      and coalesce(t.document_storage_path, '') = ''
  ) as transactions_without_support,
  count(*) filter (
    where t.status <> 'ANULADO'
      and (coalesce(t.document_url, '') <> '' or coalesce(t.document_storage_path, '') <> '')
  ) as transactions_with_support
from public.tax_periods tp
left join public.transactions t
  on t.tax_period = tp.period
group by tp.period, tp.declared_in_sii, tp.declared_at, tp.locked, tp.f29_document_url;

create or replace view public.accounting_project_traceability as
select
  p.id as project_id,
  p."quoteId" as quote_id,
  max(wo.code) as ot_number,
  p."clientId" as client_id,
  coalesce(u.company, u.name) as client_name,
  u.rut as client_rut,
  p.title as project_name,
  coalesce(p.status, 'COTIZADO') as project_status,
  coalesce(p."totalCharge", 0)::numeric(14,2) as estimated_total,
  coalesce(sum(t.total) filter (
    where t.type = 'IN'
      and t.category in ('FACTURA_EMITIDA', 'BOLETA')
      and t.status <> 'ANULADO'
  ), 0)::numeric(14,2) as invoiced_total,
  coalesce(sum(t.total) filter (
    where t.type = 'IN'
      and t.status = 'PAGADO'
  ), 0)::numeric(14,2) as paid_total,
  min(t.document_date) filter (
    where t.type = 'IN'
      and t.status <> 'ANULADO'
  ) as expected_invoice_date,
  count(t.id) as accounting_transactions,
  max(t.tax_period) as last_tax_period,
  p."createdAt" as created_at
from public."Project" p
left join public."User" u
  on u.id = p."clientId"
left join public."WorkOrder" wo
  on wo."quoteId" = p."quoteId"
left join public.transactions t
  on t.project_id = p.id
group by
  p.id,
  p."quoteId",
  p."clientId",
  u.company,
  u.name,
  u.rut,
  p.title,
  p.status,
  p."totalCharge",
  p."createdAt";

create or replace view public.accounting_document_registry as
select
  bd.id,
  bd.transaction_id,
  bd.project_id,
  bd.tax_period,
  bd.file_name,
  bd.file_type,
  bd.storage_path,
  bd.public_url,
  bd.document_kind,
  bd.uploaded_by,
  bd.created_at,
  t.document_number,
  t.document_date,
  t.status as transaction_status,
  t.total as transaction_total,
  p.title as project_name
from public.business_documents bd
left join public.transactions t
  on t.id = bd.transaction_id
left join public."Project" p
  on p.id = bd.project_id;

create or replace view public.accounting_generated_alerts as
select
  'PERIOD_UNDECLARED_' || tp.period as alert_key,
  'WARNING'::text as severity,
  'Periodo pendiente de declaracion'::text as title,
  'El periodo ' || tp.period || ' aun no esta declarado en SII.'::text as message,
  'tax-periods'::text as module,
  'tax_periods'::text as related_table,
  null::uuid as related_id,
  tp.period as tax_period,
  'OPEN'::text as status,
  tp.created_at as created_at
from public.tax_periods tp
where tp.declared_in_sii = false
  and tp.period < to_char(current_date, 'YYYY-MM')

union all

select
  'TX_OVERDUE_' || t.id::text as alert_key,
  'CRITICAL'::text as severity,
  'Documento vencido pendiente de pago'::text as title,
  'El documento ' || coalesce(t.document_number, t.id::text) || ' esta vencido y sigue pendiente.'::text as message,
  'transactions'::text as module,
  'transactions'::text as related_table,
  t.id as related_id,
  t.tax_period,
  'OPEN'::text as status,
  t.created_at
from public.transactions t
where t.status = 'PENDIENTE'
  and t.due_date is not null
  and t.due_date < current_date

union all

select
  'TX_SUPPORT_' || t.id::text as alert_key,
  'WARNING'::text as severity,
  'Documento sin respaldo adjunto'::text as title,
  'La transaccion ' || coalesce(t.document_number, t.id::text) || ' no tiene archivo de respaldo.'::text as message,
  'documents'::text as module,
  'transactions'::text as related_table,
  t.id as related_id,
  t.tax_period,
  'OPEN'::text as status,
  t.created_at
from public.transactions t
where t.status <> 'ANULADO'
  and coalesce(t.document_url, '') = ''
  and coalesce(t.document_storage_path, '') = ''
  and t.category in ('FACTURA_EMITIDA', 'FACTURA_RECIBIDA', 'GASTO', 'HONORARIO', 'F29')

union all

select
  'SMART_' || sa.id::text as alert_key,
  sa.severity,
  sa.title,
  sa.message,
  sa.module,
  sa.related_table,
  sa.related_id,
  sa.tax_period,
  sa.status,
  sa.created_at
from public.smart_alerts sa
where sa.status = 'OPEN';

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.tax_periods to anon, authenticated;
grant select, insert, update, delete on public.companies to anon, authenticated;
grant select, insert, update, delete on public.transactions to anon, authenticated;
grant select, insert, update, delete on public.business_documents to anon, authenticated;
grant select, insert, update, delete on public.audit_logs to anon, authenticated;
grant select, insert, update, delete on public.smart_alerts to anon, authenticated;
grant select on public.accounting_monthly_summary to anon, authenticated;
grant select on public.accounting_project_traceability to anon, authenticated;
grant select on public.accounting_document_registry to anon, authenticated;
grant select on public.accounting_generated_alerts to anon, authenticated;

alter table public.tax_periods disable row level security;
alter table public.companies disable row level security;
alter table public.transactions disable row level security;
alter table public.business_documents disable row level security;
alter table public.audit_logs disable row level security;
alter table public.smart_alerts disable row level security;

insert into storage.buckets (id, name, public)
values ('accounting-documents', 'accounting-documents', true)
on conflict (id) do nothing;

grant usage on schema storage to anon, authenticated;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        policyname like 'accounting_bucket_%'
        or coalesce(qual, '') like '%accounting-documents%'
        or coalesce(with_check, '') like '%accounting-documents%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects;', policy_record.policyname);
  end loop;
end
$$;

create policy accounting_bucket_public_read
on storage.objects
for select
to public
using (bucket_id = 'accounting-documents');

create policy accounting_bucket_public_insert
on storage.objects
for insert
to public
with check (bucket_id = 'accounting-documents');

create policy accounting_bucket_public_update
on storage.objects
for update
to public
using (bucket_id = 'accounting-documents')
with check (bucket_id = 'accounting-documents');

create policy accounting_bucket_public_delete
on storage.objects
for delete
to public
using (bucket_id = 'accounting-documents');

notify pgrst, 'reload schema';
