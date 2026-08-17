-- ============================================================================
-- ZARA — EJECUTIVO COMERCIAL IA
-- ----------------------------------------------------------------------------
-- Migración idempotente: se puede ejecutar varias veces sin destruir datos.
-- NO elimina ni altera tablas existentes (Lead, Cliente, Cotizacion, etc.).
-- Todas las tablas nuevas usan el prefijo sales_ para aislarlas del resto.
--
-- ROLLBACK: al final del archivo hay un bloque comentado con los DROP en el
-- orden correcto de dependencias.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tipos enumerados (como CHECK constraints para permitir evolución simple)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. EMPRESAS / PROSPECTOS (CRM)
-- ---------------------------------------------------------------------------
create table if not exists public.sales_companies (
  id uuid primary key default gen_random_uuid(),

  -- Identificación
  name text not null,
  legal_name text,
  tax_id text,                        -- RUT
  industry text,                      -- rubro
  commune text,
  region text,
  country text default 'Chile',
  website text,
  website_domain text,                -- normalizado para deduplicar

  -- Contacto
  primary_email text,
  secondary_emails text[] default '{}',
  phone text,
  whatsapp text,
  contact_name text,
  contact_role text,
  linkedin_url text,
  instagram_url text,

  -- Comercial
  source text default 'MANUAL',       -- MANUAL | IMPORT | WEB | CHAT_IA | WHATSAPP
  owner_user text,                    -- responsable
  notes text,
  detected_problem text,
  recommended_service text,
  score integer default 0 check (score between 0 and 100),
  potential text default 'MEDIO' check (potential in ('BAJO','MEDIO','POTENCIAL','ALTO')),
  status text default 'NUEVO' check (status in (
    'NUEVO','INVESTIGADO','CONTACTADO','RESPONDIO','INTERESADO',
    'PRESUPUESTO_ENVIADO','NEGOCIACION','GANADO','PERDIDO','EN_PAUSA'
  )),

  -- Seguimiento
  last_interaction_at timestamptz,
  next_action text,
  next_action_at timestamptz,
  potential_value numeric(14,2),

  -- Vínculos con módulos existentes (sin FK dura para no acoplar esquemas)
  linked_quote_id text,
  linked_client_id text,
  linked_lead_id text,

  -- Cierre
  lost_reason text,
  lost_comment text,
  closed_at timestamptz,

  -- Control de contacto
  do_not_contact boolean not null default false,
  do_not_contact_at timestamptz,
  do_not_contact_reason text,

  import_batch_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.sales_companies is 'CRM comercial de Zara: empresas y prospectos.';

create unique index if not exists sales_companies_email_uidx
  on public.sales_companies (lower(primary_email)) where primary_email is not null;
create index if not exists sales_companies_domain_idx on public.sales_companies (website_domain);
create index if not exists sales_companies_status_idx on public.sales_companies (status);
create index if not exists sales_companies_potential_idx on public.sales_companies (potential);
create index if not exists sales_companies_name_idx on public.sales_companies (lower(name));
create index if not exists sales_companies_taxid_idx on public.sales_companies (tax_id) where tax_id is not null;
create index if not exists sales_companies_next_action_idx on public.sales_companies (next_action_at)
  where next_action_at is not null;

-- ---------------------------------------------------------------------------
-- 2. LÍNEA DE TIEMPO / HISTORIAL (append-only)
-- ---------------------------------------------------------------------------
create table if not exists public.sales_events (
  id bigserial primary key,
  company_id uuid references public.sales_companies(id) on delete cascade,
  event_type text not null,           -- COMPANY_CREATED | EMAIL_SENT | EMAIL_RECEIVED | ...
  title text not null,
  detail text,
  payload jsonb default '{}'::jsonb,
  actor text default 'SYSTEM',        -- SYSTEM | ZARA | nombre de usuario admin
  is_automated boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.sales_events is 'Historial append-only. Nunca se borra al cambiar de estado.';

create index if not exists sales_events_company_idx on public.sales_events (company_id, created_at desc);
create index if not exists sales_events_type_idx on public.sales_events (event_type, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. IMPORTACIONES (lotes, para trazabilidad)
-- ---------------------------------------------------------------------------
create table if not exists public.sales_import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text,
  total_rows integer default 0,
  imported_rows integer default 0,
  duplicate_rows integer default 0,
  invalid_rows integer default 0,
  column_mapping jsonb default '{}'::jsonb,
  status text default 'PENDIENTE' check (status in ('PENDIENTE','PROCESADO','ERROR')),
  error_detail text,
  created_by text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. HILOS Y MENSAJES DE CORREO (Microsoft Graph)
-- ---------------------------------------------------------------------------
create table if not exists public.sales_threads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.sales_companies(id) on delete set null,
  graph_conversation_id text,          -- ID real de Microsoft
  subject text,
  participants text[] default '{}',
  last_message_at timestamptz,
  message_count integer default 0,
  awaiting_reply boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sales_threads_graph_uidx
  on public.sales_threads (graph_conversation_id) where graph_conversation_id is not null;
create index if not exists sales_threads_company_idx on public.sales_threads (company_id);

create table if not exists public.sales_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.sales_threads(id) on delete cascade,
  company_id uuid references public.sales_companies(id) on delete set null,
  graph_message_id text,               -- ID real de Microsoft
  graph_internet_message_id text,
  direction text not null check (direction in ('INBOUND','OUTBOUND')),
  from_email text,
  from_name text,
  to_emails text[] default '{}',
  subject text,
  body_preview text,
  body_text text,
  has_attachments boolean not null default false,
  sent_at timestamptz,

  -- Análisis de Zara
  ai_analyzed boolean not null default false,
  ai_intent text,
  ai_confidence numeric(4,3),
  ai_summary text,
  ai_recommended_action text,
  ai_requires_human boolean,
  ai_reason text,

  created_at timestamptz not null default now()
);

create unique index if not exists sales_messages_graph_uidx
  on public.sales_messages (graph_message_id) where graph_message_id is not null;
create index if not exists sales_messages_thread_idx on public.sales_messages (thread_id, sent_at);
create index if not exists sales_messages_pending_idx on public.sales_messages (ai_analyzed, direction)
  where direction = 'INBOUND';

-- ---------------------------------------------------------------------------
-- 5. BORRADORES DE RESPUESTA (aprobación humana)
-- ---------------------------------------------------------------------------
create table if not exists public.sales_drafts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.sales_companies(id) on delete cascade,
  thread_id uuid references public.sales_threads(id) on delete set null,
  in_reply_to_message_id uuid references public.sales_messages(id) on delete set null,
  subject text,
  body text not null,
  confidence numeric(4,3),
  requires_approval boolean not null default true,
  status text not null default 'PENDIENTE'
    check (status in ('PENDIENTE','APROBADO','ENVIADO','DESCARTADO','ERROR')),
  approved_by text,
  approved_at timestamptz,
  sent_at timestamptz,
  error_detail text,
  created_at timestamptz not null default now()
);

create index if not exists sales_drafts_status_idx on public.sales_drafts (status, created_at desc);

-- ---------------------------------------------------------------------------
-- 6. SEGUIMIENTOS (motor por reglas, sin IA)
-- ---------------------------------------------------------------------------
create table if not exists public.sales_followups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.sales_companies(id) on delete cascade,
  thread_id uuid references public.sales_threads(id) on delete set null,
  sequence_step integer not null default 1,
  scheduled_for timestamptz not null,
  status text not null default 'PENDIENTE'
    check (status in ('PENDIENTE','ENVIADO','CANCELADO','OMITIDO')),
  cancel_reason text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists sales_followups_due_idx on public.sales_followups (status, scheduled_for)
  where status = 'PENDIENTE';
create index if not exists sales_followups_company_idx on public.sales_followups (company_id);

-- ---------------------------------------------------------------------------
-- 7. CAMPAÑAS
-- ---------------------------------------------------------------------------
create table if not exists public.sales_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'BORRADOR'
    check (status in ('BORRADOR','ACTIVA','PAUSADA','FINALIZADA')),
  filters jsonb default '{}'::jsonb,
  daily_limit integer default 20,
  send_window_start time default '09:00',
  send_window_end time default '18:00',
  business_days_only boolean not null default true,
  total_targets integer default 0,
  sent_count integer default 0,
  reply_count integer default 0,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales_campaign_targets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.sales_campaigns(id) on delete cascade,
  company_id uuid not null references public.sales_companies(id) on delete cascade,
  status text not null default 'PENDIENTE'
    check (status in ('PENDIENTE','ENVIADO','RESPONDIO','EXCLUIDO','ERROR')),
  excluded_reason text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, company_id)
);

