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
  -- El NDR de Microsoft cita el internetMessageId, no el id interno de Graph.
  -- Se guardan ambos: este para correlacionar rebotes, el otro para operar.
  graph_internet_message_id text,
  graph_conversation_id text,
  -- Mensaje al que responde, para que las respuestas salgan dentro del hilo.
  reply_to_graph_message_id text,

  -- Marca los envíos redirigidos por test_mode: no consumen cupo real, no
  -- inician el calentamiento y no cambian el estado del prospecto.
  is_test boolean not null default false,
  confirmed_at timestamptz,

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

create index if not exists sales_send_queue_internet_id_idx
  on public.sales_send_queue (graph_internet_message_id)
  where graph_internet_message_id is not null;

-- Confirmación sin rebote a las 24 horas.
create index if not exists sales_send_queue_pending_confirm_idx
  on public.sales_send_queue (accepted_at)
  where status = 'ACEPTADO_POR_MICROSOFT';

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
-- Clave fija del bloqueo global de despacho. Cualquier operación que reserve o
-- programe un envío debe tomarla, para que las comprobaciones y la escritura
-- ocurran dentro de la misma sección crítica.
create or replace function public.sales_dispatch_lock_key()
returns bigint language sql immutable as $$ select 918273645123456789::bigint $$;

-- ---------------------------------------------------------------------------
-- Reserva atómica del siguiente envío
-- ---------------------------------------------------------------------------
-- FOR UPDATE SKIP LOCKED por sí solo NO basta: dos transacciones podían
-- comprobar "no hay envíos en curso" y a continuación reservar filas
-- DISTINTAS, produciendo dos envíos simultáneos. Por eso lo primero es tomar un
-- bloqueo global de transacción; quien no lo obtiene se retira de inmediato.
--
-- Con el bloqueo retenido se verifican, en la misma sección crítica:
--   · que no haya otro envío en curso;
--   · el cupo diario (sin contar los de prueba);
--   · la separación mínima desde el último aceptado;
-- y recién entonces se reserva la fila.
-- ---------------------------------------------------------------------------
create or replace function public.sales_claim_next_send(
  p_daily_limit integer,
  p_min_gap_seconds integer default 2100
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
  -- Bloqueo global: si otra transacción está despachando, esta se retira.
  if not pg_try_advisory_xact_lock(public.sales_dispatch_lock_key()) then
    return;
  end if;

  select count(*) into v_in_progress
  from public.sales_send_queue
  where status = 'PROCESANDO'
    and processing_started_at > now() - interval '10 minutes';

  if v_in_progress > 0 then
    return;
  end if;

  -- Cupo diario. Los envíos de prueba no consumen cupo real.
  select count(*) into v_sent_today
  from public.sales_send_queue
  where status in ('ACEPTADO_POR_MICROSOFT','ENVIADO_SIN_REBOTE','REBOTADO')
    and is_test = false
    and accepted_at >= (date_trunc('day', now() at time zone 'America/Santiago')
                        at time zone 'America/Santiago');

  if v_sent_today >= p_daily_limit then
    return;
  end if;

  -- Separación mínima absoluta desde el último envío aceptado.
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
-- Programación atómica de la hora de envío
-- ---------------------------------------------------------------------------
-- La aplicación propone una hora (con su reparto por franjas y su aleatoriedad)
-- y esta función la ajusta bajo el mismo bloqueo global, garantizando que dos
-- crons nunca asignen el mismo minuto ni una separación menor a la mínima.
-- Devuelve la hora finalmente asignada, o NULL si no pudo tomar el bloqueo.
-- ---------------------------------------------------------------------------
create or replace function public.sales_schedule_send(
  p_id uuid,
  p_candidate timestamptz,
  p_min_gap_seconds integer default 2100,
  p_reviewed_by text default null
)
returns timestamptz
language plpgsql
as $$
declare
  v_last timestamptz;
  v_final timestamptz;
begin
  if not pg_try_advisory_xact_lock(public.sales_dispatch_lock_key()) then
    return null;
  end if;

  -- Última hora ya comprometida, considerando también lo aceptado.
  select greatest(
           coalesce(max(scheduled_at) filter (where status in ('PROGRAMADO','PROCESANDO')), to_timestamp(0)),
           coalesce(max(accepted_at), to_timestamp(0))
         )
    into v_last
  from public.sales_send_queue;

  v_final := greatest(p_candidate, now());

  if v_last is not null and v_last > to_timestamp(0) then
    v_final := greatest(v_final, v_last + make_interval(secs => p_min_gap_seconds));
  end if;

  -- Ningún otro envío puede quedar en el mismo minuto.
  while exists (
    select 1 from public.sales_send_queue
    where id <> p_id
      and status in ('PROGRAMADO','PROCESANDO')
      and date_trunc('minute', scheduled_at) = date_trunc('minute', v_final)
  ) loop
    v_final := v_final + interval '1 minute';
  end loop;

  update public.sales_send_queue
  set status = 'PROGRAMADO',
      scheduled_at = v_final,
      requires_review = false,
      reviewed_by = coalesce(p_reviewed_by, reviewed_by),
      reviewed_at = case when p_reviewed_by is not null then now() else reviewed_at end
  where id = p_id
    and status in ('PENDIENTE_ANALISIS','PENDIENTE_REVISION');

  if not found then
    return null;
  end if;

  return v_final;
end;
$$;

-- ---------------------------------------------------------------------------
-- Confirmación sin rebote a las 24 horas
-- ---------------------------------------------------------------------------
-- La ausencia de NDR no prueba entrega ni apertura: solo que en 24 horas nadie
-- devolvió el mensaje. Por eso el estado se llama ENVIADO_SIN_REBOTE.
create or replace function public.sales_confirm_delivered(p_hours integer default 24)
returns integer
language plpgsql
as $$
declare
  v_count integer;
begin
  update public.sales_send_queue
  set status = 'ENVIADO_SIN_REBOTE',
      confirmed_at = now()
  where status = 'ACEPTADO_POR_MICROSOFT'
    and accepted_at is not null
    and accepted_at < now() - make_interval(hours => p_hours);

  get diagnostics v_count = row_count;
  return v_count;
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
  ('queue_min_gap_seconds', '2100'::jsonb,
   'Separación mínima absoluta entre envíos, en segundos. 2100 = 35 minutos.')
on conflict (key) do nothing;

-- ============================================================================
-- ROLLBACK FASE 4
-- drop function if exists public.sales_claim_next_send(integer, integer);
-- drop function if exists public.sales_schedule_send(uuid, timestamptz, integer, text);
-- drop function if exists public.sales_confirm_delivered(integer);
-- drop function if exists public.sales_dispatch_lock_key();
-- drop function if exists public.sales_release_stuck_sends();
-- drop table if exists public.sales_send_queue cascade;
-- ============================================================================
