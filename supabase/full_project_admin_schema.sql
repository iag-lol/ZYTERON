-- Zyteron full SQL bootstrap (PostgreSQL / Supabase)
-- Objetivo: dejar funcional toda la capa administrativa y sus dependencias.
-- Uso recomendado:
-- 1) Ejecutar en una base vacia o nueva.
-- 2) Luego correr seed de Prisma si quieres datos demo:
--    npm run db:seed
--
-- Nota:
-- - El panel /admin/login autentica por ADMIN_PASSWORD (entorno), no por tabla User.
-- - Este script crea toda la estructura SQL necesaria para modulo admin + CRM + catalogo.

begin;

create extension if not exists pgcrypto;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'Role') then
    create type public."Role" as enum ('CLIENT', 'ADMIN');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'PlanTier') then
    create type public."PlanTier" as enum ('BASIC', 'INTERMEDIATE', 'PRO');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ExtraCategory') then
    create type public."ExtraCategory" as enum (
      'DOMAIN',
      'EMAIL',
      'SUPPORT',
      'EQUIPMENT',
      'SEO',
      'DESIGN',
      'TRAINING',
      'TECH'
    );
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'QuoteStatus') then
    create type public."QuoteStatus" as enum ('PENDING', 'SENT', 'WON', 'LOST');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'LeadType') then
    create type public."LeadType" as enum ('CONTACT', 'QUOTE', 'PACKAGE_BUILDER');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'SettingType') then
    create type public."SettingType" as enum ('TEXT', 'JSON', 'BOOLEAN');
  end if;
end
$$;

-- Core
create table if not exists public."User" (
  id text primary key,
  email text not null unique,
  "passwordHash" text not null,
  name text not null,
  role public."Role" not null default 'CLIENT',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  company text,
  phone text,
  address text,
  city text,
  country text default 'Chile',
  rut text,
  "contactName" text,
  industry text,
  tier text,
  notes text
);

create table if not exists public."Session" (
  id text primary key,
  "sessionToken" text not null unique,
  "userId" text not null references public."User"(id) on delete cascade,
  expires timestamptz not null
);

-- Catalogo / contenido
create table if not exists public."ServiceCategory" (
  id text primary key,
  slug text not null unique,
  name text not null,
  "order" integer not null default 0
);

create table if not exists public."ProductCategory" (
  id text primary key,
  slug text not null unique,
  name text not null,
  "order" integer not null default 0
);

create table if not exists public."SeoMetadata" (
  id text primary key,
  "metaTitle" text not null,
  "metaDescription" text not null,
  slug text not null unique,
  "canonicalUrl" text,
  "ogTitle" text,
  "ogDescription" text,
  "ogImage" text,
  keywords text[] not null default '{}'::text[],
  "jsonLd" jsonb,
  noindex boolean not null default false
);

