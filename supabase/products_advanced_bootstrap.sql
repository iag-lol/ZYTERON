-- Bootstrap Productos Avanzados (Supabase / PostgreSQL)
-- Incluye estructura mínima para:
-- - Catálogo de productos y categorías
-- - Descuentos con fechas (WebDiscount)
-- - Settings usados por metadata pública/admin de productos
--
-- Metadatos esperados en Setting:
-- - key: product_public_<slug>
--   value JSON: { slug, imageUrl, publicDescription, published }
-- - key: product_admin_<slug>
--   value JSON: { slug, status, soldUnits, onOffer, isCombo, comboLabel, comboItems, costPrice, discountStartsAt, discountEndsAt, notes }

begin;

create extension if not exists pgcrypto;

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
  if not exists (select 1 from pg_type where typname = 'SettingType') then
    create type public."SettingType" as enum ('TEXT', 'JSON', 'BOOLEAN');
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

alter table public."Product"
  add column if not exists "discountPct" integer not null default 0,
  add column if not exists stock integer not null default 10,
  add column if not exists featured boolean not null default false,
  add column if not exists badges text[] not null default '{}'::text[],
  add column if not exists "createdAt" timestamptz not null default now();

create table if not exists public."Setting" (
  id text primary key,
  key text not null unique,
  value text not null,
  type public."SettingType" not null default 'TEXT'
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

create index if not exists idx_product_category on public."Product" ("categoryId");
create index if not exists idx_product_created on public."Product" ("createdAt" desc);
create index if not exists idx_webdiscount_active on public."WebDiscount" (active);
create index if not exists idx_setting_key on public."Setting" (key);

insert into public."ProductCategory" (id, slug, name, "order")
values
  ('cat-ti-notebooks', 'notebooks', 'Notebooks', 10),
  ('cat-ti-pcs', 'pc-escritorio', 'PC Escritorio', 20),
  ('cat-ti-combos', 'combos-empresa', 'Combos Empresa', 30),
  ('cat-ti-perifericos', 'perifericos', 'Periféricos', 40),
  ('cat-ti-redes', 'redes', 'Redes y Conectividad', 50)
on conflict (slug) do update
set
  name = excluded.name,
  "order" = excluded."order";

commit;
