# Certificación SII

## Estado verificado al 23-10-2026

La versión operativa en Render es `d1b431d`, despliegue `dep-dbdfoma9lscs73bkffi0`, con resultado `Deploy succeeded | Live`, iniciado el 23-10-2026 a las 03:19 y duración de 2 minutos y 46 segundos. Conserva `CERTIFICATION`, proveedor `SII_DIRECT` y autorización productiva desactivada.

Los 32 documentos del set tienen aceptación técnica `EPR`, cero rechazos y cero reparos. La revisión de contenido del set es una validación distinta: los informes oficiales `SETMAIL` aprueban compra y liquidaciones (`SOK`) y rechazan los otros cinco sets (`SRH`). No hay certificación completa ni autorización productiva.

| Set | Track ID vigente | DTE aceptados | Revisión SETMAIL |
| --- | --- | --- | --- |
| Básico 5142224, revisión 2 | 0263156002 | 8 | SRH: casos 5 y 8, valores de primera línea |
| Guías 5142227, revisión 4 | 0263160274 | 3 | Nueva revisión oficial pendiente; envío anterior SRH en caso 1 |
| Exentas 5142229 | 0263156608 | 8 | SRH: casos 4 y 5, valores de primera línea |
| Exportación 5142230 | 0263156616 | 3 | SRH: casos 2 y 3, datos de primera línea |
| Exportación 5142231 | 0263156626 | 3 | SRH: caso 3, exige dos referencias |
| Liquidaciones 5142232 | 0263156634 | 4 | SOK: set correcto |
| Compra 5142233, revisión 3 | 0263158256 | 3 | SOK: set correcto |

El commit `d1b431d` elimina la cantidad ficticia de las notas de corrección de texto y su anulación de monto cero. El esquema exige cantidad positiva cuando se incluye `QtyItem`; la línea de texto omite ese campo y conserva `MontoItem=0`. La prevalidación del ejercicio detecta despacho interno distinto de 5/3, unidad de devolución de exportación distinta de la original y alojamiento sin referencia de pasaporte 813. Son correcciones verificadas localmente; la nueva comparación del SII sigue pendiente. Los sobres ya aceptados no se modifican ni sus folios se reutilizan.

El 22-10-2026 a las 22:08 Render registró una caída por agotamiento del heap de JavaScript; el proceso reinició y el módulo de certificación volvió a responder. El ajuste de esta revisión limita la caché de Next.js a 8 MB, desactiva la precarga de todas las páginas y asigna 320 MB al heap del proceso que comparte Next.js y la API. El servicio conserva su límite de 512 MB. La comprobación de corta duración posterior a un despliegue no descarta crecimiento sostenido de memoria.

El lote general contiene 32 casos revisados con siete receptores distintos para las facturas nacionales. Sus fichas tributarias se contrastaron con las fuentes disponibles y la consulta pública del SII; no se modificaron los maestros comerciales. Los antecedentes extranjeros, referencias y tipo de cambio completados para el ejercicio se identifican como datos simulados de certificación, sin representar operaciones ni cotizaciones reales.

El proceso `ed86d1b4-5515-4ef4-bc48-451241c415f6` conserva 46 PDF, siete sobres DTE, tres libros y el set original. El control previo verificó XSD, 42 firmas XMLDSig y los 32 totales. Los archivos se transmitieron el 22-10-2026. Los siete sobres fueron rechazados. El informe oficial del set básico registra `DTE-3-505: Firma DTE Incorrecta` en sus ocho documentos; una validación criptográfica local no acredita compatibilidad con el procesamiento del SII.

| Archivo | Track ID | Resultado consultado |
| --- | --- | --- |
| Básico 5142224 | 0263145166 | Rechazado; firma DTE incorrecta |
| Guías 5142227 | 0263145196 | Rechazado |
| Exentas 5142229 | 0263145216 | Rechazado |
| Exportación 5142230 | 0263145228 | Rechazado |
| Exportación 5142231 | 0263145250 | Rechazado |
| Liquidaciones 5142232 | 0263145280 | Rechazado |
| Compra 5142233 | 0263145362 | Rechazado |
| Libro de ventas | 0263145422 | LSO: esquema correcto; validación sin terminar |
| Libro de compras | 0263145450 | LSO: esquema correcto; validación sin terminar |
| Libro de guías | 0263145482 | LSO: esquema correcto; validación sin terminar |

