-- ============================================================================
-- ZARA — FASE 2
-- ----------------------------------------------------------------------------
-- Correo (Graph), seguimientos, campañas y leads web.
-- Requiere haber ejecutado antes: supabase/sales_ai_zara.sql
-- Idempotente: se puede correr varias veces sin perder datos.
-- ============================================================================

-- 1. Rebotes: una dirección que rebota no debe recibir más envíos
alter table public.sales_companies
  add column if not exists email_invalid boolean not null default false;

alter table public.sales_companies
  add column if not exists email_invalid_at timestamptz;

-- 2. Oportunidades dormidas: momento en que se detectó y si ya se avisó
alter table public.sales_companies
  add column if not exists dormant_since timestamptz;

alter table public.sales_companies
  add column if not exists dormant_notified_at timestamptz;

create index if not exists sales_companies_dormant_idx
  on public.sales_companies (status, last_interaction_at)
  where status in ('INTERESADO','PRESUPUESTO_ENVIADO','NEGOCIACION');

-- 3. Campañas: remitente, plantilla y programación
alter table public.sales_campaigns
  add column if not exists template_subject text;

alter table public.sales_campaigns
  add column if not exists template_body text;

alter table public.sales_campaigns
  add column if not exists starts_at timestamptz;

alter table public.sales_campaigns
  add column if not exists followups_enabled boolean not null default true;

-- El estado PROGRAMADA no existía en la primera versión.
do $$
begin
  alter table public.sales_campaigns drop constraint if exists sales_campaigns_status_check;
  alter table public.sales_campaigns
    add constraint sales_campaigns_status_check
    check (status in ('BORRADOR','PROGRAMADA','ACTIVA','PAUSADA','FINALIZADA'));
end $$;

-- 4. Seguimientos: vincular con la campaña que los originó
alter table public.sales_followups
  add column if not exists campaign_id uuid references public.sales_campaigns(id) on delete set null;

-- 5. Registro de webhooks recibidos, para diagnóstico
create table if not exists public.sales_webhook_log (
  id bigserial primary key,
  subscription_id text,
  resource text,
  change_type text,
  status text not null default 'RECIBIDO',   -- RECIBIDO | PROCESADO | IGNORADO | ERROR
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists sales_webhook_log_created_idx
  on public.sales_webhook_log (created_at desc);

alter table public.sales_webhook_log enable row level security;

-- 6. Configuración añadida en esta fase
insert into public.sales_settings (key, value, description) values
  ('mailbox_address', '""'::jsonb,
   'Correo del buzón comercial conectado. Si queda vacío se usa el de contacto del sitio.'),
  ('zara_name', '"Zara"'::jsonb, 'Nombre visible de la ejecutiva comercial.'),
  ('zara_role', '"Ejecutiva Comercial"'::jsonb, 'Cargo visible en la firma.'),
  ('zara_signature', '""'::jsonb,
   'Firma personalizada. Si queda vacía se arma con nombre, cargo, empresa y sitio web.'),
  ('bounce_max_attempts', '2'::jsonb, 'Rebotes tolerados antes de marcar la dirección como inválida.'),
  ('webhook_client_state', '""'::jsonb,
   'Secreto compartido para validar los webhooks de Microsoft. Se genera al crear la suscripción.')
on conflict (key) do nothing;

-- ============================================================================
-- ROLLBACK FASE 2
-- ----------------------------------------------------------------------------
-- drop table if exists public.sales_webhook_log cascade;
-- alter table public.sales_companies drop column if exists email_invalid;
-- alter table public.sales_companies drop column if exists email_invalid_at;
-- alter table public.sales_companies drop column if exists dormant_since;
-- alter table public.sales_companies drop column if exists dormant_notified_at;
-- alter table public.sales_campaigns drop column if exists template_subject;
-- alter table public.sales_campaigns drop column if exists template_body;
-- alter table public.sales_campaigns drop column if exists starts_at;
-- alter table public.sales_campaigns drop column if exists followups_enabled;
-- alter table public.sales_followups drop column if exists campaign_id;
-- ============================================================================
