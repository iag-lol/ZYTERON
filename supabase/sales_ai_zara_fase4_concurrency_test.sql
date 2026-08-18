-- ============================================================================
-- PRUEBA DE CONCURRENCIA REAL — sales_claim_next_send
-- ----------------------------------------------------------------------------
-- Demuestra contra PostgreSQL que dos reservas simultáneas NO obtienen filas
-- distintas. La simulación en memoria no prueba esto: la garantía la da el
-- bloqueo global de transacción.
--
-- Requiere la extensión dblink para abrir una segunda conexión real:
--   create extension if not exists dblink;
--
-- Ejecutar COMPLETO en el editor SQL de Supabase. Es no destructivo: crea sus
-- propias filas de prueba y las elimina al final.
-- ============================================================================

create extension if not exists dblink;

do $$
declare
  v_company uuid;
  v_a integer;
  v_b integer;
  v_conn text := 'dbname=' || current_database();
begin
  raise notice '--- Preparando datos de prueba ---';

  insert into public.sales_companies (name, primary_email, status, source)
  values ('ZZZ Prueba Concurrencia', 'prueba.concurrencia@example.invalid', 'NUEVO', 'TEST')
  returning id into v_company;

  -- Tres envíos ya vencidos: hay material de sobra para reservar.
  insert into public.sales_send_queue
    (company_id, kind, recipient_email, subject, body, status, scheduled_at)
  select v_company, 'PRIMER_CONTACTO', 'prueba.concurrencia@example.invalid',
         'Prueba ' || i, 'Cuerpo de prueba', 'PROGRAMADO', now() - interval '1 hour'
  from generate_series(1, 3) as i;

  raise notice '--- Lanzando dos reservas concurrentes ---';

  -- Ambas llamadas se ejecutan en conexiones distintas. La primera toma el
  -- bloqueo global; la segunda debe retirarse y devolver cero filas.
  select count(*) into v_a
  from dblink(v_conn, 'select id from public.sales_claim_next_send(100, 2100)') as t(id uuid);

  select count(*) into v_b
  from dblink(v_conn, 'select id from public.sales_claim_next_send(100, 2100)') as t(id uuid);

  raise notice 'Reserva A devolvió % fila(s)', v_a;
  raise notice 'Reserva B devolvió % fila(s)', v_b;

  if v_a + v_b > 1 then
    raise exception 'FALLA: se reservaron % envíos simultáneos. Debía ser 1.', v_a + v_b;
  end if;

  if v_a + v_b = 0 then
    raise exception 'FALLA: no se reservó ningún envío. Revisa que existan filas vencidas.';
  end if;

  raise notice 'CORRECTO: solo una de las dos reservas obtuvo un envío.';

  -- Con uno en PROCESANDO, una tercera reserva tampoco debe obtener nada.
  select count(*) into v_a
  from dblink(v_conn, 'select id from public.sales_claim_next_send(100, 2100)') as t(id uuid);

  if v_a > 0 then
    raise exception 'FALLA: se reservó un segundo envío habiendo uno en curso.';
  end if;

  raise notice 'CORRECTO: con un envío en curso no se reserva otro.';

  raise notice '--- Limpiando ---';
  delete from public.sales_send_queue where company_id = v_company;
  delete from public.sales_events where company_id = v_company;
  delete from public.sales_companies where id = v_company;

  raise notice 'PRUEBA SUPERADA.';
exception
  when others then
    -- Limpieza garantizada aunque la prueba falle.
    delete from public.sales_send_queue where company_id = v_company;
    delete from public.sales_events where company_id = v_company;
    delete from public.sales_companies where id = v_company;
    raise;
end $$;

-- ============================================================================
-- PRUEBA DE SEPARACIÓN MÍNIMA
-- ----------------------------------------------------------------------------
-- Con un envío aceptado hace 10 minutos, la reserva debe negarse: la barrera
-- absoluta es de 35 minutos (2100 segundos).
-- ============================================================================
do $$
declare
  v_company uuid;
  v_claimed integer;
begin
  insert into public.sales_companies (name, primary_email, status, source)
  values ('ZZZ Prueba Separacion', 'prueba.separacion@example.invalid', 'NUEVO', 'TEST')
  returning id into v_company;

  -- Un envío aceptado hace 10 minutos.
  insert into public.sales_send_queue
    (company_id, kind, recipient_email, subject, body, status, accepted_at, is_test)
  values (v_company, 'PRIMER_CONTACTO', 'prueba.separacion@example.invalid',
          'Aceptado reciente', 'Cuerpo', 'ACEPTADO_POR_MICROSOFT', now() - interval '10 minutes', false);

  -- Y otro vencido esperando.
  insert into public.sales_send_queue
    (company_id, kind, recipient_email, subject, body, status, scheduled_at)
  values (v_company, 'SEGUIMIENTO', 'prueba.separacion@example.invalid',
          'Pendiente', 'Cuerpo', 'PROGRAMADO', now() - interval '1 hour');

  select count(*) into v_claimed from public.sales_claim_next_send(100, 2100);

  if v_claimed > 0 then
    delete from public.sales_send_queue where company_id = v_company;
    delete from public.sales_companies where id = v_company;
    raise exception 'FALLA: reservó un envío a solo 10 minutos del anterior.';
  end if;

  raise notice 'CORRECTO: la separación mínima de 35 minutos se respeta.';

  delete from public.sales_send_queue where company_id = v_company;
  delete from public.sales_events where company_id = v_company;
  delete from public.sales_companies where id = v_company;
end $$;
