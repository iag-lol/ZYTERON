-- ============================================================================
-- PRUEBAS DE LA COLA DE ENVÍOS — sales_claim_next_send
-- ----------------------------------------------------------------------------
-- Se ejecuta COMPLETO en el editor SQL de Supabase. No requiere dblink,
-- superusuario ni contraseña: la versión anterior abría una segunda conexión
-- real y Supabase la rechaza ("password or GSSAPI delegated credentials
-- required") porque el usuario del editor no es superusuario.
--
-- Cómo se demuestra la exclusión mutua sin una segunda conexión:
--   PRUEBA 1 verifica que la reserva TOMA el bloqueo global de transacción
--   sobre la clave exacta de despacho, y que lo toma ANTES de tocar la cola.
--   Que un segundo proceso con ese bloqueo tomado reciba "false" es una
--   garantía de PostgreSQL, no de nuestro código. Al probar que el bloqueo se
--   toma con la clave correcta y en el orden correcto, queda cubierto el
--   único eslabón que sí nos corresponde.
--
--   Si además quieres ver la carrera en vivo, al final del archivo está el
--   procedimiento con dos conexiones psql (no lleva credenciales escritas).
--
-- Es REPETIBLE y no destructivo: usa empresas propias con el prefijo
-- 'ZZZ Prueba', las limpia al empezar y al terminar, y no toca datos reales.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Limpieza previa y comprobación de que la cola está en reposo
-- ---------------------------------------------------------------------------
do $$
declare
  v_busy integer;
begin
  delete from public.sales_send_queue
  where company_id in (select id from public.sales_companies where name like 'ZZZ Prueba%');

  delete from public.sales_events
  where company_id in (select id from public.sales_companies where name like 'ZZZ Prueba%');

  delete from public.sales_followups
  where company_id in (select id from public.sales_companies where name like 'ZZZ Prueba%');

  delete from public.sales_companies where name like 'ZZZ Prueba%';

  -- Un envío real reciente falsearía las pruebas de cupo y de separación.
  select count(*) into v_busy
  from public.sales_send_queue
  where (accepted_at is not null and accepted_at > now() - interval '1 hour')
     or status in ('PROCESANDO', 'PROGRAMADO');

  if v_busy > 0 then
    raise exception
      'La cola tiene % envío(s) reales activos o recientes. Corre esta prueba con la cola en reposo para que los resultados sean válidos.',
      v_busy;
  end if;

  raise notice 'Limpieza lista · la cola está en reposo.';
end $$;

-- ---------------------------------------------------------------------------
-- PRUEBA 1 · La reserva toma el bloqueo global antes de tocar la cola
-- ---------------------------------------------------------------------------
do $$
declare
  v_company uuid;
  v_key bigint := public.sales_dispatch_lock_key();
  v_before integer;
  v_after integer;
  v_source text;
  v_pos_lock integer;
  v_pos_update integer;
  i integer;
begin
  raise notice '--- PRUEBA 1: bloqueo global de despacho ---';

  -- Tres empresas distintas, un envío vencido cada una. Cada envío usa su
  -- propia empresa porque sales_send_queue_one_active_idx impide, con razón,
  -- que un prospecto tenga dos envíos vivos del mismo tipo.
  for i in 1..3 loop
    insert into public.sales_companies (name, primary_email, status, source)
    values ('ZZZ Prueba Concurrencia ' || i,
            'prueba.concurrencia' || i || '@example.invalid',
            'NUEVO', 'TEST')
    returning id into v_company;

    insert into public.sales_send_queue
      (company_id, kind, recipient_email, subject, body, status, scheduled_at)
    values (v_company, 'PRIMER_CONTACTO',
            'prueba.concurrencia' || i || '@example.invalid',
            'Prueba ' || i, 'Cuerpo de prueba', 'PROGRAMADO',
            now() - interval '1 hour');
  end loop;

  -- (a) El bloqueo NO está tomado antes de reservar.
  select count(*) into v_before
  from pg_locks
  where locktype = 'advisory'
    and pid = pg_backend_pid()
    and granted
    and ((classid::bigint << 32) | (objid::bigint & 4294967295)) = v_key;

  if v_before <> 0 then
    raise exception 'FALLA: el bloqueo de despacho ya estaba tomado antes de empezar.';
  end if;

  -- Reservamos. El bloqueo es de transacción, así que sigue tomado aquí dentro.
  perform public.sales_claim_next_send(100, 2100);

  select count(*) into v_after
  from pg_locks
  where locktype = 'advisory'
    and pid = pg_backend_pid()
    and granted
    and ((classid::bigint << 32) | (objid::bigint & 4294967295)) = v_key;

  if v_after = 0 then
    raise exception
      'FALLA: la reserva no tomó el bloqueo global (clave %). Sin él, dos procesos pueden despachar a la vez.',
      v_key;
  end if;

  raise notice 'CORRECTO: la reserva toma el bloqueo global sobre la clave %.', v_key;

  -- (b) El bloqueo se pide ANTES de modificar la cola. Si el orden se
  --     invirtiera en un cambio futuro, la exclusión mutua dejaría de servir.
  select pg_get_functiondef(p.oid) into v_source
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'sales_claim_next_send';

  v_pos_lock := position('pg_try_advisory_xact_lock' in v_source);
  v_pos_update := position('update public.sales_send_queue' in v_source);

  if v_pos_lock = 0 then
    raise exception 'FALLA: la reserva no usa pg_try_advisory_xact_lock.';
  end if;

  if v_pos_update > 0 and v_pos_lock > v_pos_update then
    raise exception 'FALLA: la reserva modifica la cola antes de pedir el bloqueo.';
  end if;

  raise notice 'CORRECTO: el bloqueo se pide antes de tocar la cola.';
  raise notice 'PRUEBA 1 SUPERADA.';
end $$;

-- ---------------------------------------------------------------------------
-- PRUEBA 2 · Con un envío en curso no se reserva otro
-- ---------------------------------------------------------------------------
do $$
declare
  v_claimed integer;
begin
  raise notice '--- PRUEBA 2: un envío a la vez ---';

  -- La PRUEBA 1 dejó un envío en PROCESANDO. Debe bloquear al resto.
  if not exists (select 1 from public.sales_send_queue where status = 'PROCESANDO') then
    raise exception 'FALLA: la PRUEBA 1 no dejó ningún envío reservado.';
  end if;

  select count(*) into v_claimed from public.sales_claim_next_send(100, 2100);

  if v_claimed > 0 then
    raise exception 'FALLA: reservó otro envío habiendo uno en curso.';
  end if;

  raise notice 'CORRECTO: con un envío en curso no se reserva otro.';
  raise notice 'PRUEBA 2 SUPERADA.';
end $$;

-- ---------------------------------------------------------------------------
-- PRUEBA 3 · Los envíos atascados se liberan
-- ---------------------------------------------------------------------------
do $$
declare
  v_released integer;
  v_status text;
begin
  raise notice '--- PRUEBA 3: liberación de atascados ---';

  -- Envejecemos el envío en curso para simular un proceso caído.
  update public.sales_send_queue
  set processing_started_at = now() - interval '30 minutes'
  where status = 'PROCESANDO';

  select public.sales_release_stuck_sends() into v_released;

  if v_released < 1 then
    raise exception 'FALLA: no liberó el envío atascado.';
  end if;

  -- La liberación limpia processing_started_at y, con max_attempts = 1,
  -- deja el envío en ERROR en vez de reintentarlo.
  select status into v_status
  from public.sales_send_queue
  where company_id in (select id from public.sales_companies where name like 'ZZZ Prueba Concurrencia%')
  order by created_at asc
  limit 1;

  if v_status not in ('PROGRAMADO', 'ERROR') then
    raise exception 'FALLA: el envío liberado quedó en %, y debía quedar en PROGRAMADO o ERROR.', v_status;
  end if;

  if exists (select 1 from public.sales_send_queue
             where status = 'PROCESANDO' and processing_started_at is not null) then
    raise exception 'FALLA: quedó un envío marcado como en curso tras la liberación.';
  end if;

  raise notice 'CORRECTO: % envío(s) atascado(s) liberado(s), quedan en %.', v_released, v_status;
  raise notice 'PRUEBA 3 SUPERADA.';
end $$;

-- ---------------------------------------------------------------------------
-- PRUEBA 4 · Separación mínima de 35 minutos
-- ---------------------------------------------------------------------------
do $$
declare
  v_company uuid;
  v_claimed integer;
begin
  raise notice '--- PRUEBA 4: separación mínima ---';

  delete from public.sales_send_queue
  where company_id in (select id from public.sales_companies where name like 'ZZZ Prueba%');
  delete from public.sales_companies where name like 'ZZZ Prueba%';

  -- Empresa con un envío aceptado hace 10 minutos.
  insert into public.sales_companies (name, primary_email, status, source)
  values ('ZZZ Prueba Separacion A', 'prueba.sep.a@example.invalid', 'CONTACTADO', 'TEST')
  returning id into v_company;

  insert into public.sales_send_queue
    (company_id, kind, recipient_email, subject, body, status, accepted_at, is_test)
  values (v_company, 'PRIMER_CONTACTO', 'prueba.sep.a@example.invalid',
          'Aceptado reciente', 'Cuerpo', 'ACEPTADO_POR_MICROSOFT',
          now() - interval '10 minutes', false);

  -- Otra empresa con un envío vencido esperando.
  insert into public.sales_companies (name, primary_email, status, source)
  values ('ZZZ Prueba Separacion B', 'prueba.sep.b@example.invalid', 'NUEVO', 'TEST')
  returning id into v_company;

  insert into public.sales_send_queue
    (company_id, kind, recipient_email, subject, body, status, scheduled_at)
  values (v_company, 'PRIMER_CONTACTO', 'prueba.sep.b@example.invalid',
          'Pendiente', 'Cuerpo', 'PROGRAMADO', now() - interval '1 hour');

  select count(*) into v_claimed from public.sales_claim_next_send(100, 2100);

  if v_claimed > 0 then
    raise exception 'FALLA: reservó un envío a solo 10 minutos del anterior. La barrera de 35 minutos no se aplicó.';
  end if;

  raise notice 'CORRECTO: la separación mínima de 35 minutos se respeta.';
  raise notice 'PRUEBA 4 SUPERADA.';
end $$;

-- ---------------------------------------------------------------------------
-- PRUEBA 5 · El cupo diario no se supera y las pruebas no lo consumen
-- ---------------------------------------------------------------------------
do $$
declare
  v_company uuid;
  v_claimed integer;
  v_today timestamptz := (date_trunc('day', now() at time zone 'America/Santiago')
                          at time zone 'America/Santiago') + interval '1 second';
  i integer;
begin
  raise notice '--- PRUEBA 5: cupo diario ---';

  delete from public.sales_send_queue
  where company_id in (select id from public.sales_companies where name like 'ZZZ Prueba%');
  delete from public.sales_companies where name like 'ZZZ Prueba%';

  -- Dos envíos REALES aceptados hoy. Se anclan al inicio del día en Santiago:
  -- con "hace 3 horas" caerían en el día anterior si la prueba corre de
  -- madrugada, y el conteo diario no los vería.
  for i in 1..2 loop
    insert into public.sales_companies (name, primary_email, status, source)
    values ('ZZZ Prueba Cupo ' || i, 'prueba.cupo' || i || '@example.invalid', 'CONTACTADO', 'TEST')
    returning id into v_company;

    insert into public.sales_send_queue
      (company_id, kind, recipient_email, subject, body, status, accepted_at, is_test)
    values (v_company, 'PRIMER_CONTACTO', 'prueba.cupo' || i || '@example.invalid',
            'Aceptado hoy ' || i, 'Cuerpo', 'ACEPTADO_POR_MICROSOFT', v_today, false);
  end loop;

  -- Y uno de PRUEBA, que NO debe consumir cupo real.
  insert into public.sales_companies (name, primary_email, status, source)
  values ('ZZZ Prueba Cupo Test', 'prueba.cupo.test@example.invalid', 'NUEVO', 'TEST')
  returning id into v_company;

  insert into public.sales_send_queue
    (company_id, kind, recipient_email, subject, body, status, accepted_at, is_test)
  values (v_company, 'PRIMER_CONTACTO', 'prueba.cupo.test@example.invalid',
          'Aceptado de prueba', 'Cuerpo', 'ACEPTADO_POR_MICROSOFT', v_today, true);

  -- Un envío vencido esperando.
  insert into public.sales_companies (name, primary_email, status, source)
  values ('ZZZ Prueba Cupo Pendiente', 'prueba.cupo.pend@example.invalid', 'NUEVO', 'TEST')
  returning id into v_company;

  insert into public.sales_send_queue
    (company_id, kind, recipient_email, subject, body, status, scheduled_at)
  values (v_company, 'PRIMER_CONTACTO', 'prueba.cupo.pend@example.invalid',
          'Pendiente', 'Cuerpo', 'PROGRAMADO', now() - interval '1 hour');

  -- Con cupo 2 y dos envíos REALES hoy, no debe reservar.
  select count(*) into v_claimed from public.sales_claim_next_send(2, 1);

  if v_claimed > 0 then
    raise exception 'FALLA: reservó pese a tener el cupo diario agotado.';
  end if;

  raise notice 'CORRECTO: el cupo diario se respeta.';

  -- Con cupo 3 sí debe reservar: el envío de prueba no cuenta como real.
  select count(*) into v_claimed from public.sales_claim_next_send(3, 1);

  if v_claimed <> 1 then
    raise exception 'FALLA: con cupo disponible debía reservar 1 envío, reservó %.', v_claimed;
  end if;

  raise notice 'CORRECTO: los envíos de prueba no consumen cupo real.';
  raise notice 'PRUEBA 5 SUPERADA.';
end $$;

-- ---------------------------------------------------------------------------
-- PRUEBA 6 · Un prospecto no puede tener dos envíos vivos del mismo tipo
-- ---------------------------------------------------------------------------
do $$
declare
  v_company uuid;
  v_duplicado boolean := false;
begin
  raise notice '--- PRUEBA 6: sin envíos duplicados por prospecto ---';

  delete from public.sales_send_queue
  where company_id in (select id from public.sales_companies where name like 'ZZZ Prueba%');
  delete from public.sales_companies where name like 'ZZZ Prueba%';

  insert into public.sales_companies (name, primary_email, status, source)
  values ('ZZZ Prueba Duplicado', 'prueba.dup@example.invalid', 'NUEVO', 'TEST')
  returning id into v_company;

  insert into public.sales_send_queue
    (company_id, kind, recipient_email, subject, body, status, scheduled_at)
  values (v_company, 'PRIMER_CONTACTO', 'prueba.dup@example.invalid',
          'Primero', 'Cuerpo', 'PROGRAMADO', now() + interval '1 hour');

  begin
    insert into public.sales_send_queue
      (company_id, kind, recipient_email, subject, body, status, scheduled_at)
    values (v_company, 'PRIMER_CONTACTO', 'prueba.dup@example.invalid',
            'Segundo', 'Cuerpo', 'PROGRAMADO', now() + interval '2 hours');
    v_duplicado := true;
  exception when unique_violation then
    v_duplicado := false;
  end;

  if v_duplicado then
    raise exception 'FALLA: aceptó dos primeros contactos vivos para el mismo prospecto.';
  end if;

  raise notice 'CORRECTO: el índice impide duplicar el envío vivo de un prospecto.';

  -- Otro tipo de envío para la misma empresa sí debe permitirse.
  insert into public.sales_send_queue
    (company_id, kind, recipient_email, subject, body, status, scheduled_at)
  values (v_company, 'SEGUIMIENTO', 'prueba.dup@example.invalid',
          'Seguimiento', 'Cuerpo', 'PROGRAMADO', now() + interval '3 hours');

  raise notice 'CORRECTO: un tipo distinto de envío sí se permite.';
  raise notice 'PRUEBA 6 SUPERADA.';
end $$;

-- ---------------------------------------------------------------------------
-- Limpieza final
-- ---------------------------------------------------------------------------
do $$
begin
  delete from public.sales_send_queue
  where company_id in (select id from public.sales_companies where name like 'ZZZ Prueba%');

  delete from public.sales_events
  where company_id in (select id from public.sales_companies where name like 'ZZZ Prueba%');

  delete from public.sales_followups
  where company_id in (select id from public.sales_companies where name like 'ZZZ Prueba%');

  delete from public.sales_companies where name like 'ZZZ Prueba%';

  raise notice '=== TODAS LAS PRUEBAS SUPERADAS · datos de prueba eliminados ===';
end $$;

-- ============================================================================
-- OPCIONAL · Ver la carrera real con dos conexiones
-- ----------------------------------------------------------------------------
-- El editor de Supabase no permite abrir una segunda conexión, pero psql sí.
-- No escribas la contraseña en este archivo: tómala de la variable de entorno.
--
--   Terminal 1:
--     psql "$SUPABASE_DB_URL"
--     begin;
--     select id from public.sales_claim_next_send(100, 2100);
--     -- deja la transacción ABIERTA
--
--   Terminal 2 (al mismo tiempo):
--     psql "$SUPABASE_DB_URL"
--     select id from public.sales_claim_next_send(100, 2100);
--     -- debe devolver CERO filas: el bloqueo global lo tiene la Terminal 1
--
--   Terminal 1:
--     rollback;
-- ============================================================================
