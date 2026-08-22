-- =========================================================
-- ACTIVAR EL ENVÍO REAL DE ZARA — 30 correos al día repartidos
--
-- Ejecutar en el SQL Editor de Supabase. Es idempotente: puede
-- volver a correrse sin duplicar nada.
--
-- IMPORTANTE: al terminar esta ejecución Zara empieza a enviar
-- correos REALES a las empresas importadas. No es reversible para
-- los correos que ya salieron.
--
-- Requiere estar en la versión de la app que deriva la cadencia
-- del objetivo diario (commit ab69530 en adelante). En versiones
-- anteriores el reparto seguía topado en unos 20 diarios.
-- =========================================================

-- 1. Interruptores de operación -----------------------------------------
-- test_mode: mientras es true los correos se redirigen a la casilla de
-- prueba y NO llegan a las empresas. Esta es la línea que enciende todo.
insert into public.sales_settings (key, value, description, updated_by, updated_at)
values ('test_mode', 'false'::jsonb, 'Envío real activado.', 'activacion-sql', now())
on conflict (key) do update
  set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();

-- Botón de emergencia: debe quedar en false para que la cola corra.
insert into public.sales_settings (key, value, description, updated_by, updated_at)
values ('zara_paused', 'false'::jsonb, 'Zara operativa.', 'activacion-sql', now())
on conflict (key) do update
  set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();

-- 2. Respuesta automática a quien conteste --------------------------------
insert into public.sales_settings (key, value, description, updated_by, updated_at)
values ('auto_reply_enabled', 'true'::jsonb,
        'Zara responde sola cuando la confianza supera el umbral.', 'activacion-sql', now())
on conflict (key) do update
  set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();

-- 0.93 era tan alto que casi nunca respondía sola y todo quedaba en
-- borrador esperando aprobación. 0.80 responde lo claro y sigue derivando
-- a revisión lo ambiguo.
insert into public.sales_settings (key, value, description, updated_by, updated_at)
values ('auto_reply_min_confidence', '0.80'::jsonb,
        'Umbral de confianza para responder sin aprobación.', 'activacion-sql', now())
on conflict (key) do update
  set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();

-- 3. Volumen diario --------------------------------------------------------
-- El objetivo configurado.
insert into public.sales_settings (key, value, description, updated_by, updated_at)
values ('daily_send_limit', '30'::jsonb, 'Objetivo de correos por día.', 'activacion-sql', now())
on conflict (key) do update
  set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();

-- Sin fecha de inicio de calentamiento el sistema fuerza 10 diarios e
-- ignora cualquier aprobación manual. Se fija sólo si aún no existe, para
-- no reiniciar el historial si el calentamiento ya venía corriendo.
insert into public.sales_settings (key, value, description, updated_by, updated_at)
values ('warmup_started_on', to_jsonb(now()::text),
        'Inicio del calentamiento del dominio.', 'activacion-sql', now())
on conflict (key) do update
  set value = case
                when public.sales_settings.value in ('null'::jsonb, '""'::jsonb)
                  then excluded.value
                else public.sales_settings.value
              end,
      updated_at = now();

-- El automatismo nunca pasa de 15 diarios por sí solo: sólo esta
-- aprobación manual explícita permite llegar a 30.
insert into public.sales_settings (key, value, description, updated_by, updated_at)
values ('warmup_manual_override', '30'::jsonb,
        'Aprobación manual para superar el tope automático de 15/día.', 'activacion-sql', now())
on conflict (key) do update
  set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();

-- 4. Cadencia --------------------------------------------------------------
-- Guarda de concurrencia entre dos ejecuciones del cron. Para 30 diarios la
-- app calcula separaciones de 24 a 72 minutos, así que el piso baja a 24
-- minutos: con los 35 anteriores la cola se quedaba sin huecos donde
-- colocar los últimos envíos del día.
insert into public.sales_settings (key, value, description, updated_by, updated_at)
values ('queue_min_gap_seconds', '1440'::jsonb,
        'Piso de separación entre envíos, en segundos (24 minutos).', 'activacion-sql', now())
on conflict (key) do update
  set value = excluded.value, updated_by = excluded.updated_by, updated_at = now();

-- 5. Verificación ----------------------------------------------------------
-- Debe devolver exactamente estos valores. Si test_mode sigue en true o
-- warmup_started_on quedó nulo, Zara no enviará como se espera.
select key, value
from public.sales_settings
where key in (
  'test_mode', 'zara_paused', 'auto_reply_enabled', 'auto_reply_min_confidence',
  'daily_send_limit', 'warmup_started_on', 'warmup_manual_override',
  'queue_min_gap_seconds'
)
order by key;

-- =========================================================
-- FRENO DE EMERGENCIA
-- Si algo sale mal (rebotes, quejas, respuestas molestas), esto detiene
-- todo de inmediato sin perder la cola ni el historial:
--
--   update public.sales_settings
--      set value = 'true'::jsonb, updated_at = now()
--    where key = 'zara_paused';
--
-- Para volver a modo prueba sin detener la cola:
--
--   update public.sales_settings
--      set value = 'true'::jsonb, updated_at = now()
--    where key = 'test_mode';
-- =========================================================

-- =========================================================
-- ALTERNATIVA MÁS CONSERVADORA (recomendada si hubo rebotes recientes)
-- Arrancar en 15 diarios la primera semana y subir a 30 después. Cambia
-- sólo estas dos líneas antes de ejecutar:
--
--   daily_send_limit        -> '15'::jsonb
--   warmup_manual_override  -> '15'::jsonb
--
-- Y al cabo de una semana sin rebotes, volver a correr este archivo con
-- los valores en 30.
-- =========================================================