La solicitud técnica de revisión del avance se presentó con los siete sobres técnicamente aceptados. El portal registró siete sets «EN REVISIÓN» y tres libros «ENVÍO CON ERRORES O REPAROS». Los SETMAIL posteriores contienen los resultados de la tabla vigente. Los sobres históricos rechazados se conservan sin sustituir su evidencia. La factura de diagnóstico tipo 33, folio 1, fue aceptada con Track ID `0263149418`: `EPR`, una aceptada, cero rechazos y cero reparos, confirmados en el historial oficial el 23-10-2026. El archivo conserva SHA-256 `4477735b4e8695c620a43dc8f338d95c8f1c5231f399a04874e165b1095fb985`. La corrección firma el DTE sin namespaces heredados y usa multipart RFC 1867 con longitud explícita. El primer intento del básico corregido quedó sin acuse y permanece `UNKNOWN`. Tras revisar el historial oficial, el envío HTTP/1.0 `0263150722` registró siete aceptados, un rechazo y cero reparos. El único rechazo fue `DTE-3-100: DTE Repetido` del tipo 33, folio 1, ya aceptado en el diagnóstico. Este envío no cumple la condición de set completo sin rechazos. Los intentos sin recepción confirmada permanecen bloqueados y se revisan contra el historial oficial antes de cualquier actuación manual.


La revisión 2 del set básico, proceso `bb590dbc-3e93-4277-928d-c86a9717f37d`, contiene ocho documentos y doce PDF nuevos, libro de ventas con notificación 4 y el set fuente. Usa exclusivamente folios nuevos: tipo 33 del 5 al 8, tipo 56 folio 5 y tipo 61 del 8 al 10. La verificación independiente de nueve firmas, ocho totales y timbres pasó; el XML tiene SHA-256 `61d620aded0371146d5f862c80f6e86bdb2a1c61dbe344d7b256afc1f3b205f3`. El intento inicial quedó `UNKNOWN` y no se reutiliza automáticamente. Tras comprobar que el historial oficial no registraba su recepción, se transmitió el mismo XML y los mismos ocho folios mediante carga de archivo HTTP/1.0. El Track ID `0263156002` registra `EPR`: ocho aceptados, cero rechazos y cero reparos. El resultado está persistido y visible en el panel. No hubo una segunda reserva de folios.

El intento de compra `0263156640` fue aceptado con reparos HED-2-300 en sus tres documentos. La corrección `532c664` vincula cada partida afecta con `CodImpAdic=15`. La revisión 3, proceso `162d0ff5-4e46-4298-ac54-1a88875adf23`, utilizó tres folios nuevos: 46/2, 56/6 y 61/11; conserva cuatro PDF y su sobre. El Track ID `0263158256` obtuvo tres aceptados sin reparos y revisión `SOK`. Los tres folios del envío anterior aceptado con reparos permanecen utilizados.

El libro de ventas de la revisión 2 fue recibido con Track ID `0263157954`, notificación 4. Se conserva el intento ordinario sin acuse como `UNKNOWN`; tras revisión del historial se registró una recepción manual del mismo XML y mismos folios. Compras `0263145450`, guías `0263145482` y ventas `0263157954` tienen código `LSO`, que sólo acredita esquema correcto. La opción oficial «Enviar Correo» para compras responde que el envío no ha concluido su validación. No existe resultado final del libro, ni corresponde tratar LSO como LOK o retransmitirlo por esa causa.

La revisión 4 de guías, proceso `04dba9d8-5836-4985-9223-b8731c491fa1`, utiliza tres folios tipo 52 ya autorizados: 4, 5 y 6. El traslado interno declara `IndTraslado=5` y `TipoDespacho=3`. Las cuatro firmas, tres totales y límite de línea se comprobaron independientemente; SHA-256 `b2762ca59b17f18222516f490f989247caee8f628a4bf2c5f988846cc020d83c`. El envío ordinario recibió Track ID `0263160274` y registra tres aceptados, cero rechazos y cero reparos. La nueva revisión SETMAIL todavía no se ha declarado: Safari quedó sin ventana accesible. El libro de guías nuevo permanece preparado y no se ha transmitido mientras el anterior sigue pendiente de validación.

