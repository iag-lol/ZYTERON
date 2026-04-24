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
create index if not exists idx_discount_active on public."WebDiscount"(active);
create index if not exists idx_discount_target on public."WebDiscount"("targetType", "targetId");
create index if not exists idx_clientreview_status_created on public."ClientReview"(status, "createdAt" desc);
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
create index if not exists idx_webvisit_createdat on public."WebVisit"("createdAt" desc);
create index if not exists idx_webvisit_path on public."WebVisit"(path);
create index if not exists idx_webvisit_iphash on public."WebVisit"("ipHash");
create index if not exists idx_webvisit_session on public."WebVisit"("sessionId");

create index if not exists idx_quoteextra_quote on public."QuoteExtra"("quoteId");
create index if not exists idx_quoteextra_extra on public."QuoteExtra"("extraId");
create unique index if not exists idx_quoteextra_quote_extra_unique on public."QuoteExtra"("quoteId", "extraId");

create index if not exists idx_service_category on public."Service"("categoryId");
create index if not exists idx_product_category on public."Product"("categoryId");
create index if not exists idx_faq_service on public."FAQ"("serviceId");
create index if not exists idx_faq_product on public."FAQ"("productId");

-- RLS compatibility for public web forms (CONTACTO / COTIZADOR / COMENTARIOS)
-- Si RLS está activo en tu proyecto, este bloque evita errores 42501 en inserts públicos controlados.
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

-- Seed comercial base (web pública + cotizador + control web)
insert into public."ProductCategory" (id, slug, name, "order")
values
  ('cat-notebooks', 'notebooks', 'Notebooks', 1),
  ('cat-pc-escritorio', 'pc-escritorio', 'PC de escritorio', 2),
  ('cat-packs', 'packs', 'Combos y packs', 3)
on conflict (slug) do update
set
  name = excluded.name,
  "order" = excluded."order";

