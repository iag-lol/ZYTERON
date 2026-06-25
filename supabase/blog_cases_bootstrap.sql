-- =========================================================
-- Bootstrap para Blog (BlogPost) y Casos de éxito (CaseStudy)
-- Ejecutar en Supabase SQL Editor sobre el proyecto conectado.
-- Convenciones alineadas con el resto del proyecto (PascalCase de
-- tabla y camelCase de columnas, igual que ClientReview/Prisma).
-- Las escrituras del panel admin usan la service_role key (bypassa RLS);
-- las políticas públicas sólo permiten LEER contenido 'published'.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- Trigger genérico de updatedAt (idempotente)
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$ language plpgsql;

-- =========================================================
-- TABLA: BlogPost
-- =========================================================
create table if not exists public."BlogPost" (
  id               text primary key,
  slug             text unique not null,
  title            text not null,
  excerpt          text,
  content          text not null,                 -- markdown
  "coverImageUrl"  text,
  "coverImageAlt"  text,
  category         text,
  tags             text[] not null default '{}',
  "readMinutes"    integer not null default 5,
  author           text not null default 'Zyteron',
  status           text not null default 'draft' check (status in ('draft', 'published')),
  "metaTitle"      text,
  "metaDescription" text,
  keywords         text,
  "ogImageUrl"     text,
  "publishedAt"    timestamptz,
  "createdAt"      timestamptz not null default now(),
  "updatedAt"      timestamptz not null default now()
);

create index if not exists idx_blogpost_status_published
  on public."BlogPost" (status, "publishedAt" desc);

drop trigger if exists blogpost_set_updated_at on public."BlogPost";
create trigger blogpost_set_updated_at
  before update on public."BlogPost"
  for each row execute function public.set_updated_at();

-- =========================================================
-- TABLA: CaseStudy
-- =========================================================
create table if not exists public."CaseStudy" (
  id               text primary key,
  slug             text unique not null,
  "companyName"    text not null,
  industry         text,
  problem          text not null,
  solution         text not null,
  results          text,
  technologies     text[] not null default '{}',
  "projectDuration" text,
  "clientQuote"    text,
  "imageUrl"       text,
  "imageAlt"       text,
  featured         boolean not null default false,
  "sortOrder"      integer not null default 0,
  status           text not null default 'draft' check (status in ('draft', 'published')),
  "metaTitle"      text,
  "metaDescription" text,
  "publishedAt"    timestamptz,
  "createdAt"      timestamptz not null default now(),
  "updatedAt"      timestamptz not null default now()
);

create index if not exists idx_casestudy_status_published
  on public."CaseStudy" (status, featured desc, "sortOrder" asc, "publishedAt" desc);

drop trigger if exists casestudy_set_updated_at on public."CaseStudy";
create trigger casestudy_set_updated_at
  before update on public."CaseStudy"
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Grants y RLS: lectura pública SÓLO de lo publicado.
-- (El admin escribe con service_role, que ignora RLS.)
-- ---------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on table public."BlogPost"  to anon, authenticated;
grant select on table public."CaseStudy" to anon, authenticated;

alter table public."BlogPost"  enable row level security;
alter table public."CaseStudy" enable row level security;

drop policy if exists blogpost_public_select_published on public."BlogPost";
create policy blogpost_public_select_published
  on public."BlogPost"
  for select
  to anon, authenticated
  using (status = 'published');

drop policy if exists casestudy_public_select_published on public."CaseStudy";
create policy casestudy_public_select_published
  on public."CaseStudy"
  for select
  to anon, authenticated
  using (status = 'published');

-- ---------------------------------------------------------
-- Storage: bucket público 'media' para portadas de blog e
-- imágenes de casos (idempotente). El proyecto ya usa otros
-- buckets; éste es público para servir imágenes directamente.
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists media_public_read on storage.objects;
create policy media_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'media');

-- Fuerza recarga del schema cache de PostgREST.
notify pgrst, 'reload schema';
