-- Zyteron admin / CRM / SII bootstrap for Supabase PostgreSQL
-- Ejecuta este archivo en SQL Editor de Supabase antes de usar
-- los módulos de clientes, proyectos, solicitudes, SII y PDF storage.

alter table if exists public."User"
  add column if not exists "rut" text,
  add column if not exists "contactName" text,
  add column if not exists "industry" text,
  add column if not exists "tier" text,
  add column if not exists "notes" text;

create table if not exists public."Visit" (
  id text primary key,
  "clientId" text references public."User"(id) on delete set null,
  date timestamptz,
  notes text,
  status text,
  "createdAt" timestamptz default now()
);

create table if not exists public."Sale" (
  id text primary key,
  "clientId" text references public."User"(id) on delete set null,
  total integer not null default 0,
  description text,
  "paymentMethod" text,
  "invoiceRef" text,
  "createdAt" timestamptz default now()
);

create table if not exists public."Project" (
  id text primary key,
  "clientId" text references public."User"(id) on delete set null,
  "quoteId" text references public."Quote"(id) on delete set null,
  "saleId" text references public."Sale"(id) on delete set null,
  title text not null,
  "serviceArea" text,
  status text,
  priority text,
  "startDate" date,
  "startTime" text,
  "endDate" date,
  "endTime" text,
  description text,
  scope text,
  "hourlyRate" integer default 0,
  "estimatedHours" integer default 0,
  "actualHours" integer default 0,
  "totalCharge" integer default 0,
  owner text,
  "createdAt" timestamptz default now()
);

create table if not exists public."ClientRequest" (
  id text primary key,
  "clientId" text references public."User"(id) on delete set null,
  "projectId" text references public."Project"(id) on delete set null,
  subject text not null,
  channel text,
  priority text,
  status text,
  description text,
  "dueDate" date,
  "createdAt" timestamptz default now()
);

create table if not exists public."TaxDocument" (
  id text primary key,
  "clientId" text references public."User"(id) on delete set null,
  "projectId" text references public."Project"(id) on delete set null,
  "quoteId" text references public."Quote"(id) on delete set null,
  "saleId" text references public."Sale"(id) on delete set null,
  type text not null,
  "documentNumber" text,
  "siiFolio" text,
  "issueDate" date,
  "dueDate" date,
  "netAmount" integer default 0,
  "taxAmount" integer default 0,
  "totalAmount" integer default 0,
  status text,
  "paymentStatus" text,
  "emissionMethod" text,
  "pdfUrl" text,
  "xmlUrl" text,
  notes text,
  "createdAt" timestamptz default now()
);

create index if not exists idx_visit_client on public."Visit" ("clientId");
create index if not exists idx_sale_client on public."Sale" ("clientId");
create index if not exists idx_project_client on public."Project" ("clientId");
create index if not exists idx_request_client on public."ClientRequest" ("clientId");
create index if not exists idx_request_project on public."ClientRequest" ("projectId");
create index if not exists idx_taxdocument_client on public."TaxDocument" ("clientId");
create index if not exists idx_taxdocument_project on public."TaxDocument" ("projectId");
create index if not exists idx_taxdocument_quote on public."TaxDocument" ("quoteId");
create index if not exists idx_taxdocument_sale on public."TaxDocument" ("saleId");

insert into storage.buckets (id, name, public)
select 'quote-documents', 'quote-documents', true
where not exists (
  select 1 from storage.buckets where id = 'quote-documents'
);
