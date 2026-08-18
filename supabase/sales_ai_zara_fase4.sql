-- ============================================================================
-- ZARA — FASE 4: COLA DE ENVÍOS SEGURA
-- ----------------------------------------------------------------------------
-- Elimina la condición de carrera que produjo la ráfaga rechazada con
-- 550 5.7.708. Antes cada proceso contaba envíos ANTES de registrar los suyos,
-- así que varias ejecuciones simultáneas veían el mismo contador y todas
-- creían tener cupo.
--
-- Ahora existe una cola persistente y la reserva del siguiente correo es
-- atómica: FOR UPDATE SKIP LOCKED garantiza que dos ejecuciones del cron nunca
-- tomen el mismo registro, y el cupo diario se verifica dentro de la misma
-- transacción que reserva.
--
-- Idempotente. No borra ni reinicia nada existente.
-- Requiere: fases 1, 2 y 3.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Cola de envíos
-- ---------------------------------------------------------------------------
create table if not exists public.sales_send_queue (
  id uuid primary key default gen_random_uuid(),

  company_id uuid references public.sales_companies(id) on delete cascade,
  campaign_id uuid references public.sales_campaigns(id) on delete set null,
  thread_id uuid references public.sales_threads(id) on delete set null,
  draft_id uuid references public.sales_drafts(id) on delete set null,
  followup_id uuid references public.sales_followups(id) on delete set null,

  kind text not null default 'PRIMER_CONTACTO'
    check (kind in ('PRIMER_CONTACTO','SEGUIMIENTO','RESPUESTA')),

  recipient_email text,
  subject text,
  body text,
  /** Bloques estructurados devueltos por el modelo, para auditar la redacción. */
  content jsonb default '{}'::jsonb,

  status text not null default 'PENDIENTE_ANALISIS' check (status in (
    'PENDIENTE_ANALISIS',
    'PENDIENTE_REVISION',
    'PROGRAMADO',
    'PROCESANDO',
    'ACEPTADO_POR_MICROSOFT',
    'ENVIADO_SIN_REBOTE',
    'REBOTADO',
    'CANCELADO',
    'ERROR'
  )),

  scheduled_at timestamptz,
  processing_started_at timestamptz,
  accepted_at timestamptz,          -- Graph aceptó el mensaje
  bounced_at timestamptz,
  bounce_code text,
  bounce_kind text,                 -- HARD | POLICY | SOFT | UNKNOWN
  bounce_detail text,

  graph_message_id text,
  graph_conversation_id text,

  attempts integer not null default 0,
  max_attempts integer not null default 1,
  last_error text,

  confidence numeric(4,3),
  requires_review boolean not null default true,
  review_reason text,
  reviewed_by text,
  reviewed_at timestamptz,

  cancel_reason text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.sales_send_queue is
  'Cola de envíos comerciales. Un solo correo se procesa a la vez y su hora se fija al programar.';

create index if not exists sales_send_queue_due_idx
  on public.sales_send_queue (scheduled_at)
  where status = 'PROGRAMADO';

create index if not exists sales_send_queue_status_idx
  on public.sales_send_queue (status, created_at desc);

create index if not exists sales_send_queue_company_idx
  on public.sales_send_queue (company_id);

create unique index if not exists sales_send_queue_graph_uidx
  on public.sales_send_queue (graph_message_id)
  where graph_message_id is not null;

-- Un mismo prospecto no puede tener dos primeros contactos vivos a la vez.
create unique index if not exists sales_send_queue_one_active_idx
  on public.sales_send_queue (company_id, kind)
  where status in ('PENDIENTE_ANALISIS','PENDIENTE_REVISION','PROGRAMADO','PROCESANDO');

drop trigger if exists sales_send_queue_touch on public.sales_send_queue;
create trigger sales_send_queue_touch before update on public.sales_send_queue
  for each row execute function public.sales_touch_updated_at();

alter table public.sales_send_queue enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Reserva atómica del siguiente envío
-- ---------------------------------------------------------------------------
-- Devuelve como máximo UNA fila y la deja en PROCESANDO dentro de la misma
-- transacción. Comprueba, también dentro de la transacción:
--   · que no haya otro envío en curso;
--   · que no se haya enviado nada en el último minuto;
--   · que quede cupo diario.
-- Si dos crons se ejecutan a la vez, SKIP LOCKED hace que solo uno obtenga la
-- fila y el otro reciba el conjunto vacío.
-- ---------------------------------------------------------------------------
create or replace function public.sales_claim_next_send(
  p_daily_limit integer,
  p_min_gap_seconds integer default 60
)
returns setof public.sales_send_queue
language plpgsql
as $$
declare
  v_claimed public.sales_send_queue;
  v_in_progress integer;
  v_sent_today integer;
  v_last_send timestamptz;
begin
  -- Un solo correo en procesamiento a la vez.
  select count(*) into v_in_progress
  from public.sales_send_queue
  where status = 'PROCESANDO'
    and processing_started_at > now() - interval '10 minutes';

  if v_in_progress > 0 then
    return;
  end if;

  -- Cupo diario: cuenta lo ya aceptado o enviado hoy.
  select count(*) into v_sent_today
  from public.sales_send_queue
  where status in ('ACEPTADO_POR_MICROSOFT','ENVIADO_SIN_REBOTE','REBOTADO')
    and accepted_at >= date_trunc('day', now() at time zone 'America/Santiago')
        at time zone 'America/Santiago';

  if v_sent_today >= p_daily_limit then
    return;
  end if;

  -- Nunca dos correos en el mismo minuto.
  select max(accepted_at) into v_last_send
  from public.sales_send_queue
  where accepted_at is not null;

  if v_last_send is not null
     and v_last_send > now() - make_interval(secs => p_min_gap_seconds) then
    return;
  end if;

  select * into v_claimed
  from public.sales_send_queue
  where status = 'PROGRAMADO'
    and scheduled_at is not null
    and scheduled_at <= now()
  order by scheduled_at asc
  for update skip locked
  limit 1;

  if not found then
    return;
  end if;

  update public.sales_send_queue
  set status = 'PROCESANDO',
      processing_started_at = now(),
      attempts = attempts + 1
  where id = v_claimed.id
  returning * into v_claimed;

  return next v_claimed;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Recuperación de envíos colgados
-- ---------------------------------------------------------------------------
-- Si el proceso muere entre la reserva y el envío, la fila quedaría atascada en
-- PROCESANDO. Se devuelve a PROGRAMADO tras 10 minutos para reintento seguro.
create or replace function public.sales_release_stuck_sends()
returns integer
language plpgsql
as $$
declare
  v_released integer;
begin
  update public.sales_send_queue
  set status = case when attempts >= max_attempts then 'ERROR' else 'PROGRAMADO' end,
      last_error = coalesce(last_error, 'Proceso interrumpido durante el envío.'),
      processing_started_at = null
  where status = 'PROCESANDO'
    and processing_started_at < now() - interval '10 minutes';

  get diagnostics v_released = row_count;
  return v_released;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Configuración de esta fase
-- ---------------------------------------------------------------------------
insert into public.sales_settings (key, value, description) values
  ('warmup_started_on', 'null'::jsonb,
   'Fecha del primer envío real. Define la etapa de calentamiento del buzón.'),
  ('warmup_manual_override', 'null'::jsonb,
   'Límite diario fijado a mano por el administrador. Sobre 15 diarios el aumento no es automático.'),
  ('pause_reason', '""'::jsonb,
   'Motivo de la última pausa automática, para mostrarlo en el panel.'),
  ('last_bounce_code', '""'::jsonb, 'Último código SMTP de rebote recibido.'),
  ('queue_min_gap_seconds', '60'::jsonb, 'Separación mínima entre dos envíos.')
on conflict (key) do nothing;

-- ============================================================================
-- ROLLBACK FASE 4
-- drop function if exists public.sales_claim_next_send(integer, integer);
-- drop function if exists public.sales_release_stuck_sends();
-- drop table if exists public.sales_send_queue cascade;
-- ============================================================================