insert into public."Plan" (id, slug, name, description, price, tier, "freeGifts", features, popular)
values
  (
    'plan-basico',
    'basico',
    'Básico',
    'Landing profesional + hosting + soporte básico',
    390000,
    'BASIC',
    array['1 mes de atención básica post-entrega'],
    array[
      'Landing page extendida (hasta 6 secciones)',
      'Formulario de contacto + WhatsApp',
      'Hosting SSD + SSL (3 meses)',
      'Diseño responsive mobile/tablet/desktop',
      'SEO básico (metadatos y títulos)'
    ],
    false
  ),
  (
    'plan-intermedio',
    'intermedio',
    'Intermedio',
    'Sitio 5 secciones + SEO + analítica + CRM',
    790000,
    'INTERMEDIATE',
    array['1 mes de atención incluida'],
    array[
      'Sitio web completo (hasta 8 secciones)',
      'Formularios avanzados + analítica',
      'Optimización SEO intermedia on-page',
      'Integración CRM / email marketing',
      'Diseño premium con animaciones'
    ],
    true
  ),
  (
    'plan-pro',
    'pro',
    'Pro',
    'Corporativo + blog + SEO avanzado + paneles',
    1490000,
    'PRO',
    array['Dominio .cl por 1 año', '1 correo corporativo por 1 año', 'Capacitación inicial (2h)'],
    array[
      'Sitio corporativo completo + blog',
      'SEO avanzado + schema JSON-LD',
      'Panel de cliente + administración base',
      'Seguridad avanzada y hardening',
      'Performance enterprise (99+ Lighthouse)'
    ],
    false
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  tier = excluded.tier,
  "freeGifts" = excluded."freeGifts",
  features = excluded.features,
  popular = excluded.popular;

insert into public."Extra" (id, slug, name, category, description, options, price)
values
  ('extra-dominio-cl', 'dominio-cl-1-anio', 'Dominio .cl — 1 año', 'DOMAIN', 'Registro anual de dominio nacional.', array['1 año'], 29000),
  ('extra-dominio-com', 'dominio-com-1-anio', 'Dominio .com — 1 año', 'DOMAIN', 'Registro anual de dominio internacional.', array['1 año'], 35000),
  ('extra-hosting', 'hosting-extra-12m', 'Hosting extra (12 meses)', 'DOMAIN', 'Hosting adicional anual para proyectos con mayor demanda.', array['12 meses'], 89000),
  ('extra-ssl', 'ssl-wildcard-premium', 'SSL wildcard premium', 'DOMAIN', 'Certificado wildcard para subdominios.', array['Wildcard'], 59000),
  ('extra-email-1', 'correo-1-anio', '1 correo corporativo — 1 año', 'EMAIL', 'Cuenta corporativa con dominio propio.', array['1 cuenta'], 29000),
  ('extra-email-5', 'pack-5-correos', 'Pack 5 correos — 1 año', 'EMAIL', 'Cinco cuentas de correo empresarial.', array['5 cuentas'], 119000),
  ('extra-email-10', 'pack-10-correos', 'Pack 10 correos — 1 año', 'EMAIL', 'Diez cuentas de correo empresarial.', array['10 cuentas'], 199000),
  ('extra-seo-basico', 'seo-basico-on-page', 'SEO básico on-page', 'SEO', 'Optimización técnica esencial.', array['Setup'], 99000),
  ('extra-seo-intermedio', 'seo-intermedio-schema', 'SEO intermedio + schema', 'SEO', 'Optimización intermedia con esquema estructurado.', array['Mensual'], 199000),
  ('extra-seo-avanzado', 'seo-avanzado-contenido', 'SEO avanzado + contenido', 'SEO', 'Plan de crecimiento con contenidos.', array['Mensual'], 349000),
  ('extra-seo-local', 'seo-local-ciudad', 'SEO local (por ciudad)', 'SEO', 'Optimización geolocalizada para ciudades objetivo.', array['Por ciudad'], 149000),
  ('extra-soporte-1m', 'soporte-remoto-1m', 'Soporte remoto — 1 mes', 'SUPPORT', 'Mesa de ayuda remota mensual.', array['1 mes'], 59000),
  ('extra-soporte-3m', 'soporte-remoto-3m', 'Soporte remoto — 3 meses', 'SUPPORT', 'Mesa de ayuda remota trimestral.', array['3 meses'], 149000),
  ('extra-visita', 'visita-tecnica', 'Visita técnica presencial', 'SUPPORT', 'Soporte técnico en terreno.', array['Por visita'], 89000),
  ('extra-mantencion', 'mantencion-web', 'Mantención web mensual', 'SUPPORT', 'Mantención y actualizaciones mensuales.', array['Mensual'], 79000),
  ('extra-blog', 'blog-integrado', 'Blog integrado', 'TECH', 'Módulo de blog administrable.', array['Módulo'], 149000),
  ('extra-panel-cliente', 'panel-cliente', 'Panel de cliente', 'TECH', 'Portal de gestión para clientes finales.', array['Módulo'], 249000),
  ('extra-panel-admin', 'panel-admin', 'Panel de administrador', 'TECH', 'Panel administrativo para gestión interna.', array['Módulo'], 299000),
  ('extra-reservas', 'modulo-reservas', 'Módulo de reservas online', 'TECH', 'Sistema de agenda y reservas.', array['Módulo'], 199000),
  ('extra-tienda', 'tienda-online', 'Tienda online básica', 'DESIGN', 'Catálogo y carrito de compra inicial.', array['Módulo'], 299000),
  ('extra-webpay', 'pasarela-webpay-plus', 'Pasarela Webpay Plus', 'DESIGN', 'Integración de pago con Webpay.', array['Integración'], 199000),
  ('extra-catalogo', 'catalogo-productos', 'Catálogo de productos', 'DESIGN', 'Módulo de catálogo administrable.', array['Módulo'], 149000),
  ('extra-notebook', 'notebook-oficina-pro', 'Notebook Oficina Pro', 'EQUIPMENT', 'Equipo portátil empresarial.', array['Unidad'], 520000),
  ('extra-pc', 'pc-escritorio-empresa', 'PC Escritorio Empresa', 'EQUIPMENT', 'Equipo de escritorio para oficina.', array['Unidad'], 680000),
  ('extra-perifericos', 'pack-perifericos', 'Pack periféricos oficina', 'EQUIPMENT', 'Pack teclado, mouse y accesorios.', array['Pack'], 149000),
  ('extra-cap-2h', 'capacitacion-2h', 'Capacitación inicial (2h)', 'TRAINING', 'Inducción al uso de plataforma.', array['2h'], 79000),
  ('extra-cap-4h', 'capacitacion-4h', 'Capacitación avanzada (4h)', 'TRAINING', 'Formación avanzada para operación.', array['4h'], 149000),
  ('extra-manual', 'manual-personalizado', 'Manual de uso personalizado', 'TRAINING', 'Documento operativo adaptado a tu negocio.', array['Documento'], 59000)
on conflict (slug) do update
set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  options = excluded.options,
  price = excluded.price;

insert into public."Product" (id, slug, name, description, price, "discountPct", stock, featured, "categoryId", badges)
values
  (
    'product-notebook-oficina',
    'notebook-oficina-pro',
    'Notebook Oficina Pro',
    'Equipo ligero, 16GB RAM, SSD 512GB, ideal para productividad.',
    520000,
    5,
    20,
    true,
    (select id from public."ProductCategory" where slug = 'notebooks' limit 1),
    array['Entrega 48h', 'Garantía 1 año']
  ),
  (
    'product-pc-escritorio',
    'pc-escritorio-empresa',
    'PC Escritorio Empresa',
    'Desktop confiable, 32GB RAM, SSD 1TB, para oficinas exigentes.',
    680000,
    8,
    20,
    false,
    (select id from public."ProductCategory" where slug = 'pc-escritorio' limit 1),
    array['Configuración incluida']
  ),
  (
    'product-combo-pyme',
    'combo-pyme-digital',
    'Combo Pyme Digital',
    'Landing + dominio + 3 correos + soporte remoto por 1 mes.',
    690000,
    10,
    15,
    true,
    (select id from public."ProductCategory" where slug = 'packs' limit 1),
    array['Más vendido']
  ),
  (
    'product-combo-pro',
    'combo-empresa-pro',
    'Combo Empresa Pro',
    'Sitio corporativo + dominio + 5 correos + SEO intermedio + 1 visita.',
    1290000,
    12,
    10,
    true,
    (select id from public."ProductCategory" where slug = 'packs' limit 1),
    array['Incluye visita']
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  "discountPct" = excluded."discountPct",
  stock = excluded.stock,
  featured = excluded.featured,
  "categoryId" = excluded."categoryId",
  badges = excluded.badges;

insert into public."WebDiscount" (
  id,
  name,
  description,
  "targetType",
  "targetId",
  mode,
  value,
  "minSubtotal",
  active,
  "createdAt",
  "updatedAt"
)
values
  (
    'discount-plan-intermedio',
    'Promo Plan Intermedio',
    'Descuento temporal para impulsar conversiones del plan intermedio.',
    'PLAN',
    (select id from public."Plan" where slug = 'intermedio' limit 1),
    'PERCENT',
    10,
    0,
    true,
    now(),
    now()
  ),
  (
    'discount-setup-order',
    'Descuento de setup',
    'Descuento fijo en compras sobre $900.000.',
    'ORDER',
    null,
    'FIXED',
    50000,
    900000,
    true,
    now(),
    now()
  )
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  "targetType" = excluded."targetType",
  "targetId" = excluded."targetId",
  mode = excluded.mode,
  value = excluded.value,
  "minSubtotal" = excluded."minSubtotal",
  active = excluded.active,
  "updatedAt" = now();

insert into public."ClientReview" (
  id,
  name,
  email,
  company,
  rating,
  comment,
  service,
  status,
  source,
  "createdAt",
  "approvedAt"
)
values
  (
    'review-001',
    'María G.',
    'maria@empresa.cl',
    'Comercial San Pedro',
    5,
    'El equipo respondió rápido y el cotizador nos permitió definir todo sin reuniones eternas.',
    'Sitio corporativo + SEO',
    'APPROVED',
    'WEB',
    now() - interval '20 days',
    now() - interval '19 days'
  ),
  (
    'review-002',
    'Carlos P.',
    'carlos@industria.cl',
    'Industrias del Norte',
    5,
    'El panel admin quedó muy ordenado y ahora controlamos precios y servicios sin depender de terceros.',
    'Panel administrativo',
    'APPROVED',
    'WEB',
    now() - interval '12 days',
    now() - interval '11 days'
  ),
  (
    'review-003',
    'Valentina R.',
    'valentina@retail.cl',
    'Retail Sur',
    4,
    'Buen proceso comercial, cumplieron fechas y mejoró mucho la presentación de nuestras cotizaciones.',
    'Cotizaciones + Soporte',
    'APPROVED',
    'WEB',
    now() - interval '8 days',
    now() - interval '7 days'
  )
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email,
  company = excluded.company,
  rating = excluded.rating,
  comment = excluded.comment,
  service = excluded.service,
  status = excluded.status,
  source = excluded.source,
  "approvedAt" = excluded."approvedAt";

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
