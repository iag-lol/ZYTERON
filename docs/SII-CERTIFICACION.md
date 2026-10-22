# Certificación SII

## Estado verificado al 21-10-2026

La versión publicada es `8e53aa0`. El servicio de Zyteron responde y conserva `CERTIFICATION`, proveedor `SII_DIRECT` y autorización de producción desactivada. La postulación y el catálogo de documentos no habilitan emisión real.

La certificación de boletas tiene V°B° del SII. El sobre `0263014070` registra cinco boletas aceptadas, sin rechazos ni reparos. El RCOF `0263014112` figura aceptado con reparos: código 250 por la eliminación de la obligación de RVD desde agosto de 2022. La revisión oficial del set es `SOK`, proceso `set5142242`. Los cinco folios tipo 39 permanecen utilizados; no se reutilizan para pruebas de integración.

La Declaración de Cumplimiento continúa sin presentar. Exige acreditar procedimientos operativos, conservación, control de folios, generación, consulta e impresión. El transporte REST ordinario de boletas todavía requiere validación integral en certificación y habilitación expresa. No hay autorización ni CAF de producción registrados.

El set general de DTE contiene 32 casos, con huella `7a4c7c5d7cc900a30eadf1a34d6d44f6b033af3d2f41781e441ec1380fadfceb`. Sus 32 folios de certificación siguen disponibles: tipos 33, 34, 43, 46, 52, 56, 61, 110, 111 y 112. Casos, libros, simulación, intercambio y muestras requieren sus propias presentaciones y resultados. El V°B° de boletas no acredita estas etapas ni autoriza facturas de software propio.

La oficina verificada es PROVIDENCIA; está configurada en el servidor. Los Acteco registrados son 620200 y 620900.

## Alcance del código pendiente de instalación

- XML, firmas, sobre específico y PDF de boleta afecta 39 y exenta 41. Los sobres de boletas y facturas permanecen separados.
- Borradores para clientes identificados por su RUT real, con medio de pago declarado editable antes de emitir. El medio declarado no registra pagos ni modifica saldos. Se incluye en el XML y la representación impresa. Su cambio invalida una aprobación pendiente.
- API REST de boletas según la especificación SII 1.0.5: semilla, token, carga y consulta. Autenticación separada de SOAP y aislada por certificado y ambiente. Límites de respuesta, validación de empresa, Track ID, tipo, folio y estadísticas; sin retransmisión automática.
- Nota de crédito desde una boleta emitida, referenciada por su ID persistente. Las notas de débito mantienen el alcance soportado por su flujo específico.
- Registro transaccional de emisión ordinaria: adquisición única, reserva de folio, preparación, inicio de transmisión y confirmación del recibo. El archivo exacto del sobre se conserva antes del POST. La confirmación utiliza el movimiento original del envío.
- Recibo cifrado en almacenamiento privado y recuperación por ID de documento. Un fallo posterior al envío no autoriza a transmitir nuevamente.
- Consulta de PDF por código seguro ligado al UUID y huella del XML firmado. Sólo documentos propios, productivos y aceptados; sin listados ni XML públicos. `DTE_BOLETA_PUBLIC_LOOKUP_ENABLED` permanece desactivado hasta autorización expresa.

`DTE_BOLETA_REST_ENABLED` permanece desactivado. Los tipos 39/41 muestran «pendiente de validación integral REST» y no pueden habilitarse como operativos mientras falte esa comprobación. El catálogo conserva todas las opciones de la postulación; los formatos restantes no adquieren implementación comercial por existir en el motor de certificación.

## Persistencia, permisos y estados

El módulo de certificación usa procesos, casos, archivos, envíos y borradores privados con RLS. Las descargas verifican IDs, empresa, pertenencia, rutas derivadas y SHA-256. Sus reservas no crean facturas comerciales, pagos, contratos ni remuneraciones.

La emisión ordinaria utiliza `tax_document_transmissions`, sin acceso directo para `anon` o `authenticated`. Sus funciones son `SECURITY INVOKER`, con esquema fijo y ejecución exclusiva del servidor. No se amplían roles de aplicación.

Un intento sólo puede adquirirse una vez. Si falla antes del POST, puede revisarse y abandonarse explícitamente. Después de iniciar la transmisión, un timeout produce recepción incierta: conserva el documento, el folio y la factura bloqueados. La recuperación confirma el recibo archivado sin repetir el POST. Si fallan simultáneamente almacenamiento y base, se conserva el Track ID conocido en el error y se exige revisión manual; no hay garantía de recuperación automática en ese fallo doble.

La compatibilidad con el esquema anterior completa `document_type` e `idempotency_key` en nuevas escrituras vinculadas a una factura de Finanzas. Sincroniza sus estados informativos y protege identidad, vínculo, folio y archivo firmado. No crea otra fila tributaria ni convierte obligaciones históricas en facturas. Los documentos sin vínculo a Finanzas conservan su flujo anterior.

El campo `folio` se amplía a `bigint` para admitir los diez dígitos del formato SII. La vista `finance_portal_invoices`, dependiente de esa columna, se reconstruye dentro de la transacción con su definición vigente, propietario, permisos, filtro por cliente y opciones `security_invoker` y `security_barrier`. Los permisos, metadatos o dependencias no revisados detienen la operación; cualquier diferencia al restaurar revierte la transacción. La instalación no reserva, consume, libera ni anula folios existentes.

