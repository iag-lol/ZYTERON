-- Zyteron admin / CRM / SII bootstrap for Supabase PostgreSQL
-- Ejecuta este archivo en SQL Editor de Supabase antes de usar
-- los módulos de clientes, proyectos, solicitudes, SII y PDF storage.
-- Si quieres bootstrap completo con catálogo + seeds web, usa:
-- supabase/full_project_admin_schema.sql

create extension if not exists pgcrypto;

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
    create type public."ExtraCategory" as enum ('DOMAIN', 'EMAIL', 'SUPPORT', 'EQUIPMENT', 'SEO', 'DESIGN', 'TRAINING', 'TECH');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'DiscountTargetType') then
    create type public."DiscountTargetType" as enum ('PLAN', 'EXTRA', 'PRODUCT', 'ORDER');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'DiscountMode') then
    create type public."DiscountMode" as enum ('PERCENT', 'FIXED');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ReviewStatus') then
    create type public."ReviewStatus" as enum ('PENDING', 'APPROVED', 'REJECTED');
  end if;
end
$$;

create table if not exists public."ProductCategory" (
  id text primary key,
  slug text not null unique,
  name text not null,
  "order" integer not null default 0
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
  popular boolean not null default false
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

create table if not exists public."WebVisit" (
  id text primary key,
  path text not null,
  "pageTitle" text,
  referrer text,
  "userAgent" text,
  ip text,
  "ipHash" text,
  "sessionId" text,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."WebDiscount" (
  id text primary key,
  name text not null,
  description text,
  "targetType" public."DiscountTargetType" not null default 'ORDER',
  "targetId" text,
  mode public."DiscountMode" not null default 'PERCENT',
  value integer not null,
  "minSubtotal" integer default 0,
  active boolean not null default true,
  "startsAt" timestamptz,
  "endsAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."ClientReview" (
  id text primary key,
  name text not null,
  email text,
  company text,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  service text,
  status public."ReviewStatus" not null default 'PENDING',
  source text,
  "createdAt" timestamptz not null default now(),
  "approvedAt" timestamptz
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
create index if not exists idx_webvisit_createdat on public."WebVisit" ("createdAt" desc);
create index if not exists idx_webvisit_path on public."WebVisit" (path);
create index if not exists idx_webvisit_iphash on public."WebVisit" ("ipHash");
create index if not exists idx_webvisit_session on public."WebVisit" ("sessionId");
create index if not exists idx_product_category on public."Product" ("categoryId");
create index if not exists idx_discount_active on public."WebDiscount" (active);
create index if not exists idx_clientreview_status_created on public."ClientReview" (status, "createdAt" desc);

-- RLS compatibility for public web forms (CONTACTO / COTIZADOR / COMENTARIOS)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'Quote'
  ) then
    alter table public."Quote" enable row level security;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'Quote'
        and policyname = 'quote_public_insert_from_forms'
    ) then
      create policy quote_public_insert_from_forms
      on public."Quote"
      for insert
      to anon, authenticated
      with check (
        length(trim(coalesce(name, ''))) > 0
        and length(trim(coalesce(email, ''))) > 0
        and coalesce(subtotal, 0) >= 0
        and coalesce(discount, 0) >= 0
        and coalesce(total, 0) >= 0
        and status in ('PENDING', 'SENT', 'WON', 'LOST')
      );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'Quote'
        and policyname = 'quote_admin_select_all'
    ) then
      create policy quote_admin_select_all
      on public."Quote"
      for select
      to anon, authenticated
      using (true);
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'Quote'
        and policyname = 'quote_admin_update_all'
    ) then
      create policy quote_admin_update_all
      on public."Quote"
      for update
      to anon, authenticated
      using (true)
      with check (
        length(trim(coalesce(name, ''))) > 0
        and length(trim(coalesce(email, ''))) > 0
        and coalesce(subtotal, 0) >= 0
        and coalesce(discount, 0) >= 0
        and coalesce(total, 0) >= 0
        and status in ('PENDING', 'SENT', 'WON', 'LOST')
      );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'Quote'
        and policyname = 'quote_admin_delete_all'
    ) then
      create policy quote_admin_delete_all
      on public."Quote"
      for delete
      to anon, authenticated
      using (true);
    end if;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'Sale'
  ) then
    alter table public."Sale" enable row level security;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'Sale'
        and policyname = 'sale_public_insert_from_won_quotes'
    ) then
      create policy sale_public_insert_from_won_quotes
      on public."Sale"
      for insert
      to anon, authenticated
      with check (
        coalesce(total, 0) >= 0
      );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'Sale'
        and policyname = 'sale_admin_select_all'
    ) then
      create policy sale_admin_select_all
      on public."Sale"
      for select
      to anon, authenticated
      using (true);
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'Sale'
        and policyname = 'sale_admin_update_all'
    ) then
      create policy sale_admin_update_all
      on public."Sale"
      for update
      to anon, authenticated
      using (true)
      with check (
        coalesce(total, 0) >= 0
      );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'Sale'
        and policyname = 'sale_admin_delete_all'
    ) then
      create policy sale_admin_delete_all
      on public."Sale"
      for delete
      to anon, authenticated
      using (true);
    end if;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'TaxDocument'
  ) then
    alter table public."TaxDocument" enable row level security;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'TaxDocument'
        and policyname = 'taxdocument_public_insert_from_won_quotes'
    ) then
      create policy taxdocument_public_insert_from_won_quotes
      on public."TaxDocument"
      for insert
      to anon, authenticated
      with check (
        length(trim(coalesce(type, ''))) > 0
        and coalesce("netAmount", 0) >= 0
        and coalesce("taxAmount", 0) >= 0
        and coalesce("totalAmount", 0) >= 0
      );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'TaxDocument'
        and policyname = 'taxdocument_admin_select_all'
    ) then
      create policy taxdocument_admin_select_all
      on public."TaxDocument"
      for select
      to anon, authenticated
      using (true);
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'TaxDocument'
        and policyname = 'taxdocument_admin_update_all'
    ) then
      create policy taxdocument_admin_update_all
      on public."TaxDocument"
      for update
      to anon, authenticated
      using (true)
      with check (
        length(trim(coalesce(type, ''))) > 0
        and coalesce("netAmount", 0) >= 0
        and coalesce("taxAmount", 0) >= 0
        and coalesce("totalAmount", 0) >= 0
      );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'TaxDocument'
        and policyname = 'taxdocument_admin_delete_all'
    ) then
      create policy taxdocument_admin_delete_all
      on public."TaxDocument"
      for delete
      to anon, authenticated
      using (true);
    end if;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'Lead'
  ) then
    alter table public."Lead" enable row level security;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'Lead'
        and policyname = 'lead_public_insert_contact_package'
    ) then
      create policy lead_public_insert_contact_package
      on public."Lead"
      for insert
      to anon, authenticated
      with check (
        source in ('CONTACTO_WEB', 'COTIZADOR_WEB')
        and type in ('CONTACT', 'PACKAGE_BUILDER')
      );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'Lead'
        and policyname = 'lead_admin_select_all'
    ) then
      create policy lead_admin_select_all
      on public."Lead"
      for select
      to anon, authenticated
      using (true);
    end if;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'WebVisit'
  ) then
    alter table public."WebVisit" enable row level security;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'WebVisit'
        and policyname = 'webvisit_public_insert'
    ) then
      create policy webvisit_public_insert
      on public."WebVisit"
      for insert
      to anon, authenticated
      with check (
        length(trim(coalesce(path, ''))) > 0
      );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'WebVisit'
        and policyname = 'webvisit_admin_select_all'
    ) then
      create policy webvisit_admin_select_all
      on public."WebVisit"
      for select
      to anon, authenticated
      using (true);
    end if;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'ClientReview'
  ) then
    alter table public."ClientReview" enable row level security;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'ClientReview'
        and policyname = 'clientreview_public_insert_pending'
    ) then
      create policy clientreview_public_insert_pending
      on public."ClientReview"
      for insert
      to anon, authenticated
      with check (
        status = 'PENDING'
        and rating between 1 and 5
      );
    end if;

    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'ClientReview'
        and policyname = 'clientreview_public_select_approved'
    ) then
      create policy clientreview_public_select_approved
      on public."ClientReview"
      for select
      to anon, authenticated
      using (status = 'APPROVED');
    end if;
  end if;
end
$$;

insert into storage.buckets (id, name, public)
select 'quote-documents', 'quote-documents', true
where not exists (
  select 1 from storage.buckets where id = 'quote-documents'
);
