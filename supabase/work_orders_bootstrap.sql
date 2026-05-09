-- Zyteron · WorkOrder bootstrap
-- Ejecutar en Supabase SQL Editor una sola vez.

create extension if not exists pgcrypto;

create table if not exists "WorkOrder" (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  source text not null default 'MANUAL_QUOTE' check (source in ('MANUAL_QUOTE', 'WEB_ORDER')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED')),
  priority text not null default 'NORMAL' check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  "quoteId" text null references "Quote"(id) on delete set null,
  "saleId" text null references "Sale"(id) on delete set null,
  "clientId" text null references "User"(id) on delete set null,
  title text not null,
  description text null,
  scope jsonb not null default '[]'::jsonb,
  "plannedDate" date null,
  "dueDate" date null,
  "estimatedHours" integer null,
  "actualHours" integer null,
  budget integer null,
  "assignedTo" text null,
  notes text null,
  "pdfUrl" text null,
  "createdBy" text null,
  "completedAt" timestamptz null,
  "closedAt" timestamptz null,
  "cancelledAt" timestamptz null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists workorder_quote_idx on "WorkOrder" ("quoteId");
create index if not exists workorder_sale_idx on "WorkOrder" ("saleId");
create index if not exists workorder_client_idx on "WorkOrder" ("clientId");
create index if not exists workorder_source_status_idx on "WorkOrder" (source, status);
create index if not exists workorder_createdat_idx on "WorkOrder" ("createdAt" desc);

create or replace function public.set_workorder_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

drop trigger if exists trg_workorder_updated_at on "WorkOrder";
create trigger trg_workorder_updated_at
before update on "WorkOrder"
for each row
execute function public.set_workorder_updated_at();

-- Evita duplicar OT por misma cotización cuando no está cancelada.
create unique index if not exists workorder_unique_open_quote_idx
on "WorkOrder" ("quoteId", source)
where "quoteId" is not null and status <> 'CANCELLED';