create index if not exists sales_campaign_targets_status_idx
  on public.sales_campaign_targets (campaign_id, status);

-- ---------------------------------------------------------------------------
-- 8. PRESUPUESTOS COMERCIALES (referencia; la cotización real vive en su módulo)
-- ---------------------------------------------------------------------------
create table if not exists public.sales_proposals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.sales_companies(id) on delete cascade,
  quote_id text,                       -- vínculo con Cotizacion existente
  title text,
  amount numeric(14,2),
  currency text default 'CLP',
  status text not null default 'BORRADOR'
    check (status in ('BORRADOR','ENVIADO','ACEPTADO','RECHAZADO','VENCIDO')),
  sent_at timestamptz,
  responded_at timestamptz,
  valid_until date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_proposals_company_idx on public.sales_proposals (company_id);
create index if not exists sales_proposals_status_idx on public.sales_proposals (status);

-- ---------------------------------------------------------------------------
-- 9. REGISTRO DE ACTIVIDAD IA (auditoría + costos)
-- ---------------------------------------------------------------------------
create table if not exists public.sales_ai_activity (
  id bigserial primary key,
  company_id uuid references public.sales_companies(id) on delete set null,
  action text not null,                -- ANALYZE_EMAIL | DRAFT_REPLY | SCORE_LEAD | ...
  model text,
  prompt_tokens integer default 0,
  completion_tokens integer default 0,
  total_tokens integer default 0,
  estimated_cost_usd numeric(12,6) default 0,
  confidence numeric(4,3),
  result text,                         -- OK | ERROR | SKIPPED
  is_automated boolean not null default true,
  approved_by text,
  error_detail text,
  created_at timestamptz not null default now()
);

