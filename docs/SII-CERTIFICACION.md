# Certificación SII

## Estado

21-10-2026. Postulación aceptada y autenticación técnica del servidor comprobada en certificación. Producción permanece sin autorización. La aceptación de una postulación no acredita aceptación de los documentos de prueba.

El set oficial vigente contiene 32 casos y sus libros asociados. Se descargaron diez CAF de certificación para esos casos. Los tipos 33, 34, 46, 52, 56 y 61 están cargados en almacenamiento privado cifrado: 22 folios disponibles, cero usados y cero anulados al verificar la carga.

Los tipos 43, 110, 111 y 112 tienen CAF descargados y resguardados, pero carecen de registro en `tax_document_types`. La carga del tipo 43 devuelve «Tipo de documento 43 no catalogado» antes de almacenar el archivo. La migración local `20261021080550_complete_sii_document_catalog.sql` añade únicamente esos cuatro tipos con `enabled_for_issue=false` y `certified=false`. `ON CONFLICT DO NOTHING` conserva las filas, evidencias y habilitaciones existentes. La migración no se ha aplicado en producción.

El registro del catálogo permite custodiar un CAF; no implementa su formato, no acredita certificación y no habilita emisión. Los conjuntos de boletas tienen un proceso separado y su descarga todavía no está confirmada.

## Preparación del set

El motor interno admite `certificationCaseId` con formato numérico `numero-caso`, únicamente en `CERTIFICATION`. La primera referencia contiene `TpoDocRef=SET` y `RazonRef=CASO numero-caso`. Las notas conservan la referencia al documento original en la segunda posición. Sin el campo, el documento comercial conserva sus referencias habituales.

La carátula cuenta los documentos efectivos por tipo, mantiene el orden recibido y rechaza tipos/folios repetidos, documentos de otro emisor y documentos sin el bloque de firma. Los documentos con referencia SET tampoco pueden ensobrarse para producción. Estas comprobaciones no reemplazan la validación criptográfica ni el resultado del SII.

El campo es interno: no existe todavía un editor ni un ejecutor del set oficial en la web. No se generan clientes, pagos o facturas comerciales para suplir los casos de certificación. El set oficial, sus cantidades y sus instrucciones deben estar disponibles antes de asignar folios o construir los documentos reales de prueba.

## Secuencia de operación

1. Ingresar al ambiente de certificación con certificado del usuario autorizado y verificar sus facultades, sin conceder permisos adicionales por defecto.
2. Consultar estado y último set. Obtener otro set reinicia el avance; conservar fecha y huella del archivo utilizado.
3. Consultar timbrajes existentes antes de solicitar CAF del tipo y ambiente correctos. Conservar el comprobante y el archivo original en almacenamiento privado.
4. Preparar los casos exactos, referencias, descuentos y totales; validar XML, firma y timbre antes del envío.
5. Registrar Track ID, respuesta por documento y aceptación efectiva. Un envío recibido no equivale a documentos aceptados.
6. Completar los libros que correspondan al set, simulación, intercambio y muestras impresas. Declaraciones y autorización final requieren antecedentes reales y revisión previa.

## Validación local del cambio

- Backend y TypeScript: aprobados.
- Migración del catálogo: cuatro pruebas en PostgreSQL embebido con datos sintéticos aprobadas (inserción, reintentos, catálogo parcial y rollback ante un fallo). No valida concurrencia entre sesiones ni constituye prueba productiva.
- 42 pruebas de backend con datos sintéticos: aprobadas, incluidas seis nuevas de certificación.
- Casos SET y envío mixto: validados contra los XSD oficiales.
- Lint dirigido: cero errores y advertencias. Lint en clon limpio: cero errores y cinco advertencias preexistentes. El workspace conserva artefactos de pruebas no versionados que generan diagnósticos ajenos al cambio.
- Diff-check: aprobado.
- Cambios locales; no publicados ni desplegados. No se solicitaron, reservaron o consumieron folios durante estas pruebas.

## Referencias

- [Construcción del set oficial](https://www.sii.cl/factura_electronica/factura_mercado/inst_set_pruebas.pdf).
- [Manual del ambiente de certificación](https://www.sii.cl/factura_electronica/factura_mercado/manual_certificacion.pdf).
- [Proceso de certificación](https://www.sii.cl/factura_electronica/factura_mercado/proceso_certificacion.htm).
