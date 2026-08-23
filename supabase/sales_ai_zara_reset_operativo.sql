-- ============================================================================
-- ZARA — REINICIO OPERATIVO
-- ----------------------------------------------------------------------------
-- QUÉ HACE
--   Deja el módulo de ventas IA (Zara) como recién instalado en cuanto a datos
--   de operación: prospectos, hilos, mensajes, borradores, seguimientos,
--   campañas, cola de envíos, importaciones, historial y webhooks.
--
-- QUÉ *NO* HACE (a propósito)
--   · No borra ninguna tabla, columna, índice, función, trigger ni política RLS.
--     Solo ejecuta DELETE sobre filas. No hay DROP ni TRUNCATE en este archivo.
--   · No toca la configuración ni la memoria que debe sobrevivir a un reinicio:
--       - sales_settings         → parámetros de operación (límites, prompts).
--       - sales_mail_account     → conexión y tokens de Microsoft Graph.
--       - sales_opt_outs         → quienes pidieron NO ser contactados. Borrarlos
--                                  equivaldría a volver a escribirle a alguien
--                                  que ya pidió exclusión: eso no se reinicia.
--       - sales_ai_activity      → auditoría de llamadas al modelo.
--       - sales_ai_budget_usage  → gasto real ya consumido; cuenta para el tope
--                                  mensual/diario. Borrarlo regalaría presupuesto
--                                  que en realidad ya se pagó.
--   · No toca NADA fuera del prefijo sales_ (clientes, contactos, cotizaciones y
--     oportunidades del CRM de Zyteron, secretos, tokens, etc.).
--
-- DÓNDE SE EJECUTA
--   A mano, en el SQL Editor de Supabase (o con psql contra la base). NUNCA en
--   un deploy, en un cron ni como migración automática: es una operación
--   destructiva e irreversible sobre los datos operativos.
--
-- CÓMO SE EJECUTA
--   1) Ejecutar el BLOQUE 1 para ver qué se va a borrar (solo lectura).
--   2) Editar la línea marcada del BLOQUE 2 y escribir  REINICIAR ZARA .
--   3) Ejecutar el BLOQUE 2. Sin esa palabra exacta aborta sin borrar nada.
--   4) Ejecutar el BLOQUE 3 para comprobar el resultado.
--
--   En el SQL Editor de Supabase conviene seleccionar cada bloque y pulsar Run:
--   el editor muestra el resultado del último SELECT, así que al correr todo de
--   una vez el conteo previo del BLOQUE 1 quedaría oculto tras el del BLOQUE 3.
--
-- POR QUÉ LA CONFIRMACIÓN SE ESCRIBE DENTRO DEL SQL
--   El SQL Editor de Supabase no es psql: no admite metacomandos (\set) ni
--   variables :confirmacion, así que ese patrón fallaría con un error de sintaxis
--   al pegarlo. La confirmación se implementa con una constante dentro del bloque
--   DO y se compara antes de cualquier DELETE; si no coincide, RAISE EXCEPTION
--   aborta el bloque completo y no se borra nada.
--   (En psql, si se prefiere el patrón con variable, basta reemplazar la línea
--    de la constante por:   v_confirmacion constant text := :'confirmacion';
--    y ejecutar:            psql ... -v confirmacion='REINICIAR ZARA' -f este.sql)
--
-- ATOMICIDAD
--   Todo el borrado vive dentro de UN SOLO bloque DO. Un bloque DO es una única
--   sentencia, por lo que Postgres lo ejecuta en una sola transacción: si algo
--   falla a mitad —una FK, un permiso, la guarda de tablas conservadas— se
--   revierte entero y ninguna tabla queda a medias. No dependemos de que el
--   editor de Supabase agrupe o no las sentencias en una transacción.
--
-- REQUISITOS
--   Ejecutar con service_role / postgres. Todas las tablas sales_ tienen RLS
--   activo y el acceso normal pasa por el backend.
-- ============================================================================


