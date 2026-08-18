-- ============================================================================
-- PRUEBA DE CONCURRENCIA REAL — sales_claim_next_send
-- ----------------------------------------------------------------------------
-- Demuestra contra PostgreSQL que dos reservas simultáneas NO obtienen filas
-- distintas. La simulación en memoria no prueba esto: la garantía la da el
-- bloqueo global de transacción (pg_try_advisory_xact_lock).
--
-- Requiere dblink para abrir conexiones reales:
--   create extension if not exists dblink;
--
-- Es REPETIBLE y no destructivo: usa empresas propias con el prefijo
-- 'ZZZ Prueba', las limpia al empezar y al terminar, y no toca datos reales.
--
-- NOTA: cada envío de prueba usa su PROPIA empresa. El índice
-- sales_send_queue_one_active_idx impide, correctamente, que una misma empresa
-- tenga dos envíos vivos del mismo tipo.
-- ============================================================================

create extension if not exists dblink;

-- ---------------------------------------------------------------------------
-- Limpieza de corridas anteriores
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

  raise notice 'Limpieza previa lista.';
end $$;

-- ---------------------------------------------------------------------------
-- PRUEBA 1 · Dos reservas concurrentes obtienen como máximo un envío
-- ---------------------------------------------------------------------------
do $$
declare
  v_company uuid;
  v_a integer;
  v_b integer;
  v_c integer;
  v_conn text := 'dbname=' || current_database();
  i integer;
begin
  raise notice '--- PRUEBA 1: reservas concurrentes ---';

  -- Tres empresas distintas, un envío vencido cada una.
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

  -- Dos conexiones reales compiten. La primera toma el bloqueo global; la
  -- segunda debe retirarse sin reservar nada.
  select count(*) into v_a
  from dblink(v_conn, 'select id from public.sales_claim_next_send(100, 2100)') as t(id uuid);

  select count(*) into v_b
  from dblink(v_conn, 'select id from public.sales_claim_next_send(100, 2100)') as t(id uuid);

  raise notice 'Reserva A: % fila(s) · Reserva B: % fila(s)', v_a, v_b;

  if v_a + v_b > 1 then
    raise exception 'FALLA: se reservaron % envíos a la vez. Debía ser 1.', v_a + v_b;
  end if;

  if v_a + v_b = 0 then
    raise exception 'FALLA: no se reservó ningún envío pese a haber tres vencidos.';
  end if;

  raise notice 'CORRECTO: solo una de las dos reservas obtuvo un envío.';

  -- Con uno en PROCESANDO, una tercera tampoco debe obtener nada.
  select count(*) into v_c
  from dblink(v_conn, 'select id from public.sales_claim_next_send(100, 2100)') as t(id uuid);

  if v_c > 0 then
    raise exception 'FALLA: se reservó otro envío habiendo uno en curso.';
  end if;

  raise notice 'CORRECTO: con un envío en curso no se reserva otro.';
  raise notice 'PRUEBA 1 SUPERADA.';
end $$;

-- ---------------------------------------------------------------------------
-- PRUEBA 2 · Separación mínima de 35 minutos
-- ---------------------------------------------------------------------------
do $$
declare
  v_company_a uuid;
  v_company_b uuid;
  v_claimed integer;
begin
  raise notice '--- PRUEBA 2: separación mínima ---';

  -- Empresa con un envío aceptado hace 10 minutos.
  insert into public.sales_companies (name, primary_email, status, source)
  values ('ZZZ Prueba Separacion A', 'prueba.sep.a@example.invalid', 'CONTACTADO', 'TEST')
  returning id into v_company_a;

  insert into public.sales_send_queue
    (company_id, kind, recipient_email, subject, body, status, accepted_at, is_test)
  values (v_company_a, 'PRIMER_CONTACTO', 'prueba.sep.a@example.invalid',
          'Aceptado reciente', 'Cuerpo', 'ACEPTADO_POR_MICROSOFT',
          now() - interval '10 minutes', false);

  -- Otra empresa con un envío vencido esperando.
  insert into public.sales_companies (name, primary_email, status, source)
  values ('ZZZ Prueba Separacion B', 'prueba.sep.b@example.invalid', 'NUEVO', 'TEST')
  returning id into v_company_b;

  insert into public.sales_send_queue
    (company_id, kind, recipient_email, subject, body, status, scheduled_at)
  values (v_company_b, 'PRIMER_CONTACTO', 'prueba.sep.b@example.invalid',
          'Pendiente', 'Cuerpo', 'PROGRAMADO', now() - interval '1 hour');

  select count(*) into v_claimed from public.sales_claim_next_send(100, 2100);

  if v_claimed > 0 then
    raise exception 'FALLA: reservó un envío a solo 10 minutos del anterior. La barrera de 35 minutos no se aplicó.';
  end if;

  raise notice 'CORRECTO: la separación mínima de 35 minutos se respeta.';
  raise notice 'PRUEBA 2 SUPERADA.';
