-- ============================================================================
-- ZARA — FASE 3
-- ----------------------------------------------------------------------------
-- Destinatario del borrador, envío automático y contacto masivo.
-- Requiere: sales_ai_zara.sql y sales_ai_zara_fase2.sql
-- Idempotente.
-- ============================================================================

-- 1. Destinatario propio del borrador.
--    Antes se dependía de sales_companies.primary_email: si el correo llegaba
--    de alguien que no estaba en el CRM, el borrador quedaba sin destinatario
--    y no se podía enviar aunque el remitente fuera evidente.
alter table public.sales_drafts
  add column if not exists reply_to_email text;

alter table public.sales_drafts
  add column if not exists auto_sent boolean not null default false;

-- 2. Remitente original del mensaje entrante, para poder responder siempre.
create index if not exists sales_messages_from_idx
  on public.sales_messages (lower(from_email)) where from_email is not null;

-- 3. Configuración de contacto masivo
insert into public.sales_settings (key, value, description) values
  ('bulk_batch_size', '10'::jsonb,
   'Máximo de prospectos que se contactan en una misma tanda desde el panel.')
on conflict (key) do nothing;

-- ============================================================================
-- ROLLBACK FASE 3
-- alter table public.sales_drafts drop column if exists reply_to_email;
-- alter table public.sales_drafts drop column if exists auto_sent;
-- drop index if exists sales_messages_from_idx;
-- ============================================================================
