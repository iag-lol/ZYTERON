-- Zyteron · Operación 360°, cobranza y hardening
-- Ejecutar UNA VEZ después de los bootstrap históricos.
-- Es idempotente: puede volver a ejecutarse para reaplicar permisos seguros.

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Expediente operativo: lead → cotización → OT → proyecto → factura → cierre
-- ---------------------------------------------------------------------------

create table if not exists public."ClientProcess" (
  id text primary key default gen_random_uuid()::text,
  code text not null unique,
  "clientId" text references public."User"(id) on delete restrict,
  title text not null,
  stage text not null default 'INTAKE',
  status text not null default 'ACTIVE',
  outcome text,
  priority text not null default 'NORMAL',
  owner text,
  "requiresInitialPayment" boolean not null default true,
  "nextAction" text,
  "nextActionAt" timestamptz,
  "blockedReason" text,
  "lostReason" text,
  "cancelReason" text,
  version integer not null default 1,
  "startedAt" timestamptz not null default now(),
  "closedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint client_process_stage_check check (stage in (
    'INTAKE', 'QUALIFICATION', 'DISCOVERY', 'PROPOSAL', 'QUOTE_SENT',
    'NEGOTIATION', 'APPROVED', 'INITIAL_PAYMENT', 'WORK_ORDER', 'PLANNING',
    'IN_PROGRESS', 'CLIENT_REVIEW', 'DELIVERY', 'INVOICING', 'COLLECTION', 'CLOSED'
  )),
  constraint client_process_status_check check (status in ('ACTIVE', 'ON_HOLD', 'CLOSED', 'CANCELLED')),
  constraint client_process_outcome_check check (outcome is null or outcome in ('WON', 'LOST')),
  constraint client_process_priority_check check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT'))
);

create table if not exists public."ClientProcessEvent" (
  id text primary key default gen_random_uuid()::text,
  "processId" text not null references public."ClientProcess"(id) on delete cascade,
  "actorId" text references public."User"(id) on delete set null,
  "eventType" text not null,
  "fromStage" text,
  "toStage" text,
  title text not null,
  notes text,
  metadata jsonb,
  "createdAt" timestamptz not null default now()
);

alter table public."ClientProcess" add column if not exists outcome text;
alter table public."ClientProcess" add column if not exists "requiresInitialPayment" boolean not null default true;
alter table public."ClientProcess" add column if not exists "blockedReason" text;
alter table public."ClientProcess" add column if not exists "lostReason" text;
alter table public."ClientProcess" add column if not exists "cancelReason" text;
alter table public."ClientProcess" add column if not exists version integer not null default 1;

alter table if exists public."Lead" add column if not exists "processId" text;
alter table if exists public."Quote" add column if not exists "processId" text;
alter table if exists public."WorkOrder" add column if not exists "processId" text;
alter table if exists public."WorkOrder" add column if not exists "projectId" text;
alter table if exists public."Project" add column if not exists "processId" text;
alter table if exists public."Sale" add column if not exists "processId" text;
alter table if exists public."TaxDocument" add column if not exists "processId" text;

do $$
declare
  item record;
  constraint_name text;
begin
  for item in
    select * from (values
      ('Lead', 'Lead_processId_fkey'),
      ('Quote', 'Quote_processId_fkey'),
      ('WorkOrder', 'WorkOrder_processId_fkey'),
      ('Project', 'Project_processId_fkey'),
      ('Sale', 'Sale_processId_fkey'),
      ('TaxDocument', 'TaxDocument_processId_fkey')
    ) as links(table_name, fk_name)
  loop
    constraint_name := item.fk_name;
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = item.table_name
    ) and not exists (
      select 1 from pg_constraint where conname = constraint_name
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key ("processId") references public."ClientProcess"(id) on delete set null',
        item.table_name,
        constraint_name
      );
    end if;
  end loop;
end
$$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'WorkOrder_quoteId_fkey') then
    alter table public."WorkOrder" add constraint "WorkOrder_quoteId_fkey"
      foreign key ("quoteId") references public."Quote"(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'WorkOrder_saleId_fkey') then
    alter table public."WorkOrder" add constraint "WorkOrder_saleId_fkey"
      foreign key ("saleId") references public."Sale"(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'WorkOrder_projectId_fkey') then
    alter table public."WorkOrder" add constraint "WorkOrder_projectId_fkey"
      foreign key ("projectId") references public."Project"(id) on delete set null;
  end if;
