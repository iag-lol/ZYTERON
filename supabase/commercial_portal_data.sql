-- =====================================================================
-- Datos del portal comercial: prospectos, comisiones y estados mensuales
-- =====================================================================
-- Cada fila pertenece a un usuario comercial (owner_id). El aislamiento se
-- aplica en el backend (service role + filtro por owner). RLS activada sin
-- políticas anon → los datos nunca se exponen con la anon key.
--
-- Idempotente y reversible. Requiere commercial_users.sql previo.
-- =====================================================================

-- ---------- Prospectos / Referidos -----------------------------------
create table if not exists public.commercial_leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.commercial_users(id) on delete cascade,
  kind text not null default 'person',          -- person | company
  name text not null,
  rut text,
  contact_name text,
  email text,
  phone text,
  region text,
  comuna text,
  website text,
  industry text,
  service text,
  budget text,
  deadline text,
  interest text,                                 -- bajo | medio | alto
  description text,
  source text,
  validation_status text not null default 'pending',  -- pending | in_review | potential | accepted | rejected | duplicate
  commercial_status text not null default 'registered', -- registered | contacted | follow_up | meeting_scheduled | proposal_sent | negotiation | won | lost | no_response
  admin_notes text,
  last_contact_at timestamptz,
  next_follow_up_at timestamptz,
  validated_at timestamptz,
  validated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.commercial_leads add column if not exists admin_notes text;
alter table public.commercial_leads add column if not exists last_contact_at timestamptz;
alter table public.commercial_leads add column if not exists next_follow_up_at timestamptz;
alter table public.commercial_leads add column if not exists validated_at timestamptz;
alter table public.commercial_leads add column if not exists validated_by text;
create index if not exists commercial_leads_owner_idx on public.commercial_leads (owner_id, created_at desc);
create index if not exists commercial_leads_rut_idx on public.commercial_leads (rut);
create index if not exists commercial_leads_email_idx on public.commercial_leads (email);
create index if not exists commercial_leads_validation_idx on public.commercial_leads (validation_status, updated_at desc);
create index if not exists commercial_leads_follow_up_idx on public.commercial_leads (owner_id, next_follow_up_at);

-- ---------- Bitácora de contactos y avances --------------------------
-- El ejecutivo/partner informa aquí cada llamada, correo, WhatsApp, reunión
-- o cambio de etapa. El admin también deja trazabilidad de sus evaluaciones.
create table if not exists public.commercial_lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.commercial_leads(id) on delete cascade,
  owner_id uuid not null references public.commercial_users(id) on delete cascade,
  actor_type text not null default 'commercial', -- commercial | admin
  actor_id text,
  activity_type text not null,                   -- call | whatsapp | email | meeting | note | status_change | evaluation
  outcome text,
  notes text not null,
  from_status text,
  to_status text,
  occurred_at timestamptz not null default now(),
  next_follow_up_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists commercial_lead_activities_lead_idx
  on public.commercial_lead_activities (lead_id, occurred_at desc);
create index if not exists commercial_lead_activities_owner_idx
  on public.commercial_lead_activities (owner_id, occurred_at desc);

-- ---------- Comisiones (las genera el admin/motor por fase) ----------
create table if not exists public.commercial_commissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.commercial_users(id) on delete cascade,
  project_ref text,
  client_name text,
  base_amount bigint not null default 0,         -- base neta comisionable (CLP)
  percentage numeric not null default 0,
  gross_amount bigint not null default 0,        -- comisión bruta (CLP)
  status text not null default 'pending',        -- pending | approved | paid | adjusted
  period text,                                   -- YYYY-MM
  created_at timestamptz not null default now()
);
create index if not exists commercial_commissions_owner_idx on public.commercial_commissions (owner_id, created_at desc);

-- ---------- Estados mensuales (PDF) ----------------------------------
create table if not exists public.commercial_statements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.commercial_users(id) on delete cascade,
  period text not null,                          -- YYYY-MM
  folio text,
  gross_total bigint not null default 0,
  retention bigint not null default 0,
  net_total bigint not null default 0,
  status text not null default 'issued',         -- issued | paid
  pdf_path text,
  created_at timestamptz not null default now()
);
create index if not exists commercial_statements_owner_idx on public.commercial_statements (owner_id, period desc);

-- ---------- updated_at ------------------------------------------------
drop trigger if exists commercial_leads_touch on public.commercial_leads;
create trigger commercial_leads_touch
  before update on public.commercial_leads
  for each row execute function public.commercial_touch_updated_at();

-- ---------- RLS (solo backend) ---------------------------------------
do $$
declare t text;
begin
  foreach t in array array['commercial_leads','commercial_lead_activities','commercial_commissions','commercial_statements'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- =====================================================================
-- REVERSIBLE:
-- drop table if exists public.commercial_statements cascade;
-- drop table if exists public.commercial_commissions cascade;
-- drop table if exists public.commercial_lead_activities cascade;
-- drop table if exists public.commercial_leads cascade;
-- =====================================================================