create table if not exists public."Service" (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  "shortCopy" text not null,
  features text[] not null default '{}'::text[],
  "priceFrom" integer,
  "categoryId" text not null references public."ServiceCategory"(id) on delete restrict,
  "seoId" text unique references public."SeoMetadata"(id) on delete set null,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."Product" (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  price integer not null,
  "discountPct" integer not null default 0,
  stock integer not null default 10,
  featured boolean not null default false,
  "categoryId" text not null references public."ProductCategory"(id) on delete restrict,
  badges text[] not null default '{}'::text[],
  "seoId" text unique references public."SeoMetadata"(id) on delete set null,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."Plan" (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  price integer not null,
  tier public."PlanTier" not null,
  "freeGifts" text[] not null default '{}'::text[],
  features text[] not null default '{}'::text[],
  popular boolean not null default false,
  "seoId" text unique references public."SeoMetadata"(id) on delete set null
);

create table if not exists public."Extra" (
  id text primary key,
  slug text not null unique,
  name text not null,
  category public."ExtraCategory" not null,
  description text not null,
  options text[] not null default '{}'::text[],
  price integer
);

create table if not exists public."FAQ" (
  id text primary key,
  question text not null,
  answer text not null,
  "serviceId" text references public."Service"(id) on delete set null,
  "productId" text references public."Product"(id) on delete set null,
  category text,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."Banner" (
  id text primary key,
  title text not null,
  body text not null,
  "ctaLabel" text,
  "ctaHref" text,
  active boolean not null default true
);

create table if not exists public."Setting" (
  id text primary key,
  key text not null unique,
  value text not null,
  type public."SettingType" not null default 'TEXT'
);

-- Admin / CRM
create table if not exists public."Lead" (
  id text primary key,
  "userId" text references public."User"(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  source text,
  message text,
  type public."LeadType" not null,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."Quote" (
  id text primary key,
  "userId" text references public."User"(id) on delete set null,
  "planId" text references public."Plan"(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  company text,
  message text,
  subtotal integer not null,
  discount integer not null default 0,
  total integer not null,
  status public."QuoteStatus" not null default 'PENDING',
  "createdAt" timestamptz not null default now()
);

create table if not exists public."QuoteExtra" (
  id text primary key,
  "quoteId" text not null references public."Quote"(id) on delete cascade,
  "extraId" text not null references public."Extra"(id) on delete restrict,
  quantity integer not null default 1
);

create table if not exists public."Visit" (
  id text primary key,
  "clientId" text references public."User"(id) on delete set null,
  date timestamptz,
  notes text,
  status text,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."Sale" (
  id text primary key,
  "clientId" text references public."User"(id) on delete set null,
  total integer not null default 0,
  description text,
  "paymentMethod" text,
  "invoiceRef" text,
  "createdAt" timestamptz not null default now()
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
  "createdAt" timestamptz not null default now()
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
  "createdAt" timestamptz not null default now()
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
  "createdAt" timestamptz not null default now()
);

-- Compatibilidad: si existe User antigua, agrega columnas admin nuevas
alter table if exists public."User"
  add column if not exists rut text,
  add column if not exists "contactName" text,
  add column if not exists industry text,
  add column if not exists tier text,
  add column if not exists notes text;

-- Indices de uso frecuente (admin dashboards + filtros)
create index if not exists idx_user_role on public."User"(role);
create index if not exists idx_user_createdat on public."User"("createdAt");

create index if not exists idx_lead_createdat on public."Lead"("createdAt" desc);
create index if not exists idx_lead_user on public."Lead"("userId");
create index if not exists idx_quote_createdat on public."Quote"("createdAt" desc);
create index if not exists idx_quote_user on public."Quote"("userId");
create index if not exists idx_quote_status on public."Quote"(status);
create index if not exists idx_quote_plan on public."Quote"("planId");

create index if not exists idx_visit_client on public."Visit"("clientId");
create index if not exists idx_visit_date on public."Visit"(date desc);
create index if not exists idx_sale_client on public."Sale"("clientId");
create index if not exists idx_sale_createdat on public."Sale"("createdAt" desc);
create index if not exists idx_project_client on public."Project"("clientId");
create index if not exists idx_project_quote on public."Project"("quoteId");
create index if not exists idx_project_sale on public."Project"("saleId");
create index if not exists idx_project_createdat on public."Project"("createdAt" desc);
create index if not exists idx_request_client on public."ClientRequest"("clientId");
create index if not exists idx_request_project on public."ClientRequest"("projectId");
create index if not exists idx_request_duedate on public."ClientRequest"("dueDate");
create index if not exists idx_taxdocument_client on public."TaxDocument"("clientId");
create index if not exists idx_taxdocument_project on public."TaxDocument"("projectId");
create index if not exists idx_taxdocument_quote on public."TaxDocument"("quoteId");
create index if not exists idx_taxdocument_sale on public."TaxDocument"("saleId");
create index if not exists idx_taxdocument_issuedate on public."TaxDocument"("issueDate" desc);

create index if not exists idx_quoteextra_quote on public."QuoteExtra"("quoteId");
create index if not exists idx_quoteextra_extra on public."QuoteExtra"("extraId");
create unique index if not exists idx_quoteextra_quote_extra_unique on public."QuoteExtra"("quoteId", "extraId");

create index if not exists idx_service_category on public."Service"("categoryId");
create index if not exists idx_product_category on public."Product"("categoryId");
create index if not exists idx_faq_service on public."FAQ"("serviceId");
create index if not exists idx_faq_product on public."FAQ"("productId");

-- Storage bucket para PDFs de cotizaciones (solo Supabase)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'storage'
      and table_name = 'buckets'
  ) then
    insert into storage.buckets (id, name, public)
    select 'quote-documents', 'quote-documents', true
    where not exists (
      select 1 from storage.buckets where id = 'quote-documents'
    );
  end if;
end
$$;

commit;