end
$$;

create index if not exists "ClientProcess_clientId_status_stage_idx"
  on public."ClientProcess"("clientId", status, stage);
create index if not exists "ClientProcess_stage_nextActionAt_idx"
  on public."ClientProcess"(stage, "nextActionAt");
create index if not exists "ClientProcessEvent_processId_createdAt_idx"
  on public."ClientProcessEvent"("processId", "createdAt" desc);
create index if not exists "ClientProcessEvent_eventType_createdAt_idx"
  on public."ClientProcessEvent"("eventType", "createdAt" desc);
create index if not exists idx_lead_process on public."Lead"("processId");
create index if not exists idx_quote_process on public."Quote"("processId");
create index if not exists idx_workorder_process on public."WorkOrder"("processId");
create index if not exists idx_workorder_project on public."WorkOrder"("projectId");
create index if not exists idx_workorder_quote on public."WorkOrder"("quoteId");
create index if not exists idx_workorder_sale on public."WorkOrder"("saleId");
create index if not exists idx_project_process on public."Project"("processId");
create index if not exists idx_sale_process on public."Sale"("processId");
create index if not exists idx_taxdocument_process on public."TaxDocument"("processId");

-- ---------------------------------------------------------------------------
-- 2. Libro de cuentas por cobrar, pagos reales y asignaciones parciales
-- ---------------------------------------------------------------------------

