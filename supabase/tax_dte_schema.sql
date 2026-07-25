-- =====================================================================
-- FASE 1 — Facturación Electrónica (DTE) Zyteron · Esquema base
-- =====================================================================
-- Tablas fundacionales del motor DTE. NO emite documentos por sí sola:
-- es la base para construir XML, firma, CAF/folios y certificación.
--
-- Seguridad: RLS activado en todas. NO hay políticas para anon/authenticated,
-- por lo que SOLO el backend con service role puede leer/escribir (los datos
-- tributarios no se exponen al navegador con el anon key).
--
-- Idempotente y reversible (ver bloque DROP comentado al final).
-- Aplicar en Supabase -> SQL Editor -> Run.
-- =====================================================================

-- ---------- Configuración tributaria (una fila por ambiente) ---------
create table if not exists public.tax_settings (
  id uuid primary key default gen_random_uuid(),
  environment text not null,                 -- 'certification' | 'production'
  company_rut text not null,
  company_name text not null,
  company_giro text,
  company_address text,
  company_comuna text,
  company_city text,
  company_acteco text,                       -- código actividad económica
  resolution_number text,                    -- N° resolución SII
  resolution_date date,
  active_certificate_id uuid,
  email_from text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (environment)
);

-- ---------- Certificado digital (PFX/P12) ----------------------------
-- La clave privada y la contraseña se guardan CIFRADAS (AES-256-GCM) por el
-- backend. NUNCA en texto plano. Nunca se exponen ni se descargan.
create table if not exists public.tax_certificates (
  id uuid primary key default gen_random_uuid(),
  environment text not null,
  holder_name text,
  holder_rut text,
  issuer text,
  serial_number text,
  valid_from timestamptz,
  valid_to timestamptz,
  storage_path text,                         -- ruta cifrada en storage privado
  password_ciphertext text,                  -- contraseña cifrada (no texto plano)
  password_iv text,
  password_tag text,
  status text not null default 'valid',      -- valid | expiring | expired | invalid
  uploaded_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- CAF (autorización de folios del SII) ---------------------
create table if not exists public.tax_caf_files (
  id uuid primary key default gen_random_uuid(),
  environment text not null,
  document_type integer not null,            -- 33,34,39,41,52,56,61
  caf_xml text not null,                      -- XML CAF ORIGINAL (se preserva tal cual)
  range_start integer not null,
  range_end integer not null,
  current_folio integer not null,            -- último folio usado (next = current+1)
  issued_at date,
  status text not null default 'active',     -- active | exhausted | blocked | invalid
  uploaded_by text,
  created_at timestamptz not null default now(),
  check (range_end >= range_start),
  check (current_folio >= range_start - 1 and current_folio <= range_end)
);
create index if not exists tax_caf_type_env_idx on public.tax_caf_files (document_type, environment, status);

-- ---------- Documentos tributarios (DTE) -----------------------------
create table if not exists public.tax_documents (
  id uuid primary key default gen_random_uuid(),
  document_type integer not null,
  folio integer,
  environment text not null,
  issue_date date not null default current_date,
  due_date date,
  customer_id text,                          -- User.id (opcional)
  customer_tax_profile_id uuid,
  quote_id text,                             -- Quote.id
  work_order_id text,                        -- WorkOrder.id
  currency text not null default 'CLP',
  net_amount bigint not null default 0,
  exempt_amount bigint not null default 0,
  tax_amount bigint not null default 0,
  total_amount bigint not null default 0,
  internal_status text not null default 'draft',
  sii_status text not null default 'not_sent',
  commercial_status text not null default 'pending_payment',
  track_id text,
  caf_id uuid,
  certificate_id uuid,
  xml_original_path text,
  xml_signed_path text,
  envelope_path text,
  sii_response_path text,
  pdf_path text,
  idempotency_key text not null,
  observations text,
  payment_condition text,
  created_by text,
  approved_by text,
  emitted_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (net_amount >= 0 and exempt_amount >= 0 and tax_amount >= 0 and total_amount >= 0),
  unique (idempotency_key),
  unique (environment, document_type, folio)
);
create index if not exists tax_doc_type_idx on public.tax_documents (document_type, environment);
create index if not exists tax_doc_customer_idx on public.tax_documents (customer_id);
create index if not exists tax_doc_status_idx on public.tax_documents (internal_status, sii_status);
create index if not exists tax_doc_created_idx on public.tax_documents (created_at desc);

-- ---------- Ítems del documento --------------------------------------
create table if not exists public.tax_document_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.tax_documents(id) on delete cascade,
  line_number integer not null,
  code text,
  description text not null,
  quantity numeric not null default 1,
  unit text,
  unit_price bigint not null default 0,
  discount_pct numeric not null default 0,
  surcharge_pct numeric not null default 0,
  is_exempt boolean not null default false,
  line_total bigint not null default 0,
  check (quantity >= 0 and unit_price >= 0 and line_total >= 0)
);
create index if not exists tax_item_doc_idx on public.tax_document_items (document_id, line_number);

