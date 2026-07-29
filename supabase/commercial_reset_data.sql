-- =====================================================================
-- Zyteron · Limpieza de datos de prueba del área Comercial
-- =====================================================================
-- ⚠️  DESTRUCTIVO E IRREVERSIBLE. Borra registros, no borra tablas ni
--     columnas: la estructura del módulo queda intacta y operativa.
--
-- Antes de correrlo conviene tener un respaldo (Supabase → Database →
-- Backups, o exportar las tablas commercial_*).
--
-- CÓMO USARLO
--   1. Ajusta el interruptor `borrar_accesos` de más abajo.
--   2. Ejecuta el archivo completo en Supabase → SQL Editor → Run.
--   3. Revisa el recuento final que imprime al terminar.
--
--   borrar_accesos = false  → limpia toda la operación (prospectos,
--       bitácora, comisiones, liquidaciones, auditoría y avisos) y
--       CONSERVA los usuarios comerciales con sus credenciales.
--
--   borrar_accesos = true   → además elimina los usuarios comerciales.
--       Tendrás que volver a crearlos desde /admin/comercial → Equipo.
--
-- Requiere haber corrido antes: commercial_users.sql,
-- commercial_portal_data.sql y commercial_pro_upgrade.sql.
-- =====================================================================

-- ---------- Estado ANTES de limpiar ----------------------------------
select 'ANTES' as momento, 'commercial_users'           as tabla, count(*) from public.commercial_users
union all select 'ANTES', 'commercial_leads',            count(*) from public.commercial_leads
union all select 'ANTES', 'commercial_lead_activities',  count(*) from public.commercial_lead_activities
union all select 'ANTES', 'commercial_commissions',      count(*) from public.commercial_commissions
union all select 'ANTES', 'commercial_statements',       count(*) from public.commercial_statements
union all select 'ANTES', 'commercial_audit_log',        count(*) from public.commercial_audit_log
union all select 'ANTES', 'commercial_notifications',    count(*) from public.commercial_notifications;

-- ---------- Limpieza --------------------------------------------------
do $$
declare
  -- ⚠️ ÚNICO INTERRUPTOR: ponlo en true para borrar también los accesos.
  borrar_accesos boolean := false;

  borrados_actividades  bigint;
  borrados_comisiones   bigint;
  borradas_liquidaciones bigint;
  borradas_notificaciones bigint;
  borrada_auditoria     bigint;
  borrados_prospectos   bigint;
  borrados_usuarios     bigint := 0;
begin
  -- El orden respeta las dependencias: primero lo que cuelga de un
  -- prospecto o de un usuario, y al final los prospectos y los accesos.

  delete from public.commercial_lead_activities;
  get diagnostics borrados_actividades = row_count;

  delete from public.commercial_commissions;
  get diagnostics borrados_comisiones = row_count;

  delete from public.commercial_statements;
  get diagnostics borradas_liquidaciones = row_count;

  delete from public.commercial_notifications;
  get diagnostics borradas_notificaciones = row_count;

  delete from public.commercial_audit_log;
  get diagnostics borrada_auditoria = row_count;

  delete from public.commercial_leads;
  get diagnostics borrados_prospectos = row_count;

  if borrar_accesos then
    delete from public.commercial_users;
    get diagnostics borrados_usuarios = row_count;
  end if;

  raise notice '--- Limpieza del área comercial ---';
  raise notice 'Gestiones de bitácora eliminadas: %', borrados_actividades;
  raise notice 'Comisiones eliminadas:            %', borrados_comisiones;
  raise notice 'Liquidaciones eliminadas:         %', borradas_liquidaciones;
  raise notice 'Notificaciones eliminadas:        %', borradas_notificaciones;
  raise notice 'Eventos de auditoría eliminados:  %', borrada_auditoria;
  raise notice 'Prospectos eliminados:            %', borrados_prospectos;
  if borrar_accesos then
    raise notice 'Usuarios comerciales eliminados:  %', borrados_usuarios;
  else
    raise notice 'Usuarios comerciales: se conservaron (borrar_accesos = false).';
  end if;
end $$;

-- ---------- Estado DESPUÉS de limpiar --------------------------------
select 'DESPUES' as momento, 'commercial_users'          as tabla, count(*) from public.commercial_users
union all select 'DESPUES', 'commercial_leads',           count(*) from public.commercial_leads
union all select 'DESPUES', 'commercial_lead_activities', count(*) from public.commercial_lead_activities
union all select 'DESPUES', 'commercial_commissions',     count(*) from public.commercial_commissions
union all select 'DESPUES', 'commercial_statements',      count(*) from public.commercial_statements
union all select 'DESPUES', 'commercial_audit_log',       count(*) from public.commercial_audit_log
union all select 'DESPUES', 'commercial_notifications',   count(*) from public.commercial_notifications;

-- =====================================================================
-- VARIANTES ÚTILES (ejecutar por separado, no forman parte del script)
-- =====================================================================
--
-- A · Limpiar solo lo de UN ejecutivo, conservando su acceso.
--     Reemplaza el RUT por el que corresponda.
--
-- with objetivo as (select id from public.commercial_users where rut = '12345678-9')
-- delete from public.commercial_leads
--  where owner_id in (select id from objetivo);
-- -- La bitácora, comisiones, liquidaciones y avisos de ese ejecutivo caen
-- -- en cascada junto con sus prospectos y su relación de propietario.
--
-- B · Eliminar un único usuario comercial y todo lo suyo.
--
-- delete from public.commercial_users where rut = '12345678-9';
--
-- C · Borrar solo las comisiones y liquidaciones, dejando la cartera.
--
-- delete from public.commercial_statements;
-- update public.commercial_commissions set statement_id = null;
-- delete from public.commercial_commissions;
-- =====================================================================