-- ============================================================================
-- BLOQUE 1 — CONTEO PREVIO (solo lectura, no modifica nada)
-- ----------------------------------------------------------------------------
-- Muestra, tabla por tabla, cuántas filas se eliminarán. Sirve de respaldo
-- mental antes de confirmar: si estos números no cuadran con lo esperado,
-- NO ejecutar el BLOQUE 2.
-- ============================================================================
select 'sales_send_queue'       as tabla, count(*) as filas_a_eliminar from public.sales_send_queue
union all select 'sales_campaign_targets', count(*) from public.sales_campaign_targets
union all select 'sales_drafts',           count(*) from public.sales_drafts
union all select 'sales_followups',        count(*) from public.sales_followups
union all select 'sales_messages',         count(*) from public.sales_messages
union all select 'sales_threads',          count(*) from public.sales_threads
union all select 'sales_events',           count(*) from public.sales_events
union all select 'sales_proposals',        count(*) from public.sales_proposals
union all select 'sales_campaigns',        count(*) from public.sales_campaigns
union all select 'sales_import_batches',   count(*) from public.sales_import_batches
union all select 'sales_webhook_log',      count(*) from public.sales_webhook_log
union all select 'sales_companies',        count(*) from public.sales_companies
order by 1;


-- ============================================================================
-- BLOQUE 2 — REINICIO (destructivo, transacción única)
-- ----------------------------------------------------------------------------
-- ORDEN DE BORRADO
--   Se borra de hijo a padre siguiendo las claves foráneas reales del esquema
--   (verificadas en sales_ai_zara.sql, _fase2, _fase3 y _fase4):
--
--     sales_send_queue        → companies, campaigns, threads, drafts, followups
--     sales_campaign_targets  → campaigns (cascade), companies (cascade)
--     sales_drafts            → companies, threads, messages
--     sales_followups         → companies, threads, campaigns
--     sales_messages          → threads (cascade), companies
--     sales_threads           → companies
--     sales_events            → companies (cascade)
--     sales_proposals         → companies (cascade)
--     sales_campaigns         → (sin padres)
--     sales_import_batches    → (sin padres; companies.import_batch_id no tiene FK)
--     sales_webhook_log       → (sin padres)
--     sales_companies         → (raíz del módulo, va última)
--
--   Varias FKs son ON DELETE CASCADE, así que borrar sales_companies bastaría
--   para arrastrar casi todo. Aun así se borra tabla por tabla y en orden
--   explícito: el conteo por tabla es real, no hay borrados invisibles por
--   cascada y el script no depende de que las FKs sigan declaradas igual mañana.
--
-- NOTA SOBRE sales_ai_activity (tabla conservada)
--   Su columna company_id referencia sales_companies con ON DELETE SET NULL.
--   Al vaciar sales_companies, esas referencias quedan en NULL, pero NINGUNA
--   fila se pierde: el gasto y la auditoría se conservan íntegros. La guarda de
--   más abajo verifica exactamente eso comparando los conteos antes/después.
-- ============================================================================
do $$
declare
  -- >>>>>>>>>>>>>>>>>>>>>>>> CONFIRMACIÓN OBLIGATORIA <<<<<<<<<<<<<<<<<<<<<<<<
  -- Escribir REINICIAR ZARA entre las comillas de la línea siguiente.
  -- Cualquier otro valor (incluido el de fábrica) aborta sin borrar nada.
  v_confirmacion constant text := 'ESCRIBIR AQUI LA CONFIRMACION';
  -- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  -- Tablas operativas, en orden de dependencia (hijos primero).
  v_operativas constant text[] := array[
    'sales_send_queue',        -- cola de envíos: apunta a casi todas las demás
    'sales_campaign_targets',  -- hijo de campaigns y companies
    'sales_drafts',            -- hijo de companies, threads y messages
    'sales_followups',         -- hijo de companies, threads y campaigns
    'sales_messages',          -- hijo de threads y companies
    'sales_threads',           -- hijo de companies
    'sales_events',            -- hijo de companies
    'sales_proposals',         -- hijo de companies
    'sales_campaigns',         -- sin padres
    'sales_import_batches',    -- sin padres
    'sales_webhook_log',       -- sin padres
    'sales_companies'          -- raíz del módulo
  ];

  -- Tablas que deben sobrevivir intactas. Se cuentan antes y después y, si
  -- alguna cambió, se lanza excepción para revertir TODO el bloque.
  v_conservadas constant text[] := array[
    'sales_settings',
    'sales_mail_account',
    'sales_opt_outs',
    'sales_ai_activity',
    'sales_ai_budget_usage'
  ];

  v_tabla        text;
  v_borradas     bigint;
  v_total        bigint := 0;
  v_antes        bigint;
  v_despues      bigint;
  v_resumen      text := '';
  -- Fotografía previa de las conservadas. Se guarda en una variable jsonb y no
  -- en una tabla auxiliar: así el script no crea ningún objeto en la base.
  v_guarda       jsonb  := '{}'::jsonb;
