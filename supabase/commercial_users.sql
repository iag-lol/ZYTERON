-- =====================================================================
-- Usuarios comerciales (Partners / Ejecutivos / Gestores) — Zyteron
-- =====================================================================
-- Credenciales por RUT + contraseña (hash bcrypt) gestionadas desde el admin.
-- El acceso de estos usuarios es SEPARADO del admin (que sigue con su login por
-- contraseña). No modifica la tabla User ni la autenticación existente.
--
-- Seguridad: RLS activada SIN políticas para anon/authenticated → solo el backend
-- (service role) accede. La contraseña se guarda solo como hash.
--
-- Idempotente y reversible. Aplicar en Supabase → SQL Editor → Run.
-- =====================================================================

create table if not exists public.commercial_users (
  id uuid primary key default gen_random_uuid(),
  rut text unique not null,                     -- canónico: 12345678-9
  name text not null,
  email text,
  phone text,
  role text not null default 'partner',         -- executive | portfolio | partner
  password_hash text not null,
  status text not null default 'active',        -- active | suspended | invited
  commission_pct numeric not null default 0,
  must_change_password boolean not null default false,
  bank_info text,
  notes text,
  last_login_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commercial_users_rut_idx on public.commercial_users (rut);
create index if not exists commercial_users_status_idx on public.commercial_users (status);
create index if not exists commercial_users_role_idx on public.commercial_users (role);

create or replace function public.commercial_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists commercial_users_touch on public.commercial_users;
create trigger commercial_users_touch
  before update on public.commercial_users
  for each row execute function public.commercial_touch_updated_at();

do $$
begin
  alter table public.commercial_users enable row level security;
exception when others then null;
end $$;

-- =====================================================================
-- REVERSIBLE:
-- drop table if exists public.commercial_users cascade;
-- drop function if exists public.commercial_touch_updated_at cascade;
-- =====================================================================