## Plan de instalación sujeto a aprobación

1. Verificar el proyecto `bwybwrxrbzjkwpxhpkcr`, empresa 78398774-0, ambiente de certificación, autorización productiva desactivada y huella exacta de la función de reserva vigente. Si aparecen documentos ordinarios o cambia la base comprobada, detener la instalación para revisar el alcance.
2. Aplicar en una sola transacción únicamente:
   - `20261021193657_dte_submission_journal.sql`.
   - `20261021201120_boleta_payment_metadata.sql`.
   - `20261021202723_finance_dte_compatibility.sql`.
3. Comprobar fuentes de las funciones, RLS, privilegios, triggers y tipos. Comparar las huellas de configuración y de todos los folios antes y después; deben permanecer idénticas. Ante cualquier diferencia, revertir la transacción.
4. Publicar y desplegar el commit revisado. Verificar el SHA efectivo y la salud del servicio, después revisar en navegador los controles nuevos sin crear documentos comerciales.
5. Mantener desactivados producción, emisión real y consulta pública de documentos reales. La instalación no autoriza CAF adicionales, envíos de prueba nuevos ni la Declaración de Cumplimiento.

El historial de migraciones del proyecto no acredita las aplicaciones manuales anteriores. No procede ejecutar un `db push` general ni marcar migraciones históricas como aplicadas sin conciliación del historial. El manifiesto de instalación registra las huellas de los tres SQL revisados.

## Respaldos y límites de verificación

El respaldo del facturador vigente contiene 11 documentos emitidos y 32 recibidos de Zyteron. Los archivos originales conservan sus octetos; se verificaron empresa, cantidades, identidades únicas y SHA-256. La verificación de firmas del formato de exportación archivado y una restauración completa siguen pendientes. No se importan automáticamente como nuevas facturas ni se concilian por monto, nombre o referencia visible.

Los archivos privados requieren conservación por al menos seis años conforme al artículo 58 de la Ley de IVA. El respaldo local no acredita por sí solo una política automática, copia externa ni restauración probada.

La revisión local registra 126 pruebas de runtime, 402 pruebas del frontend y una prueba de la ruta pública aprobadas. Las pruebas locales emplean datos sintéticos. Cubren acceso incorrecto, IDs y rutas inválidos, respuestas incompletas, reintentos, adquisición exclusiva, recepción incierta, recuperación, validación de recibos y compatibilidad con columnas y protecciones del esquema existente. PGlite ejecuta PostgreSQL embebido: sus llamadas concurrentes no sustituyen una prueba con dos conexiones independientes al servidor real.

El build del backend y el control de tipos frontend están comprobados. La compilación Next.js con Webpack y su fase TypeScript terminan; la generación completa del sitio público se detiene en RSS por ausencia de configuración Supabase local. No se utilizaron credenciales productivas para resolver ese límite. La configuración aislada de dependencias tampoco permite usar Turbopack local como evidencia de build productivo.

El lint dirigido conserva la deuda previa en controlador, repositorio y vista de Finanzas; la comparación con la base no muestra diagnósticos nuevos. El análisis de seguridad previo detecta cinco vistas con privilegios del propietario y 40 funciones con esquema de búsqueda mutable. Esos hallazgos requieren una revisión separada de definiciones y accesos; no se modifican permisos para ocultarlos.

## Condiciones para producción

La declaración sólo debe presentarse cuando sus afirmaciones estén acreditadas. Se requiere completar la validación integral REST, comprobar la consulta e impresión reales, la conservación y recuperación, y obtener la autorización efectiva del SII. El cambio de ambiente, los CAF productivos, la activación de tipos y la exposición por código seguro son pasos posteriores y expresos.

La certificación general de facturas y otros DTE continúa abierta hasta cumplir sus casos, libros, simulación, intercambio y muestras. No se declara operativo un formato por una prueba XML aislada ni por una recepción de archivo sin aceptación.

## Referencias oficiales

- [API REST de boletas, especificación 1.0.5](https://www4c.sii.cl/bolcoreinternetui/api/openapi.yaml).
- [Formato de boletas, versión 4.2](https://www.sii.cl/factura_electronica/factura_mercado/formato_boleta_electronica.pdf).
- [Instructivo de emisión de boletas](https://www.sii.cl/factura_electronica/factura_mercado/Instructivo_Emision_Boleta_Elect.pdf).
- [Eliminación del RVD](https://www.sii.cl/preguntas_frecuentes/bol_electr_vtas_serv/001_380_7679.htm).
- [Conservación de DTE](https://www.sii.cl/preguntas_frecuentes/factura_electronica/001_003_2356.htm).
- [Respaldo del facturador SII](https://www.sii.cl/destacados/factura_electronica/guias_ayuda/como_generar_archivo_respaldo.htm).
- [Construcción del set general](https://www.sii.cl/factura_electronica/factura_mercado/inst_set_pruebas.pdf).
- [Proceso de certificación](https://www.sii.cl/factura_electronica/factura_mercado/proceso_certificacion.htm).
- [Intercambio entre contribuyentes](https://www.sii.cl/factura_electronica/factura_mercado/formato_ic.pdf).