begin
  -- 1) Confirmación explícita. Va ANTES de cualquier DELETE, de modo que si el
  --    editor ejecutase las sentencias por separado tampoco alcanzaría a borrar.
  if v_confirmacion is distinct from 'REINICIAR ZARA' then
    raise exception
      'REINICIO CANCELADO: no se borró nada. Para continuar, escribe REINICIAR ZARA en la línea v_confirmacion. Valor recibido: %',
      coalesce(quote_literal(v_confirmacion), 'NULL');
  end if;

  -- 2) Verificación de esquema: si falta alguna tabla, se aborta antes de tocar
  --    datos. Evita reinicios "a medias" sobre una instalación incompleta.
  foreach v_tabla in array v_operativas || v_conservadas loop
    if to_regclass('public.' || quote_ident(v_tabla)) is null then
      raise exception 'REINICIO ABORTADO: falta la tabla public.% . Ejecuta antes las migraciones de Zara.', v_tabla;
    end if;
  end loop;

  -- 3) Fotografía previa de las tablas conservadas (guarda anti-accidentes).
  foreach v_tabla in array v_conservadas loop
    execute format('select count(*) from public.%I', v_tabla) into v_antes;
    v_guarda := v_guarda || jsonb_build_object(v_tabla, v_antes);
    raise notice 'CONSERVADA % : % filas antes', rpad(v_tabla, 24), v_antes;
  end loop;

  -- 4) Conteo previo de lo que se va a eliminar (queda en el log del bloque,
  --    además del BLOQUE 1 que lo muestra como tabla).
  foreach v_tabla in array v_operativas loop
    execute format('select count(*) from public.%I', v_tabla) into v_antes;
    raise notice 'A ELIMINAR % : % filas', rpad(v_tabla, 24), v_antes;
  end loop;

  -- 5) Borrado en orden de FK. DELETE, nunca TRUNCATE: TRUNCATE ... CASCADE
  --    podría arrastrar tablas conservadas y además reinicia secuencias.
  foreach v_tabla in array v_operativas loop
    execute format('delete from public.%I', v_tabla);
    get diagnostics v_borradas = row_count;
    v_total := v_total + v_borradas;
    v_resumen := v_resumen || format(E'\n  %s %s filas eliminadas', rpad(v_tabla, 24), v_borradas);
    raise notice 'BORRADA  % : % filas eliminadas', rpad(v_tabla, 24), v_borradas;
  end loop;

  -- 6) Guarda final: ninguna tabla conservada pudo perder filas. Si alguna
  --    cambió (por ejemplo, si mañana alguien pone un ON DELETE CASCADE hacia
  --    sales_companies), esta excepción revierte el bloque entero.
  foreach v_tabla in array v_conservadas loop
    execute format('select count(*) from public.%I', v_tabla) into v_despues;
    v_antes := (v_guarda ->> v_tabla)::bigint;

    if v_despues <> v_antes then
      raise exception
        'REINICIO REVERTIDO: la tabla conservada public.% pasó de % a % filas. No se aplicó ningún cambio.',
        v_tabla, v_antes, v_despues;
    end if;
  end loop;

  raise notice 'REINICIO COMPLETADO. Total de filas eliminadas: %.%', v_total, v_resumen;
