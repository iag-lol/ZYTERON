# Recuperación del Control original

La interfaz administrativa completa se había conectado a la base de la web (`bwybwrxrbzjkwpxhpkcr`) con el esquema del Control, pero sin sus registros. El Control original (`hyvregmkdawcbeuhhaqc`) conservaba los datos. Se recuperaron sin eliminar ni reemplazar la base original.

- Inventario real: 103 tablas pobladas, 2.931 registros leídos sin errores.
- Recuperación: 746 registros insertados en 45 tablas; 2 sitios, 1 proyecto, 1 orden, 2 documentos, 3 pagos bancarios confirmados, 1 ticket y 1 venta originales.
- El cliente original se vinculó con un cliente existente únicamente tras coincidencia única de RUT normalizado y correo. Se conservaron los cinco clientes existentes.
- Se archivaron los 2.931 registros originales como evidencia privada, con hash y mapa de claves. Lote `a47563d4-c430-4251-a9c2-c39acfcec885`.
- Roles, identidades, dispositivos, sesiones y colas antiguas quedaron archivados; no se activaron ni se reprodujeron trabajos/notificaciones.
- Los dos sitios y el proyecto siguen marcados `INTERNAL`; los documentos siguen `DRAFT` y no publicados. Recuperar datos no autoriza su publicación al cliente.
- Cuatro archivos privados se copiaron y se verificaron byte a byte mediante SHA256. No cambió el acceso público a los buckets.

## Seguridad y comprobaciones

Se protegieron siete vistas con `security_invoker` y se retiró la ejecución pública de 75 funciones privilegiadas, manteniendo el acceso del servidor. Las tablas de recuperación tienen RLS y no son accesibles a clientes, `anon` ni `authenticated`. Las publicaciones del portal usan la sesión verificada, pertenencia empresarial y visibilidad explícita; no aceptan un cliente elegido por el navegador.

El portal incorpora avance publicado real, pagos históricos confirmados y monitoreo compartido. Los pagos históricos no cancelan obligaciones de otro libro contable ni generan comprobantes nuevos automáticamente. No se reinterpretan pagos pendientes como ventas.

La importación explícita de IDs dejó la secuencia de `monitor_checks` detrás del historial. La migración `20261013040801_recovered_identity_sequences.sql` la corrigió con `ALTER SEQUENCE RESTART` transaccional, sin reducir contadores. Dos comprobaciones manuales reales quedaron vigentes y sin el anterior HTTP 500.

## Herramientas de recuperación

`scripts/recovery/restore-original-control.mjs` conserva el procedimiento auditable. Requiere `ZYTERON_RECOVERY_DIR` con exportación y metadatos privados revisados; ejecuta una transacción que revierte por defecto. `--apply` aplica el lote, valida referencias, restablece los triggers y sincroniza secuencias. No ejecutarlo como parte del arranque ni del build.

`scripts/recovery/inspect-database.mjs` requiere `ZYTERON_RECOVERY_CONFIG`, un archivo privado fuera del repositorio con `DATABASE_URL`. Inspecciona secuencias y restricciones; `--repair-sequences` aplica exclusivamente la reparación idempotente. Ambos validan el proyecto destino y TLS con la CA de Supabase. Claves y exportaciones personales no se guardan en Git.

La suite `scripts/full-publications-rls.mjs` usa fixtures transaccionales que siempre revierte. Comprueba pertenencia, publicación, notas internas, modificaciones financieras prohibidas y archivos de recuperación inaccesibles. No envía correos ni ejecuta cobros.
