-- Extracto consolidado de la seccion /admin
-- Fuentes:
-- - supabase/full_project_admin_schema.sql
-- - supabase/admin_schema.sql
-- - supabase/work_orders_bootstrap.sql
-- - supabase/expenses_bootstrap.sql

create extension if not exists pgcrypto;

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

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ExpenseStatus') then
    create type public."ExpenseStatus" as enum ('PLANNED', 'PURCHASED', 'CANCELLED');
  end if;
end
$$;

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

create table if not exists public."Setting" (
  id text primary key,
  key text not null unique,
  value text not null,
  type public."SettingType" not null default 'TEXT'
);

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

create table if not exists public."WorkOrder" (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  source text not null default 'MANUAL_QUOTE' check (source in ('MANUAL_QUOTE', 'WEB_ORDER')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED')),
  priority text not null default 'NORMAL' check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  "quoteId" text references public."Quote"(id) on delete set null,
  "saleId" text references public."Sale"(id) on delete set null,
  "clientId" text references public."User"(id) on delete set null,
  title text not null,
  description text,
  scope jsonb not null default '[]'::jsonb,
  "plannedDate" date,
  "dueDate" date,
  "estimatedHours" integer,
  "actualHours" integer,
  budget integer,
  "assignedTo" text,
  notes text,
  "pdfUrl" text,
  "createdBy" text,
  "completedAt" timestamptz,
  "closedAt" timestamptz,
  "cancelledAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."Expense" (
  id text primary key,
  name text not null,
  description text,
  category text not null default 'OTROS',
  status public."ExpenseStatus" not null default 'PLANNED',
  amount integer check (amount >= 0),
  store text,
  "invoiceNumber" text,
  "purchaseDate" date,
  "arrivalDate" date,
  "invoiceFileUrl" text,
  "invoiceFilePath" text,
  "invoiceFileName" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create or replace function public.set_workorder_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

drop trigger if exists trg_workorder_updated_at on public."WorkOrder";
create trigger trg_workorder_updated_at
before update on public."WorkOrder"
for each row
execute function public.set_workorder_updated_at();

create or replace function public.set_expense_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

drop trigger if exists trg_expense_updated_at on public."Expense";
create trigger trg_expense_updated_at
before update on public."Expense"
for each row
execute function public.set_expense_updated_at();