end
$$;


-- ============================================================================
-- BLOQUE 3 — VERIFICACIÓN FINAL (solo lectura)
-- ----------------------------------------------------------------------------
-- Las 12 operativas deben quedar en 0 y las 5 conservadas deben mantener sus
-- filas. La columna "resultado" marca OK / REVISAR para no tener que leer los
-- números uno por uno.
-- ============================================================================
with conteos(tabla, rol, filas) as (
  select 'sales_send_queue',       'OPERATIVA',  count(*) from public.sales_send_queue
  union all select 'sales_campaign_targets', 'OPERATIVA',  count(*) from public.sales_campaign_targets
  union all select 'sales_drafts',           'OPERATIVA',  count(*) from public.sales_drafts
  union all select 'sales_followups',        'OPERATIVA',  count(*) from public.sales_followups
  union all select 'sales_messages',         'OPERATIVA',  count(*) from public.sales_messages
  union all select 'sales_threads',          'OPERATIVA',  count(*) from public.sales_threads
  union all select 'sales_events',           'OPERATIVA',  count(*) from public.sales_events
  union all select 'sales_proposals',        'OPERATIVA',  count(*) from public.sales_proposals
  union all select 'sales_campaigns',        'OPERATIVA',  count(*) from public.sales_campaigns
  union all select 'sales_import_batches',   'OPERATIVA',  count(*) from public.sales_import_batches
  union all select 'sales_webhook_log',      'OPERATIVA',  count(*) from public.sales_webhook_log
  union all select 'sales_companies',        'OPERATIVA',  count(*) from public.sales_companies
  union all select 'sales_settings',         'CONSERVADA', count(*) from public.sales_settings
  union all select 'sales_mail_account',     'CONSERVADA', count(*) from public.sales_mail_account
  union all select 'sales_opt_outs',         'CONSERVADA', count(*) from public.sales_opt_outs
  union all select 'sales_ai_activity',      'CONSERVADA', count(*) from public.sales_ai_activity
  union all select 'sales_ai_budget_usage',  'CONSERVADA', count(*) from public.sales_ai_budget_usage
)
select
  rol,
  tabla,
  filas,
  case
    when rol = 'OPERATIVA'  and filas = 0 then 'OK - vaciada'
    when rol = 'OPERATIVA'                then 'REVISAR - quedaron filas'
    -- sales_mail_account puede tener 0 filas legítimamente si el buzón nunca se
    -- conectó; por eso las conservadas solo informan, no fallan por estar vacías.
    else 'OK - intacta (' || filas || ' filas)'
  end as resultado
from conteos
order by rol, tabla;


-- ============================================================================
-- DESPUÉS DEL REINICIO — recordatorio operativo
-- ----------------------------------------------------------------------------
-- · La cola queda vacía: no hay nada programado y no saldrá ningún correo hasta
--   volver a importar prospectos y encolar envíos.
-- · sales_settings conserva test_mode, zara_paused, límites y calentamiento tal
--   como estaban. Si el reinicio se hizo por un incidente de envíos, revisar
--   test_mode / zara_paused ANTES de volver a cargar prospectos.
-- · sales_opt_outs sigue vigente: quien pidió exclusión seguirá excluido aunque
--   se vuelva a importar su empresa.
-- · sales_ai_budget_usage conserva el gasto del mes en curso, así que el tope de
--   presupuesto sigue contando desde donde iba.
-- ============================================================================