create index if not exists sales_ai_activity_created_idx on public.sales_ai_activity (created_at desc);
create index if not exists sales_ai_activity_company_idx on public.sales_ai_activity (company_id);

-- ---------------------------------------------------------------------------
-- 10. CONFIGURACIÓN (clave/valor versionable, incluye prompt de Zara)
-- ---------------------------------------------------------------------------
create table if not exists public.sales_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by text,
  updated_at timestamptz not null default now()
);

-- Valores por defecto: conservadores, con autonomía desactivada (Etapa 1).
insert into public.sales_settings (key, value, description) values
  ('zara_paused', 'false'::jsonb,
   'Botón de emergencia. Si es true, se detienen envíos, respuestas y campañas automáticas.'),
  ('auto_reply_enabled', 'false'::jsonb,
   'Permite respuesta automática sin aprobación cuando la confianza supera el umbral.'),
  ('auto_reply_min_confidence', '0.93'::jsonb,
   'Confianza mínima para responder automáticamente.'),
  ('approval_min_confidence', '0.80'::jsonb,
   'Bajo este valor no se prepara borrador; se notifica al administrador.'),
  ('daily_send_limit', '30'::jsonb, 'Máximo de correos comerciales por día.'),
  ('hourly_send_limit', '10'::jsonb, 'Máximo de correos comerciales por hora.'),
  ('followup_days', '[3, 7, 14]'::jsonb, 'Días de seguimiento tras el contacto inicial.'),
  ('dormant_days', '5'::jsonb, 'Días sin respuesta para considerar una oportunidad dormida.'),
  ('ai_monthly_budget_usd', '20'::jsonb, 'Presupuesto mensual de IA en dólares.'),
  ('ai_daily_budget_usd', '2'::jsonb, 'Presupuesto diario de IA en dólares.'),
  ('ai_model', '"gpt-4o-mini"'::jsonb, 'Modelo usado por Zara.'),
  ('ai_model_prices', '{"gpt-4o-mini":{"input":0.15,"output":0.60},"gpt-4o":{"input":2.50,"output":10.00}}'::jsonb,
   'Precio por millón de tokens. Configurable: NO hardcodear en código.'),
  ('test_mode', 'true'::jsonb,
   'En modo prueba no se envían correos a prospectos reales.'),
  ('test_mode_recipient', '""'::jsonb,
   'Correo autorizado que recibe todos los envíos mientras test_mode esté activo.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 11. CONTROL DE GASTO DIARIO (agregado, para consultas baratas)
-- ---------------------------------------------------------------------------
create table if not exists public.sales_ai_budget_usage (
  usage_date date primary key,
  total_tokens bigint not null default 0,
  estimated_cost_usd numeric(12,6) not null default 0,
  call_count integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 12. LISTA DE NO CONTACTAR (opt-out global por dirección)
-- ---------------------------------------------------------------------------
create table if not exists public.sales_opt_outs (
  email text primary key,
  reason text,
  source text default 'MANUAL',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 13. CONEXIÓN MICROSOFT GRAPH (tokens cifrados a nivel aplicación)
-- ---------------------------------------------------------------------------
create table if not exists public.sales_mail_account (
  id text primary key default 'default',
  user_principal_name text,
  display_name text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  subscription_id text,
  subscription_expires_at timestamptz,
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

comment on table public.sales_mail_account is
  'Tokens de Microsoft Graph. Se guardan cifrados por la aplicación; nunca en texto plano.';

-- ---------------------------------------------------------------------------
-- Trigger de updated_at
-- ---------------------------------------------------------------------------
create or replace function public.sales_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'sales_companies','sales_threads','sales_campaigns','sales_proposals','sales_mail_account'
  ] loop
    execute format(
      'drop trigger if exists %I_touch on public.%I; '
      'create trigger %I_touch before update on public.%I '
      'for each row execute function public.sales_touch_updated_at();',
      t, t, t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS: todo el acceso pasa por el backend con service role. Sin políticas
-- públicas, ningún cliente anónimo puede leer datos comerciales.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'sales_companies','sales_events','sales_import_batches','sales_threads',
    'sales_messages','sales_drafts','sales_followups','sales_campaigns',
    'sales_campaign_targets','sales_proposals','sales_ai_activity',
    'sales_settings','sales_ai_budget_usage','sales_opt_outs','sales_mail_account'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- ============================================================================
-- ROLLBACK (ejecutar solo si se desea desinstalar por completo el módulo)
-- ----------------------------------------------------------------------------
-- drop table if exists public.sales_campaign_targets cascade;
-- drop table if exists public.sales_campaigns cascade;
-- drop table if exists public.sales_drafts cascade;
-- drop table if exists public.sales_followups cascade;
-- drop table if exists public.sales_proposals cascade;
-- drop table if exists public.sales_messages cascade;
-- drop table if exists public.sales_threads cascade;
-- drop table if exists public.sales_ai_activity cascade;
-- drop table if exists public.sales_ai_budget_usage cascade;
-- drop table if exists public.sales_opt_outs cascade;
-- drop table if exists public.sales_mail_account cascade;
-- drop table if exists public.sales_import_batches cascade;
-- drop table if exists public.sales_events cascade;
-- drop table if exists public.sales_companies cascade;
-- drop table if exists public.sales_settings cascade;
-- drop function if exists public.sales_touch_updated_at();
-- ============================================================================