Se obtuvieron 24 folios nuevos en 19 CAF; se utilizaron 14 y quedan 10 sin utilizar. El SII bloqueó solicitudes posteriores al considerar disponibles folios ya otorgados. No corresponde seguir solicitando ni anular para eludir el control. Los CAF necesarios para los ocho documentos básicos están cargados cifrados. El máximo de 100 documentos del manual corresponde al envío de simulación y no a un límite general de 100 intentos de certificación.
La certificación de boletas tiene V°B° del SII. El sobre `0263014070` registra cinco boletas aceptadas, sin rechazos ni reparos. El RCOF `0263014112` figura aceptado con reparos: código 250 por la eliminación de la obligación de RVD desde agosto de 2022. La revisión oficial del set es `SOK`, proceso `set5142242`. Los cinco folios tipo 39 permanecen utilizados; no se reutilizan para pruebas de integración.

La Declaración de Cumplimiento continúa sin presentar. Exige acreditar procedimientos operativos, conservación, control de folios, generación, consulta e impresión. El transporte REST ordinario de boletas todavía requiere validación integral en certificación y habilitación expresa. No hay autorización ni CAF de producción registrados.

El set general de DTE contiene 32 casos, con huella `7a4c7c5d7cc900a30eadf1a34d6d44f6b033af3d2f41781e441ec1380fadfceb`. Sus 32 folios de certificación fueron reservados y utilizados en los envíos: tipos 33, 34, 43, 46, 52, 56, 61, 110, 111 y 112. Casos, libros, simulación, intercambio y muestras requieren sus propias presentaciones y resultados. El V°B° de boletas no acredita estas etapas ni autoriza facturas de software propio.

La oficina verificada es PROVIDENCIA; está configurada en el servidor. Los Acteco registrados son 620200 y 620900.

## Alcance del código instalado

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

## Instalación aplicada y verificada

La instalación del 22-10-2026 a las 08:24 tiene resultado `INSTALLED_VERIFIED`; la verificación posterior devuelve `ALREADY_INSTALLED_VERIFIED`, sin cambios. La corrección de la vista dependiente conserva su consulta, permisos y opciones de seguridad. Las huellas de folios y configuración permanecieron iguales; no hubo documentos ordinarios ni nuevos envíos. El procedimiento aplicado fue:

1. Verificar el proyecto `bwybwrxrbzjkwpxhpkcr`, empresa 78398774-0, ambiente de certificación, autorización productiva desactivada y huella exacta de la función de reserva vigente. Si aparecen documentos ordinarios o cambia la base comprobada, detener la instalación para revisar el alcance.
2. Aplicar en una sola transacción únicamente:
   - `20261021193657_dte_submission_journal.sql`.
   - `20261021201120_boleta_payment_metadata.sql`.
   - `20261021202723_finance_dte_compatibility.sql`.
3. Comprobar fuentes de las funciones, RLS, privilegios, triggers y tipos. Comparar las huellas de configuración y de todos los folios antes y después; deben permanecer idénticas. Ante cualquier diferencia, revertir la transacción.
4. Publicar y desplegar `26df02b`. Verificar el SHA efectivo y la salud del servicio, después revisar en navegador los controles nuevos sin crear documentos comerciales.
5. Mantener desactivados producción, emisión real y consulta pública de documentos reales. La instalación no autoriza CAF adicionales, envíos de prueba nuevos ni la Declaración de Cumplimiento.

El historial de migraciones del proyecto no acredita las aplicaciones manuales anteriores. No procede ejecutar un `db push` general ni marcar migraciones históricas como aplicadas sin conciliación del historial. El manifiesto de instalación registra las huellas de los tres SQL revisados.


La migración `20261023010000_sii_certification_revisions.sql` está instalada y verificada. Conservó las huellas de configuración, folios, procesos originales, permisos y RLS. Cada revisión enlaza la anterior, conserva sus documentos y exige folios disponibles nuevos, motivo y números nuevos de notificación de libros. La revisión parcial exige secciones únicas existentes en el set oficial; no genera un set inicial incompleto.
## Respaldos y límites de verificación

El respaldo del facturador vigente contiene 11 documentos emitidos y 32 recibidos de Zyteron. Los archivos originales conservan sus octetos; se verificaron empresa, cantidades, identidades únicas y SHA-256. La verificación de firmas del formato de exportación archivado y una restauración completa siguen pendientes. No se importan automáticamente como nuevas facturas ni se concilian por monto, nombre o referencia visible.

Los archivos privados requieren conservación por al menos seis años conforme al artículo 58 de la Ley de IVA. El respaldo local no acredita por sí solo una política automática, copia externa ni restauración probada.

