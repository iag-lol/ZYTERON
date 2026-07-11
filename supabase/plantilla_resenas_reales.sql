-- =========================================================
-- PLANTILLA: cargar reseñas REALES recibidas fuera de la web
-- (WhatsApp, correo, llamada) a la tabla ClientReview.
--
-- USO LEGÍTIMO: transcribir el comentario textual de un cliente
-- real, con su permiso, indicando el origen en `source`.
-- Reemplaza los <PLACEHOLDERS> con los datos reales del cliente.
-- Duplica el bloque INSERT por cada reseña que tengas.
--
-- IMPORTANTE: no inventar reseñas. Los patrones de reseñas
-- fabricadas (fechas agrupadas, estilo uniforme, empresas no
-- rastreables) son detectables y constituyen publicidad engañosa.
-- =========================================================

insert into public."ClientReview"
  (id, name, email, company, rating, comment, service, status, source, "createdAt", "approvedAt")
values (
  gen_random_uuid()::text,
  '<NOMBRE REAL DEL CLIENTE>',            -- ej: 'María Fernanda Rojas'
  '<EMAIL O NULL>',                       -- opcional, no se muestra público
  '<EMPRESA O NULL>',                     -- ej: 'Ferretería El Tornillo'
  5,                                      -- 1 a 5, la nota que el cliente dio
  '<COMENTARIO TEXTUAL DEL CLIENTE>',     -- copiar tal cual lo escribió (con su permiso)
  '<SERVICIO O NULL>',                    -- ej: 'Página web', 'Sistema de flota'
  'APPROVED',
  'whatsapp-transcripcion',               -- origen real: 'whatsapp-transcripcion', 'email', 'llamada'
  '<FECHA REAL DEL MENSAJE>',             -- ej: '2026-05-14T10:30:00-04:00'
  now()
);

-- Verificación: reseñas aprobadas más recientes.
select name, company, rating, left(comment, 60) as comentario, "createdAt"
from public."ClientReview"
where status = 'APPROVED'
order by "createdAt" desc;
