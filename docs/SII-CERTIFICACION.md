# Certificación SII

## Estado al 21-10-2026

La postulación y la autenticación técnica del servidor están comprobadas en certificación. La versión publicada es `4577898722f387b330200fca133535ea4da2708f`. Producción continúa sin autorización del SII; aceptar la postulación no acredita aceptación de documentos ni habilita el cambio de sistema.

El set oficial de DTE vigente contiene 32 casos, libros de compras, ventas y guías, y tiene huella `7a4c7c5d7cc900a30eadf1a34d6d44f6b033af3d2f41781e441ec1380fadfceb`. Los diez CAF de certificación están cargados en almacenamiento privado cifrado: 33, 34, 43, 46, 52, 56, 61, 110, 111 y 112. La última lectura productiva comprobada registra 32 folios disponibles, cero reservados, cero usados y cero anulados. No se han enviado los casos oficiales.

La consulta oficial «Datos para impresión de documentos tributarios» confirmó la oficina **PROVIDENCIA**, los Acteco 620200 y 620900 y el domicilio de casa matriz. El archivo CSV oficial respalda esos antecedentes. La configuración `DTE_SII_OFFICE=PROVIDENCIA` está pendiente de incorporación al servidor.

La certificación de boletas es independiente. El formulario consultado ofrece el set de boleta afecta; la descarga del nuevo archivo todavía no está comprobada. No hay CAF 39/41 solicitados o cargados para ese ejercicio. La opción 41 permanece en el catálogo y en el motor de certificación; el formulario observado no demuestra su habilitación ante el SII.

## Funciones locales de certificación

El módulo `/finance/certification` incorpora importación del archivo oficial, instrucciones íntegras por caso, editor de partidas y receptores, referencias por ID persistente de caso, borradores privados con control de versión, libros, archivos firmados, muestras PDF y registro de envíos. El código nuevo y su migración no están publicados ni aplicados en producción.

El motor específico de certificación genera las estructuras de los doce tipos del catálogo: Documento, Liquidacion, Exportaciones y EnvioBOLETA. Incluye descuentos, recargos, comisiones, retención de IVA y conversión a pesos para exportación. La captura asistida requiere revisión: no acredita por sí sola que todos los antecedentes aduaneros o instrucciones particulares del set estén completos.

Las notas conservan el receptor y el régimen de retención del documento original. Una factura del mismo proceso vinculada a una guía debe tener el mismo receptor y cubrir su monto. Las referencias de factura en papel del ejercicio son exclusivamente datos de certificación; no crean documentos comerciales.

La primera referencia contiene `TpoDocRef=SET` y `RazonRef=CASO numero-caso`. Las referencias tributarias de las notas comienzan después. Cada sección conserva el orden oficial y su propio envío; los conjuntos de exportación permanecen separados. El ensobrado rechaza identidades repetidas, documentos de otro emisor y mezcla de boletas con DTE. Una sección que mezcle formatos incompatibles requiere adaptación al set efectivamente descargado y se bloquea antes de reservar.

Los archivos se validan contra esquemas oficiales y se verifican las firmas XML, sus digest y referencias locales. Los esquemas originales, sus fuentes y huellas están en `control-runtime/resources/sii/xsd/certification-schemas.json`. La verificación criptográfica de un archivo recibido no demuestra por sí sola autorización del firmante ni aceptación comercial.

El acuse de intercambio es técnico. Verifica el receptor, las firmas y el DigestValue del envío recibido antes de producir una respuesta firmada. No acepta comercialmente facturas ni transmite la respuesta automáticamente.

El cálculo de consumo diario dispone de emitidos, anulados y rangos discontinuos. Los movimientos del ejercicio no anulan folios comerciales. El flujo del set de boletas deberá contrastarse con su archivo oficial antes de solicitar folios o enviarlo.

El proveedor comercial SII directo conserva su límite a tipos 33, 34, 56 y 61. El motor de certificación no habilita emisión comercial de los otros formatos. Ningún tipo adquiere certificación o habilitación productiva por aparecer en el catálogo o generar XML localmente.

## Persistencia, permisos y reintentos

La nueva migración `20261021084523_sii_certification_workspace.sql` crea cinco tablas privadas: procesos, casos, archivos, envíos y borradores. Todas tienen RLS; `anon` y `authenticated` carecen de acceso directo. Los permisos de usuario existentes se conservan: gestión requiere `dte.manage`; transmitir y recuperar un recibo exige además `dte.issue`. No hay ampliación de roles de RRHH.

La reserva usa una transacción, bloqueo por empresa/set y bloqueos de los folios y sus CAF. Repetir exactamente el mismo plan devuelve el proceso existente. Cambiar el plan ya reservado, reutilizar un folio, repetir un caso o dejarlo fuera del envío revierte el lote. Los borradores no reservan folios y sólo se consultan por empresa, usuario y huella del set.

El original TXT se conserva cifrado en `finance-secrets`; XML y PDF se conservan en `finance-documents`. Las descargas requieren IDs de proceso y archivo; se comprueban empresa, pertenencia, ruta derivada y SHA-256. No se reciben rutas arbitrarias del navegador. La reserva y el registro de certificación no crean clientes, facturas comerciales, pagos, contratos ni remuneraciones.