-- ---------- Referencias tributarias ----------------------------------
create table if not exists public.tax_document_references (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.tax_documents(id) on delete cascade,
  reference_type text,                       -- 'quote','order','contract','dte',...
  reference_doc_type integer,                -- tipo DTE referenciado (si aplica)
  reference_folio text,
  reference_date date,
  reference_code text,                       -- 1=anula, 2=corrige texto, 3=corrige montos
  reason text
);
create index if not exists tax_ref_doc_idx on public.tax_document_references (document_id);

-- ---------- Historial de estados (INMUTABLE, append-only) ------------
create table if not exists public.tax_document_status_history (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.tax_documents(id) on delete cascade,
  status_kind text not null,                 -- 'internal' | 'sii' | 'commercial'
  status_value text not null,
  detail text,
  actor text,
  created_at timestamptz not null default now()
);
create index if not exists tax_status_doc_idx on public.tax_document_status_history (document_id, created_at);

-- ---------- Ficha tributaria del cliente -----------------------------
create table if not exists public.tax_customer_profiles (
  id uuid primary key default gen_random_uuid(),
  customer_id text,                          -- User.id (opcional)
  rut text not null,
  razon_social text not null,
  nombre_fantasia text,
  giro text,
  acteco text,
  direccion text,
  comuna text,
  ciudad text,
  region text,
  email_tributario text,
  telefono text,
  tipo_cliente text,
  afecto boolean not null default true,
  condicion_pago text,
  contacto_admin text,
  contacto_cobranza text,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rut)
);

-- ---------- Auditoría inmutable --------------------------------------
create table if not exists public.tax_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  ip text,
  action text not null,
  entity text,
  entity_id text,
  before_value jsonb,
  after_value jsonb,
  result text,
  reason text,
  correlation_id text,
  created_at timestamptz not null default now()
);
create index if not exists tax_audit_entity_idx on public.tax_audit_logs (entity, entity_id, created_at desc);

-- ---------- updated_at automático ------------------------------------
create or replace function public.tax_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

do $$
declare t text;
begin
  foreach t in array array['tax_settings','tax_certificates','tax_documents','tax_customer_profiles'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.tax_touch_updated_at()', t || '_touch', t);
  end loop;
end $$;

-- ---------- Asignación TRANSACCIONAL de folio (anti-duplicado) -------
-- Bloquea la fila del CAF activo (FOR UPDATE) y entrega el siguiente folio.
-- Garantiza que dos procesos NUNCA tomen el mismo folio.
create or replace function public.assign_next_folio(p_document_type integer, p_environment text)
returns integer
language plpgsql
as $$
declare
  v_caf public.tax_caf_files%rowtype;
  v_next integer;
begin
  select * into v_caf
  from public.tax_caf_files
  where document_type = p_document_type
    and environment = p_environment
    and status = 'active'
    and current_folio < range_end
  order by range_start asc
  limit 1
  for update;

  if not found then
    raise exception 'NO_FOLIOS_DISPONIBLES para tipo % en ambiente %', p_document_type, p_environment
      using errcode = 'P0001';
  end if;

  v_next := greatest(v_caf.current_folio + 1, v_caf.range_start);

  update public.tax_caf_files
  set current_folio = v_next,
      status = case when v_next >= range_end then 'exhausted' else status end
  where id = v_caf.id;

  return v_next;
end;
$$;

-- ---------- RLS (solo backend / service role) ------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'tax_settings','tax_certificates','tax_caf_files','tax_documents','tax_document_items',
    'tax_document_references','tax_document_status_history','tax_customer_profiles','tax_audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    -- Sin políticas: solo el service role (backend) puede acceder.
  end loop;
end $$;

-- =====================================================================
-- REVERSIBLE:
-- drop function if exists public.assign_next_folio(integer, text);
-- drop table if exists public.tax_document_status_history cascade;
-- drop table if exists public.tax_document_references cascade;
-- drop table if exists public.tax_document_items cascade;
-- drop table if exists public.tax_documents cascade;
-- drop table if exists public.tax_caf_files cascade;
-- drop table if exists public.tax_certificates cascade;
-- drop table if exists public.tax_customer_profiles cascade;
-- drop table if exists public.tax_audit_logs cascade;
-- drop table if exists public.tax_settings cascade;
-- drop function if exists public.tax_touch_updated_at cascade;
-- =====================================================================