create table if not exists public."Receivable" (
  id text primary key default gen_random_uuid()::text,
  "sourceKey" text not null unique,
  "clientId" text not null references public."User"(id) on delete restrict,
  "processId" text references public."ClientProcess"(id) on delete set null,
  "quoteId" text references public."Quote"(id) on delete set null,
  "saleId" text references public."Sale"(id) on delete set null,
  "taxDocumentId" text references public."TaxDocument"(id) on delete set null,
  "projectId" text references public."Project"(id) on delete set null,
  description text not null,
  kind text not null default 'MANUAL',
  "quoteStageKey" text,
  currency text not null default 'CLP',
  "totalAmount" integer not null,
  status text not null default 'PENDING',
  "issuedAt" timestamptz not null default now(),
  "dueAt" timestamptz,
  "closedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  metadata jsonb,
  constraint receivable_total_positive check ("totalAmount" > 0),
  constraint receivable_currency_check check (currency = 'CLP'),
  constraint receivable_kind_check check (kind in ('QUOTE_STAGE', 'INVOICE', 'SUBSCRIPTION_CYCLE', 'MANUAL')),
  constraint receivable_status_check check (status in ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'))
);

create table if not exists public."Payment" (
  id text primary key default gen_random_uuid()::text,
  "clientId" text not null references public."User"(id) on delete restrict,
  "processId" text references public."ClientProcess"(id) on delete set null,
  amount integer not null,
  currency text not null default 'CLP',
  method text not null,
  source text not null default 'MANUAL',
  status text not null default 'PENDING',
  reference text,
  provider text,
  "providerPaymentId" text,
  "commerceOrder" text,
  "idempotencyKey" text unique,
  "receivedAt" timestamptz not null default now(),
  notes text,
  "proofUrl" text,
  metadata jsonb,
  "recordedById" text references public."User"(id) on delete set null,
  "voidedAt" timestamptz,
  "voidReason" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint payment_amount_positive check (amount > 0),
  constraint payment_currency_check check (currency = 'CLP'),
  constraint payment_status_check check (status in ('PENDING', 'CONFIRMED', 'VOIDED', 'REFUNDED')),
  constraint payment_void_consistency check (
    (status = 'VOIDED' and "voidedAt" is not null and length(trim(coalesce("voidReason", ''))) >= 3)
    or status <> 'VOIDED'
  )
);

create unique index if not exists "Payment_provider_providerPaymentId_key"
  on public."Payment"(provider, "providerPaymentId")
  where provider is not null and "providerPaymentId" is not null;
create unique index if not exists "Payment_provider_commerceOrder_key"
  on public."Payment"(provider, "commerceOrder")
  where provider is not null and "commerceOrder" is not null;

create table if not exists public."PaymentAllocation" (
  id text primary key default gen_random_uuid()::text,
  "paymentId" text not null references public."Payment"(id) on delete restrict,
  "receivableId" text not null references public."Receivable"(id) on delete restrict,
  amount integer not null,
  notes text,
  "createdAt" timestamptz not null default now(),
  constraint payment_allocation_amount_positive check (amount > 0),
  constraint "PaymentAllocation_paymentId_receivableId_key" unique ("paymentId", "receivableId")
);

alter table public."Receivable" add column if not exists "sourceKey" text;
alter table public."Receivable" add column if not exists kind text not null default 'MANUAL';
alter table public."Receivable" add column if not exists "quoteStageKey" text;
alter table public."Receivable" add column if not exists metadata jsonb;
alter table public."Payment" add column if not exists "commerceOrder" text;
alter table public."Payment" add column if not exists metadata jsonb;

update public."Receivable"
set "sourceKey" = coalesce("sourceKey", 'legacy:' || id)
where "sourceKey" is null;
alter table public."Receivable" alter column "sourceKey" set not null;
create unique index if not exists "Receivable_sourceKey_key" on public."Receivable"("sourceKey");

create index if not exists "Receivable_clientId_status_dueAt_idx"
  on public."Receivable"("clientId", status, "dueAt");
create index if not exists "Receivable_processId_idx" on public."Receivable"("processId");
create index if not exists "Receivable_quoteId_idx" on public."Receivable"("quoteId");
create index if not exists "Receivable_saleId_idx" on public."Receivable"("saleId");
create index if not exists "Receivable_taxDocumentId_idx" on public."Receivable"("taxDocumentId");
create index if not exists "Receivable_projectId_idx" on public."Receivable"("projectId");
create index if not exists "Payment_clientId_status_receivedAt_idx"
  on public."Payment"("clientId", status, "receivedAt" desc);
create index if not exists "Payment_processId_idx" on public."Payment"("processId");
create index if not exists "Payment_reference_idx" on public."Payment"(reference);
create index if not exists "PaymentAllocation_receivableId_createdAt_idx"
  on public."PaymentAllocation"("receivableId", "createdAt" desc);

create or replace function public.validate_payment_allocation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_client text;
  payment_total integer;
  receivable_client text;
  receivable_total integer;
  allocated_from_payment bigint;
  allocated_to_receivable bigint;
begin
  select "clientId", amount into payment_client, payment_total
  from public."Payment" where id = new."paymentId" for update;

  select "clientId", "totalAmount" into receivable_client, receivable_total
  from public."Receivable" where id = new."receivableId" for update;

  if payment_client is null or receivable_client is null then
    raise exception 'Pago o cuenta por cobrar inexistente';
  end if;
  if payment_client <> receivable_client then
    raise exception 'El pago y la cuenta por cobrar pertenecen a clientes diferentes';
  end if;

  select coalesce(sum(amount), 0) into allocated_from_payment
  from public."PaymentAllocation"
  where "paymentId" = new."paymentId" and id <> new.id;

  if allocated_from_payment + new.amount > payment_total then
    raise exception 'La asignación supera el monto recibido';
  end if;

  select coalesce(sum(pa.amount), 0) into allocated_to_receivable
  from public."PaymentAllocation" pa
  join public."Payment" p on p.id = pa."paymentId" and p.status = 'CONFIRMED'
  where pa."receivableId" = new."receivableId" and pa.id <> new.id;

  if (select status from public."Payment" where id = new."paymentId") = 'CONFIRMED'
     and allocated_to_receivable + new.amount > receivable_total then
    raise exception 'La asignación supera el saldo de la cuenta por cobrar';
  end if;

  return new;
end
$$;

drop trigger if exists trg_validate_payment_allocation on public."PaymentAllocation";
create trigger trg_validate_payment_allocation
before insert or update on public."PaymentAllocation"
for each row execute function public.validate_payment_allocation();

create or replace function public.refresh_tax_document_payment_status(target_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_amount bigint;
  paid_amount bigint;
  has_overdue boolean;
begin
  if target_id is null then return; end if;

  select
    coalesce(sum(r."totalAmount"), 0),
    coalesce(sum(least(r."totalAmount", coalesce(paid.amount, 0))), 0),
    coalesce(bool_or(r."dueAt" is not null and r."dueAt" < now()
      and coalesce(paid.amount, 0) < r."totalAmount"), false)
  into total_amount, paid_amount, has_overdue
  from public."Receivable" r
  left join lateral (
    select sum(pa.amount)::bigint as amount
    from public."PaymentAllocation" pa
    join public."Payment" p on p.id = pa."paymentId" and p.status = 'CONFIRMED'
    where pa."receivableId" = r.id
  ) paid on true
  where r."taxDocumentId" = target_id and r.status <> 'CANCELLED';

  update public."TaxDocument"
  set "paymentStatus" = case
    when total_amount > 0 and paid_amount >= total_amount then 'Pagada'
    when paid_amount > 0 then 'Parcial'
    when has_overdue then 'Vencida'
    else 'Pendiente'
  end
  where id = target_id;
end
$$;

create or replace function public.refresh_receivable_status(target_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  paid_amount bigint;
  total_amount integer;
  due_at timestamptz;
  tax_document_id text;
  next_status text;
begin
  select "totalAmount", "dueAt", "taxDocumentId"
  into total_amount, due_at, tax_document_id
  from public."Receivable" where id = target_id;
  if not found then return; end if;

  select coalesce(sum(pa.amount), 0) into paid_amount
  from public."PaymentAllocation" pa
  join public."Payment" p on p.id = pa."paymentId"
  where pa."receivableId" = target_id and p.status = 'CONFIRMED';

  next_status := case
    when paid_amount >= total_amount then 'PAID'
    when paid_amount > 0 then 'PARTIAL'
    when due_at is not null and due_at < now() then 'OVERDUE'
    else 'PENDING'
  end;

  update public."Receivable"
  set status = next_status,
      "closedAt" = case when next_status = 'PAID' then coalesce("closedAt", now()) else null end,
      "updatedAt" = now()
  where id = target_id and status <> 'CANCELLED';

  perform public.refresh_tax_document_payment_status(tax_document_id);
end
$$;

create or replace function public.payment_allocation_refresh_trigger()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_receivable_status(old."receivableId");
    return old;
  end if;
  perform public.refresh_receivable_status(new."receivableId");
  if tg_op = 'UPDATE' and old."receivableId" <> new."receivableId" then
    perform public.refresh_receivable_status(old."receivableId");
  end if;
  return new;
end
$$;

drop trigger if exists trg_payment_allocation_refresh on public."PaymentAllocation";
create trigger trg_payment_allocation_refresh
after insert or update or delete on public."PaymentAllocation"
for each row execute function public.payment_allocation_refresh_trigger();

create or replace function public.validate_payment_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allocation record;
  receivable_total integer;
  already_confirmed bigint;
begin
  if new.status = 'CONFIRMED' and old.status is distinct from new.status then
    for allocation in
      select "receivableId", sum(amount)::bigint as amount
      from public."PaymentAllocation"
      where "paymentId" = new.id
      group by "receivableId"
    loop
      select "totalAmount" into receivable_total
      from public."Receivable"
      where id = allocation."receivableId"
      for update;

      select coalesce(sum(pa.amount), 0) into already_confirmed
      from public."PaymentAllocation" pa
      join public."Payment" p on p.id = pa."paymentId" and p.status = 'CONFIRMED'
      where pa."receivableId" = allocation."receivableId"
        and pa."paymentId" <> new.id;

      if already_confirmed + allocation.amount > receivable_total then
        raise exception 'La confirmación del pago supera el saldo de la cuenta por cobrar';
      end if;
    end loop;
  end if;
  return new;
end
$$;

drop trigger if exists trg_validate_payment_confirmation on public."Payment";
create trigger trg_validate_payment_confirmation
before update of status on public."Payment"
for each row execute function public.validate_payment_confirmation();

create or replace function public.payment_status_refresh_trigger()
returns trigger language plpgsql as $$
declare allocation record;
begin
  if old.status is distinct from new.status then
    for allocation in
      select distinct "receivableId" from public."PaymentAllocation" where "paymentId" = new.id
    loop
      perform public.refresh_receivable_status(allocation."receivableId");
    end loop;
  end if;
  return new;
end
$$;

drop trigger if exists trg_payment_status_refresh on public."Payment";
create trigger trg_payment_status_refresh
after update of status on public."Payment"
for each row execute function public.payment_status_refresh_trigger();

create or replace view public.billing_receivable_balances
with (security_invoker = true)
as
select
  r.id,
  r."clientId" as client_id,
  r."processId" as process_id,
  r."quoteId" as quote_id,
  r."saleId" as sale_id,
  r."taxDocumentId" as tax_document_id,
  r.description,
  r."totalAmount" as total_amount,
  coalesce(sum(pa.amount) filter (where p.status = 'CONFIRMED'), 0)::bigint as paid_amount,
  greatest(r."totalAmount" - coalesce(sum(pa.amount) filter (where p.status = 'CONFIRMED'), 0), 0)::bigint as balance_due,
  case
    when r.status = 'CANCELLED' then 'CANCELLED'
    when coalesce(sum(pa.amount) filter (where p.status = 'CONFIRMED'), 0) >= r."totalAmount" then 'PAID'
    when coalesce(sum(pa.amount) filter (where p.status = 'CONFIRMED'), 0) > 0 then 'PARTIAL'
    when r."dueAt" is not null and r."dueAt" < now() then 'OVERDUE'
    else 'UNPAID'
  end as derived_status,
  r."dueAt" as due_at
from public."Receivable" r
left join public."PaymentAllocation" pa on pa."receivableId" = r.id
left join public."Payment" p on p.id = pa."paymentId"
group by r.id;

create or replace view public.payment_available_balances
with (security_invoker = true)
as
select
  p.id,
  p."clientId" as client_id,
  p."processId" as process_id,
  p.amount,
  coalesce(sum(pa.amount), 0)::bigint as allocated_amount,
  greatest(p.amount - coalesce(sum(pa.amount), 0), 0)::bigint as available_amount,
  p.status,
  p."receivedAt" as received_at
from public."Payment" p
left join public."PaymentAllocation" pa on pa."paymentId" = p.id
group by p.id;

create or replace view public.client_billing_summary
with (security_invoker = true)
as
select
  u.id as client_id,
  coalesce(receivables.total_billed, 0)::bigint as total_billed,
  coalesce(receivables.total_paid, 0)::bigint as total_paid,
  coalesce(receivables.total_pending, 0)::bigint as total_pending,
  coalesce(receivables.total_overdue, 0)::bigint as total_overdue,
  coalesce(credits.available_credit, 0)::bigint as available_credit
from public."User" u
left join lateral (
  select
    sum(brb.total_amount) as total_billed,
    sum(brb.paid_amount) as total_paid,
    sum(brb.balance_due) as total_pending,
    sum(brb.balance_due) filter (where brb.derived_status = 'OVERDUE') as total_overdue
  from public.billing_receivable_balances brb
  where brb.client_id = u.id and brb.derived_status <> 'CANCELLED'
) receivables on true
left join lateral (
  select sum(pab.available_amount) as available_credit
  from public.payment_available_balances pab
  where pab.client_id = u.id and pab.status = 'CONFIRMED'
) credits on true
where u.role = 'CLIENT';

revoke all privileges on public.billing_receivable_balances from public, anon, authenticated;
revoke all privileges on public.payment_available_balances from public, anon, authenticated;
revoke all privileges on public.client_billing_summary from public, anon, authenticated;
grant select on public.billing_receivable_balances to service_role;
grant select on public.payment_available_balances to service_role;
grant select on public.client_billing_summary to service_role;

-- Backfill conservador: solo documentos tributarios existentes generan deuda.
-- No se inventan pagos a partir de Quote.WON, porque WON no prueba recepción.
insert into public."Receivable" (
  id, "sourceKey", "clientId", "processId", "quoteId", "saleId", "taxDocumentId",
  "projectId", description, kind, currency, "totalAmount", status, "issuedAt", "dueAt"
)
select
  gen_random_uuid()::text,
  'tax-document:' || td.id,
  td."clientId",
  td."processId",
  td."quoteId",
  td."saleId",
  td.id,
  td."projectId",
  trim(concat_ws(' ', td.type, td."documentNumber")),
  'INVOICE',
  'CLP',
  td."totalAmount",
  'PENDING',
  coalesce(td."issueDate"::timestamptz, td."createdAt"),
  td."dueDate"::timestamptz
from public."TaxDocument" td
where td."clientId" is not null
  and coalesce(td."totalAmount", 0) > 0
on conflict ("sourceKey") do update
set "taxDocumentId" = excluded."taxDocumentId",
    "quoteId" = coalesce(public."Receivable"."quoteId", excluded."quoteId"),
    "saleId" = coalesce(public."Receivable"."saleId", excluded."saleId"),
    "projectId" = coalesce(public."Receivable"."projectId", excluded."projectId"),
    "totalAmount" = greatest(public."Receivable"."totalAmount", excluded."totalAmount"),
    "updatedAt" = now();

-- ---------------------------------------------------------------------------
-- 3. Documentos privados y vinculados al expediente
-- ---------------------------------------------------------------------------

alter table if exists public."ClientDocument" add column if not exists "storagePath" text;
alter table if exists public."ClientDocument" add column if not exists "projectId" text;
alter table if exists public."ClientDocument" add column if not exists "quoteId" text;
alter table if exists public."ClientDocument" add column if not exists "taxDocumentId" text;
alter table if exists public."ClientDocument" add column if not exists "processId" text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ClientDocument_projectId_fkey') then
    alter table public."ClientDocument" add constraint "ClientDocument_projectId_fkey"
      foreign key ("projectId") references public."Project"(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ClientDocument_quoteId_fkey') then
    alter table public."ClientDocument" add constraint "ClientDocument_quoteId_fkey"
      foreign key ("quoteId") references public."Quote"(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ClientDocument_taxDocumentId_fkey') then
    alter table public."ClientDocument" add constraint "ClientDocument_taxDocumentId_fkey"
      foreign key ("taxDocumentId") references public."TaxDocument"(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ClientDocument_processId_fkey') then
    alter table public."ClientDocument" add constraint "ClientDocument_processId_fkey"
      foreign key ("processId") references public."ClientProcess"(id) on delete set null;
  end if;
end
$$;

create index if not exists "ClientDocument_projectId_createdAt_idx" on public."ClientDocument"("projectId", "createdAt" desc);
create index if not exists "ClientDocument_quoteId_createdAt_idx" on public."ClientDocument"("quoteId", "createdAt" desc);
create index if not exists "ClientDocument_taxDocumentId_createdAt_idx" on public."ClientDocument"("taxDocumentId", "createdAt" desc);
create index if not exists "ClientDocument_processId_createdAt_idx" on public."ClientDocument"("processId", "createdAt" desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-files',
  'client-files',
  false,
  20971520,
  array['application/pdf', 'image/png', 'image/jpeg', 'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

update storage.buckets
set public = false
where id in ('payment-proofs', 'accounting-documents', 'expense-documents');

do $$
declare policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        coalesce(qual, '') ~ '(client-files|payment-proofs|accounting-documents|expense-documents)'
        or coalesce(with_check, '') ~ '(client-files|payment-proofs|accounting-documents|expense-documents)'
        or policyname ~ '(accounting_bucket_|expense_bucket_|payment.*proof|client.*file)'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', policy_record.policyname);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 4. Hardening: PostgREST público nunca administra CRM, finanzas ni PII.
-- La aplicación accede desde servidor con service role o Prisma/NextAuth.
-- ---------------------------------------------------------------------------

do $$
declare
  target_table text;
  policy_record record;
begin
  foreach target_table in array array[
    'User', 'Session', 'Lead', 'Quote', 'Sale', 'Project', 'WorkOrder',
    'ClientRequest', 'TaxDocument', 'ClientDocument', 'SupportTicket',
    'SupportTicketMessage', 'ClientCredential', 'ClientNotification',
    'ClientCommunication', 'PortalRequest', 'ClientAuditLog', 'ClientProcess',
    'ClientProcessEvent', 'Receivable', 'Payment', 'PaymentAllocation', 'Expense',
    'WebVisit', 'ClientReview',
    'tax_periods', 'companies', 'transactions', 'business_documents',
    'audit_logs', 'smart_alerts', 'whatsapp_conversations', 'whatsapp_messages',
    'whatsapp_notes', 'whatsapp_quick_replies'
  ] loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and information_schema.tables.table_name = target_table
    ) then
      execute format('alter table public.%I enable row level security', target_table);
      execute format('revoke all privileges on table public.%I from anon, authenticated', target_table);
      execute format('grant all privileges on table public.%I to service_role', target_table);

      for policy_record in
        select policyname from pg_policies
        where schemaname = 'public' and pg_policies.tablename = target_table
      loop
        execute format('drop policy if exists %I on public.%I', policy_record.policyname, target_table);
      end loop;
    end if;
  end loop;
end
$$;

-- WebVisit y ClientReview quedan incluidos en el bloque dinámico anterior.
-- Si alguna tabla no existe en una instalación, se omite sin abortar la migración.

notify pgrst, 'reload schema';

commit;