La revisión del 23-10-2026 registra 140 pruebas del backend aprobadas. Las comprobaciones previas del frontend y la ruta pública registran 405 y una pruebas aprobadas respectivamente. Las pruebas locales emplean datos sintéticos. Cubren acceso incorrecto, IDs y rutas inválidos, respuestas incompletas, reintentos, adquisición exclusiva, recepción incierta, recuperación, validación de recibos y compatibilidad con columnas y protecciones del esquema existente. PGlite ejecuta PostgreSQL embebido: sus llamadas concurrentes no sustituyen una prueba con dos conexiones independientes al servidor real.

El build del backend, el control de tipos frontend y la compilación completa Next.js con Webpack están comprobados. La generación local de las 132 páginas utiliza un servidor Supabase sintético; no requiere credenciales productivas. El build efectivo de Render también terminó correctamente en el despliegue `ddee733`.

El lint dirigido conserva la deuda previa en controlador, repositorio y vista de Finanzas; la comparación con la base no muestra diagnósticos nuevos. El análisis de seguridad previo detecta cinco vistas con privilegios del propietario y 40 funciones con esquema de búsqueda mutable. Esos hallazgos requieren una revisión separada de definiciones y accesos; no se modifican permisos para ocultarlos.

## Condiciones para producción

La declaración sólo debe presentarse cuando sus afirmaciones estén acreditadas. Se requiere completar la validación integral REST, comprobar la consulta e impresión reales, la conservación y recuperación, y obtener la autorización efectiva del SII. El cambio de ambiente, los CAF productivos, la activación de tipos y la exposición por código seguro son pasos posteriores y expresos.

La certificación general de facturas y otros DTE continúa abierta hasta cumplir sus casos, libros, simulación, intercambio y muestras. No se declara operativo un formato por una prueba XML aislada ni por una recepción de archivo sin aceptación.

## Requisitos informáticos y evidencia de certificación

| Requisito | Control y estado |
| --- | --- |
| Emisor, firmante y ambiente | Certificado vigente, autenticación real y empresa verificados; certificación aislada de producción. |
| Folios y CAF | Tipo, emisor, rango, disponibilidad y adquisición única comprobados; 32 folios originales utilizados. |
| Receptores | Siete fichas nacionales distintas contrastadas; extranjeros identificados como simulados. |
| Set oficial | Archivo y SHA-256 conservados; orden, glosas y referencias SET comprobados. |
| Montos e IVA | 32 casos contrastados con cálculo independiente; IVA 19%, descuentos, recargos y referencias. |
| Formato XML | XSD oficiales, ISO-8859-1 y límites de línea; firmas calculadas después del formato definitivo. |
| Firma del DTE | RSA-SHA1, digest SHA1 y C14N de cada documento aislado; aceptación SII comprobada en factura 33. |
| Firma del sobre | Firma separada con namespaces del envío; verificación independiente de integridad, referencias y certificado. |
| Timbre TED | CAF, FRMT y coincidencia con tipo, folio, fecha, receptor y monto; corrección decimal de exportación probada localmente. |
| Transporte | HTTP/1.0 y multipart RFC 1867 de tamaño conocido, TLS verificado; token por stdin y XML temporal con directorio privado y permisos 0600, eliminado al terminar; sin reintentos automáticos. |
| Resultados SII | Lectura de todos los tipos del sobre; recepción y esquema correcto no se presentan como aceptación. |
| Representación impresa | PDF y PDF417 derivados del XML archivado; verificación de firmas y timbre. Muestras oficiales pendientes. |
| Libros | Tres recepciones LSO; validación del libro sin terminar. El portal no admite todavía su revisión final. |
| Simulación e intercambio | Etapas oficiales pendientes; requieren su propia evidencia. |
| Conservación | Almacenamiento privado con huellas y recibos cifrados; política automática y restauración integral pendientes. |
| Producción | Declaración final y autorización SII pendientes; emisión real bloqueada. |

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

- [Envío automático DTE, RFC 1867 y headers](https://www.sii.cl/factura_electronica/factura_mercado/envio.pdf).
- [Consulta de estado de envío](https://www.sii.cl/factura_electronica/factura_mercado/estado_envio.pdf).
- [Consulta individual DTE](https://www.sii.cl/factura_electronica/factura_mercado/estado_dte.pdf).
- [Formato DTE 2026-02](https://www.sii.cl/factura_electronica/factura_mercado/formato_dte_202602.pdf).

- [Manual de certificación: simulación con máximo de 100 documentos](https://www.sii.cl/factura_electronica/factura_mercado/manual_certificacion.pdf).
- [Control de disponibilidad y autorización de folios](https://www.sii.cl/factura_electronica/factura_mercado/timbraje_electronico.pdf).
