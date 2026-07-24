-- =====================================================================
-- Notificaciones en tiempo real del panel Admin
-- =====================================================================
-- Habilita Supabase Realtime para que el panel Admin reciba avisos
-- instantáneos cuando entra un nuevo contacto (Lead) o una nueva
-- cotización (Quote) desde el sitio web.
--
-- Cómo aplicarlo:
--   1) Abre Supabase -> SQL Editor.
--   2) Pega este archivo completo y ejecútalo (Run).
--
-- Es idempotente: puedes ejecutarlo varias veces sin problema.
--
-- NOTA: Aunque no ejecutes este SQL, el panel igual muestra las
-- notificaciones gracias a un respaldo por sondeo (polling) cada 30s.
-- Con este SQL, además, llegan de forma instantánea.
-- =====================================================================

-- La publicación 'supabase_realtime' ya existe en todo proyecto Supabase.
-- Agregamos las tablas relevantes si aún no están incluidas.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then

    -- Lead (contactos desde el sitio)
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'Lead'
    ) and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = 'Lead'
    ) then
      execute 'alter publication supabase_realtime add table public."Lead"';
    end if;

    -- Quote (cotizaciones desde el sitio)
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'Quote'
    ) and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = 'Quote'
    ) then
      execute 'alter publication supabase_realtime add table public."Quote"';
    end if;

  end if;
end
$$;

-- Verificación (opcional): debería listar Lead y Quote.
-- select schemaname, tablename
-- from pg_publication_tables
-- where pubname = 'supabase_realtime'
--   and tablename in ('Lead', 'Quote');