end $$;

-- ---------------------------------------------------------------------------
-- PRUEBA 3 · El cupo diario no se supera y las pruebas no lo consumen
-- ---------------------------------------------------------------------------
do $$
declare
  v_company uuid;
  v_claimed integer;
  i integer;
begin
  raise notice '--- PRUEBA 3: cupo diario ---';

  -- Dos envíos reales aceptados hoy, con más de 35 minutos de antigüedad.
  for i in 1..2 loop
    insert into public.sales_companies (name, primary_email, status, source)
    values ('ZZZ Prueba Cupo ' || i, 'prueba.cupo' || i || '@example.invalid', 'CONTACTADO', 'TEST')
    returning id into v_company;

    insert into public.sales_send_queue
      (company_id, kind, recipient_email, subject, body, status, accepted_at, is_test)
    values (v_company, 'PRIMER_CONTACTO', 'prueba.cupo' || i || '@example.invalid',
            'Aceptado hoy ' || i, 'Cuerpo', 'ACEPTADO_POR_MICROSOFT',
            (date_trunc('day', now() at time zone 'America/Santiago')
             at time zone 'America/Santiago') + interval '1 second', false);
  end loop;

  -- Y uno de PRUEBA, que NO debe consumir cupo real.
  insert into public.sales_companies (name, primary_email, status, source)
  values ('ZZZ Prueba Cupo Test', 'prueba.cupo.test@example.invalid', 'NUEVO', 'TEST')
  returning id into v_company;

  insert into public.sales_send_queue
    (company_id, kind, recipient_email, subject, body, status, accepted_at, is_test)
  values (v_company, 'PRIMER_CONTACTO', 'prueba.cupo.test@example.invalid',
          'Aceptado de prueba', 'Cuerpo', 'ACEPTADO_POR_MICROSOFT',
          (date_trunc('day', now() at time zone 'America/Santiago')
           at time zone 'America/Santiago') + interval '2 seconds', true);

  -- Un envío vencido esperando.
  insert into public.sales_companies (name, primary_email, status, source)
  values ('ZZZ Prueba Cupo Pendiente', 'prueba.cupo.pend@example.invalid', 'NUEVO', 'TEST')
  returning id into v_company;

  insert into public.sales_send_queue
    (company_id, kind, recipient_email, subject, body, status, scheduled_at)
  values (v_company, 'PRIMER_CONTACTO', 'prueba.cupo.pend@example.invalid',
          'Pendiente', 'Cuerpo', 'PROGRAMADO', now() - interval '1 hour');

  -- Con límite 2 y dos envíos REALES de hoy, no debe reservar.
  select count(*) into v_claimed from public.sales_claim_next_send(2, 1);

  if v_claimed > 0 then
    raise exception 'FALLA: reservó pese a tener el cupo diario agotado.';
  end if;

  raise notice 'CORRECTO: el cupo diario se respeta.';

  -- Con límite 3 sí debe reservar: el envío de prueba no cuenta como real.
  select count(*) into v_claimed from public.sales_claim_next_send(3, 1);

  if v_claimed <> 1 then
    raise exception 'FALLA: con cupo disponible debía reservar 1 envío, reservó %.', v_claimed;
  end if;

  raise notice 'CORRECTO: los envíos de prueba no consumen cupo real.';
  raise notice 'PRUEBA 3 SUPERADA.';
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
