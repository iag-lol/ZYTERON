-- =====================================================================
-- Zyteron · Upgrade profesional del área Comercial (Ejecutivos y Partners)
-- =====================================================================
-- Amplía el módulo comercial existente con:
--   1. Ficha personal completa del ejecutivo (datos, dirección, contrato)
--   2. Datos bancarios para el pago de comisiones
--   3. Metas mensuales por ejecutivo (para medir avance real)
--   4. Comisiones enlazadas al prospecto que las originó
--   5. Liquidaciones mensuales con retención, neto y estado de pago
--   6. Bitácora de auditoría (quién hizo qué, cuándo y sobre qué)
--   7. Notificaciones internas para el portal del ejecutivo
--
-- Requiere haber corrido antes:
--   supabase/commercial_users.sql
--   supabase/commercial_portal_data.sql
--
-- Idempotente y reversible. Aplicar en Supabase → SQL Editor → Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1 · Ficha personal, laboral y bancaria del usuario comercial
-- ---------------------------------------------------------------------
alter table public.commercial_users add column if not exists position text;              -- cargo interno
alter table public.commercial_users add column if not exists contract_type text;          -- honorarios | colaborador | partner
alter table public.commercial_users add column if not exists started_at date;             -- fecha de inicio
alter table public.commercial_users add column if not exists birth_date date;
alter table public.commercial_users add column if not exists address text;
alter table public.commercial_users add column if not exists comuna text;
alter table public.commercial_users add column if not exists region text;
alter table public.commercial_users add column if not exists emergency_contact_name text;
alter table public.commercial_users add column if not exists emergency_contact_phone text;

alter table public.commercial_users add column if not exists bank_name text;
alter table public.commercial_users add column if not exists bank_account_type text;      -- corriente | vista | ahorro | rut
alter table public.commercial_users add column if not exists bank_account_number text;
alter table public.commercial_users add column if not exists bank_account_holder text;
alter table public.commercial_users add column if not exists bank_account_rut text;
alter table public.commercial_users add column if not exists payment_email text;          -- correo para envío de liquidaciones

-- Metas mensuales: permiten mostrar avance real en el portal y en el admin.
alter table public.commercial_users add column if not exists goal_monthly_leads integer not null default 0;
alter table public.commercial_users add column if not exists goal_monthly_won integer not null default 0;
alter table public.commercial_users add column if not exists goal_monthly_amount bigint not null default 0;

-- Notas internas visibles solo para administración (distintas de `notes`).
alter table public.commercial_users add column if not exists internal_notes text;

-- ---------------------------------------------------------------------
-- 2 · Comisiones: trazabilidad completa del origen y del pago
-- ---------------------------------------------------------------------
alter table public.commercial_commissions add column if not exists lead_id uuid references public.commercial_leads(id) on delete set null;
alter table public.commercial_commissions add column if not exists statement_id uuid;
alter table public.commercial_commissions add column if not exists concept text;
alter table public.commercial_commissions add column if not exists notes text;
alter table public.commercial_commissions add column if not exists approved_at timestamptz;
alter table public.commercial_commissions add column if not exists approved_by text;
alter table public.commercial_commissions add column if not exists paid_at timestamptz;
alter table public.commercial_commissions add column if not exists created_by text;
alter table public.commercial_commissions add column if not exists updated_at timestamptz not null default now();

create index if not exists commercial_commissions_status_idx on public.commercial_commissions (status, period desc);
create index if not exists commercial_commissions_period_idx on public.commercial_commissions (owner_id, period desc);
create index if not exists commercial_commissions_statement_idx on public.commercial_commissions (statement_id);
create index if not exists commercial_commissions_lead_idx on public.commercial_commissions (lead_id);

drop trigger if exists commercial_commissions_touch on public.commercial_commissions;
create trigger commercial_commissions_touch
  before update on public.commercial_commissions
  for each row execute function public.commercial_touch_updated_at();

-- ---------------------------------------------------------------------
-- 3 · Liquidaciones mensuales
-- ---------------------------------------------------------------------
alter table public.commercial_statements add column if not exists retention_pct numeric not null default 0;
alter table public.commercial_statements add column if not exists adjustments bigint not null default 0;
alter table public.commercial_statements add column if not exists adjustments_note text;
alter table public.commercial_statements add column if not exists commissions_count integer not null default 0;
alter table public.commercial_statements add column if not exists issued_at timestamptz not null default now();
alter table public.commercial_statements add column if not exists paid_at timestamptz;
alter table public.commercial_statements add column if not exists payment_method text;       -- transferencia | otro
alter table public.commercial_statements add column if not exists payment_reference text;    -- n° de operación
alter table public.commercial_statements add column if not exists notes text;
alter table public.commercial_statements add column if not exists created_by text;
alter table public.commercial_statements add column if not exists updated_at timestamptz not null default now();

create index if not exists commercial_statements_status_idx on public.commercial_statements (status, period desc);
create unique index if not exists commercial_statements_owner_period_uidx
  on public.commercial_statements (owner_id, period);

drop trigger if exists commercial_statements_touch on public.commercial_statements;
create trigger commercial_statements_touch
  before update on public.commercial_statements
  for each row execute function public.commercial_touch_updated_at();

-- ---------------------------------------------------------------------
-- 4 · Bitácora de auditoría del área comercial
-- ---------------------------------------------------------------------
-- Registra toda acción relevante: alta y baja de usuarios, cambios de rol,
-- comisión, estado, evaluaciones, emisión y pago de liquidaciones.
create table if not exists public.commercial_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null default 'admin',      -- admin | commercial | system
  actor_id text,
  actor_name text,
  entity text not null,                          -- user | lead | commission | statement
  entity_id text,
  entity_label text,
  action text not null,                          -- created | updated | status_changed | password_reset | ...
  summary text not null,
  meta jsonb,
  owner_id uuid references public.commercial_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists commercial_audit_entity_idx on public.commercial_audit_log (entity, entity_id, created_at desc);
create index if not exists commercial_audit_owner_idx on public.commercial_audit_log (owner_id, created_at desc);
create index if not exists commercial_audit_created_idx on public.commercial_audit_log (created_at desc);

-- ---------------------------------------------------------------------
-- 5 · Notificaciones internas del portal comercial
-- ---------------------------------------------------------------------
create table if not exists public.commercial_notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.commercial_users(id) on delete cascade,
  kind text not null default 'info',             -- info | success | warning | payment | evaluation
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists commercial_notifications_owner_idx
  on public.commercial_notifications (owner_id, created_at desc);
create index if not exists commercial_notifications_unread_idx
  on public.commercial_notifications (owner_id, read_at);

-- ---------------------------------------------------------------------
-- 6 · RLS: los datos solo se leen desde el backend (service role)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['commercial_audit_log','commercial_notifications'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- =====================================================================
-- REVERSIBLE:
-- drop table if exists public.commercial_notifications cascade;
-- drop table if exists public.commercial_audit_log cascade;
-- (las columnas añadidas con `add column if not exists` pueden eliminarse
--  una a una con `alter table ... drop column if exists ...`)
-- =====================================================================
