-- =====================================================================
-- Zyteron · Contratos de ejecutivos comerciales y partners
-- =====================================================================
-- Amplía el módulo comercial existente con la gestión documental del
-- vínculo: generación del contrato, envío, recepción de la copia firmada,
-- validación e historial de versiones.
--
-- DECISIONES DE DISEÑO
--
--  · Se reutiliza `commercial_users` como ficha de la persona. No se crea
--    ninguna tabla de perfiles ni se duplican ejecutivos o partners.
--  · Se reutiliza `commercial_audit_log` para toda la trazabilidad
--    (apertura, edición, generación, descarga, envío, firma, anulación).
--    Por eso NO se crea una tabla de eventos aparte.
--  · Las plantillas jurídicas viven en el código (versionadas en git), no
--    en base de datos: el texto aprobado no debe poder alterarse desde el
--    panel. Cada contrato guarda qué plantilla y qué versión se usó.
--  · Las versiones del contrato se resuelven con `version` +
--    `supersedes_id` sobre esta misma tabla, sin una tabla adicional.
--
-- Requiere: commercial_users.sql, commercial_portal_data.sql y
-- commercial_pro_upgrade.sql.
--
-- Idempotente y reversible. Aplicar en Supabase → SQL Editor → Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1 · Contratos
-- ---------------------------------------------------------------------
create table if not exists public.commercial_contracts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.commercial_users(id) on delete cascade,

  -- Identificación del documento
  contract_number text unique,                  -- ZY-EC-2026-00001 / ZY-PT-2026-00001
  contract_type text not null,                  -- executive_services | partner_agreement
  profile_role text not null,                   -- rol del usuario al momento de generar
  template_id text not null,
  template_version text not null,
  version integer not null default 1,
  supersedes_id uuid references public.commercial_contracts(id) on delete set null,

  -- Estado del ciclo de vida
  status text not null default 'draft',
  -- draft | ready | generated | sent | received | signed_pending | signed
  -- | validated | rejected | superseded | cancelled | terminated

  -- Configuración contractual (lo que el administrador puede ajustar)
  city text,
  contract_date date,
  start_date date,
  functional_role text,
  commission_percentage numeric,
  commission_base text,
  notice_days integer,
  commission_tail_days integer,
  validity text,
  signature_method text,
  corporate_email text,
  include_bank_annex boolean not null default true,
  observations text,
  representative_name text,
  representative_rut text,

  -- Copia inmutable de los datos usados al generar el PDF. Deja constancia
  -- de qué decía el contrato aunque la ficha cambie después.
  snapshot jsonb,

  -- Documento original
  pdf_path text,
  pdf_hash text,
  pdf_filename text,
  generated_by text,
  generated_at timestamptz,

  -- Envío
  sent_at timestamptz,
  sent_to text,

  -- Copia firmada
  signed_pdf_path text,
  signed_pdf_hash text,
  signature_type text,                          -- simple | advanced | handwritten
  signed_at timestamptz,
  received_by text,
  signature_notes text,

  -- Validación administrativa
  validated_at timestamptz,
  validated_by text,
  rejection_reason text,

  -- Cierre del vínculo
  terminated_at timestamptz,
  termination_reason text,

  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commercial_contracts_owner_idx
  on public.commercial_contracts (owner_id, created_at desc);
create index if not exists commercial_contracts_status_idx
  on public.commercial_contracts (status, updated_at desc);
create index if not exists commercial_contracts_number_idx
  on public.commercial_contracts (contract_number);

-- Un solo contrato vigente (no reemplazado ni anulado) por persona.
create unique index if not exists commercial_contracts_active_uidx
  on public.commercial_contracts (owner_id)
  where status not in ('superseded', 'cancelled', 'terminated', 'rejected');

drop trigger if exists commercial_contracts_touch on public.commercial_contracts;
create trigger commercial_contracts_touch
  before update on public.commercial_contracts
  for each row execute function public.commercial_touch_updated_at();

-- ---------------------------------------------------------------------
-- 2 · Registro de correos enviados
-- ---------------------------------------------------------------------
-- Guarda copia exacta de cada envío y reenvío, con el identificador del
-- proveedor y el error cuando la entrega falla. Un envío fallido nunca
-- marca el contrato como enviado.
create table if not exists public.commercial_contract_email_logs (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.commercial_contracts(id) on delete cascade,
  owner_id uuid references public.commercial_users(id) on delete set null,
  recipient text not null,
  cc text,
  subject text not null,
  body text,
  attachment_name text,
  provider text not null default 'resend',
  provider_message_id text,
  status text not null default 'queued',        -- queued | sent | failed
  error_message text,
  attempt integer not null default 1,
  sent_by text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists commercial_contract_email_logs_contract_idx
  on public.commercial_contract_email_logs (contract_id, created_at desc);

-- ---------------------------------------------------------------------
-- 3 · RLS: los contratos solo se leen desde el backend (service role)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['commercial_contracts','commercial_contract_email_logs'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4 · Almacenamiento privado de los PDF
-- ---------------------------------------------------------------------
-- El bucket se crea desde el backend si no existe, siempre privado. Los
-- documentos jamás se exponen por URL pública: se entregan con enlaces
-- firmados de vigencia corta.
insert into storage.buckets (id, name, public)
values ('commercial-contracts', 'commercial-contracts', false)
on conflict (id) do update set public = false;

-- =====================================================================
-- REVERSIBLE:
-- drop table if exists public.commercial_contract_email_logs cascade;
-- drop table if exists public.commercial_contracts cascade;
-- delete from storage.buckets where id = 'commercial-contracts';
-- =====================================================================