Un envío se adquiere una sola vez mediante cambio atómico `PREPARED → SENDING`. El destino está limitado a certificación. Se conserva el Track ID en la base y una copia cifrada del recibo en almacenamiento privado. Repetir el guardado con el mismo Track ID no transmite el archivo de nuevo. Si la recepción es incierta, el registro queda bloqueado y requiere revisión en el SII. Si también fallan almacenamiento y base tras la recepción, el mensaje conserva el Track ID conocido para revisión manual; no existe garantía de recuperación automática en ese fallo simultáneo.

La consulta de estado usa el Track ID persistido. Un error de autenticación o consulta no demuestra rechazo tributario. Las respuestas tardías no degradan estados finales. Recibido, aceptado y aceptado con reparos son estados distintos; ninguno sustituye la aprobación de la etapa completa en el portal de certificación.

## Plan de instalación pendiente de aprobación

1. Confirmar nuevamente proyecto `bwybwrxrbzjkwpxhpkcr`, empresa, ambiente, versión desplegada, restricciones y estado de folios. Respaldar los metadatos actuales sin copiar claves privadas a logs.
2. Aplicar únicamente la migración nueva revisada. Es aditiva y no reserva folios al instalarse. No ejecutar indiscriminadamente migraciones históricas pendientes.
3. Publicar el commit revisado, configurar la oficina verificada y desplegar el código. Verificar el SHA real desplegado, la salud del servicio y los permisos de las rutas nuevas.
4. Consultar el módulo sin reservar ni enviar al navegar. Preparar el plan oficial con todos los datos revisados y comprobar sus archivos antes de transmitir casos.
5. Presentar los casos y libros de certificación, conservar los Track ID y revisar resultados efectivos. Resolver rechazos con trazabilidad, sin liberar o reutilizar automáticamente folios inciertos.

La migración anterior `20261021080550_complete_sii_document_catalog.sql` sí se aplicó manualmente con aprobación expresa. Añadió cuatro tipos deshabilitados y sin certificar; preservó las ocho filas originales. Esa ejecución no figura en el historial de migraciones de Supabase. La sentencia es idempotente mediante `ON CONFLICT DO NOTHING`, pero el historial deberá reconciliarse de forma controlada antes de un `db push` general.

## Comprobaciones locales y límites

- 81 pruebas de runtime aprobadas: incluye XML/XSD, firmas, libros, PDF, permisos, rutas inválidas, datos ausentes, reintentos, adquisición exclusiva, recuperación de recibos y nueve pruebas SQL con datos sintéticos.
- 401 pruebas del repositorio principal aprobadas, incluidas seis de captura del set y conservación de octetos del archivo.
- Typecheck frontend en checkout aislado aprobado; build backend aprobado. El build Next.js completo aprobó con una fuente local sintética de sólo lectura para los datos del sitio público; sin esa configuración, falla en el RSS por ausencia de variables de entorno. No se utilizaron datos ni credenciales productivas para el build. El checkout original contiene artefactos ajenos no versionados que impiden usar su typecheck global como evidencia limpia.
- Lint dirigido real con `--no-ignore` aprobado en los archivos nuevos y el generador PDF. El lint global del checkout limpio conserva cero errores y cinco advertencias preexistentes. En los archivos existentes comprobados con `--no-ignore` permanecen los mismos trece errores de la versión base, sin diagnósticos nuevos.
- Diff-check aprobado. Los XSD originales conservan sus octetos, CRLF y espacios del proveedor mediante atributos exclusivos para esa carpeta; el código propio mantiene la comprobación habitual de espacios.
- 17 PDF sintéticos comprobados: una página, menos de 500 KB, timbre PDF417 decodificado con una librería independiente y bytes iguales al TED original. La inspección visual incluye copias cedibles y documentos en moneda extranjera.
- Prueba de pantalla local con API y lector de archivos simulados: edición, cambio rápido de caso, descarte de respuesta tardía, doble clic al guardar y recuperación del borrador tras recargar. El diseño se revisó en escritorio y a 390 px. Esta prueba no acredita la carga real de archivos, la conectividad productiva ni la aceptación del SII.
- La lectura real del archivo no terminó en la sesión automatizada del navegador. El conversor se comprobó por separado con un objeto File y octetos ISO-8859-1. La integración real de carga continúa pendiente de verificación; no se presenta como aprobada.

## Etapas tributarias pendientes

Se requiere ejecutar y obtener aceptación de los casos y libros oficiales, cumplir la simulación exigida, presentar y aprobar intercambio y muestras impresas y declarar requisitos efectivamente cumplidos. La simulación todavía no tiene un ejecutor completo en este paquete. El acuse generado y los PDF locales tampoco equivalen a presentación o aprobación en el portal.

Antes de cambiar definitivamente de sistema se requiere respaldar el facturador vigente y revisar la autorización final. La declaración de cumplimiento no debe afirmar capacidades pendientes. El proceso permanece abierto hasta contar con evidencia real de todas las etapas.

## Referencias oficiales

- [Construcción del set](https://www.sii.cl/factura_electronica/factura_mercado/inst_set_pruebas.pdf).
- [Proceso de certificación](https://www.sii.cl/factura_electronica/factura_mercado/proceso_certificacion.htm).
- [Formatos XML y libros](https://www.sii.cl/servicios_online/1039-descripcion_formato-1184.html).
- [Formato DTE de febrero de 2026](https://www.sii.cl/factura_electronica/factura_mercado/formato_dte_202602.pdf).
- [Intercambio entre contribuyentes](https://www.sii.cl/factura_electronica/factura_mercado/formato_ic.pdf).
- [Muestras impresas](https://www.sii.cl/factura_electronica/manual_muestras_impresas.pdf).
