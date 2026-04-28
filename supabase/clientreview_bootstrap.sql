-- Bootstrap puntual para comentarios de clientes (ClientReview)
-- Ejecutar en Supabase SQL Editor sobre el proyecto conectado.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ReviewStatus') then
    create type public."ReviewStatus" as enum ('PENDING', 'APPROVED', 'REJECTED');
  end if;
end
$$;

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

create index if not exists idx_clientreview_status_created
  on public."ClientReview" (status, "createdAt" desc);

-- Compatibilidad con entornos que consultan client_review en snake_case.
create or replace view public.client_review as
select
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
from public."ClientReview";

grant usage on schema public to anon, authenticated;
grant select, insert on table public."ClientReview" to anon, authenticated;
grant select, insert on public.client_review to anon, authenticated;

alter table public."ClientReview" enable row level security;

drop policy if exists clientreview_public_insert_pending on public."ClientReview";
create policy clientreview_public_insert_pending
on public."ClientReview"
for insert
to anon, authenticated
with check (
  status = 'PENDING'
  and rating between 1 and 5
);

drop policy if exists clientreview_public_select_approved on public."ClientReview";
create policy clientreview_public_select_approved
on public."ClientReview"
for select
to anon, authenticated
using (status = 'APPROVED');

-- Fuerza recarga de schema cache de PostgREST.
notify pgrst, 'reload schema';
