# Facturación electrónica de Zyteron

Estado verificado al 29-10-2026: producción autorizada y habilitada para facturas electrónicas (33), exentas (34), notas de débito (56) y crédito (61). Declaración presentada; Resolución 80 del 22-08-2014 y 28 folios productivos cargados. Los borradores internos y comprobantes de pago no sustituyen una factura aceptada por el SII. La primera emisión real requiere los datos de una operación y su aprobación. [Estado y evidencia de autorización](SII-CERTIFICACION.md).

## Certificado digital

El certificado debe pertenecer al firmante autorizado para operar por Zyteron SpA. La compra y validación de identidad se completan personalmente en el proveedor acreditado. No se comparte la clave por chat ni se carga el PFX en formularios generales.

Certificado Acepta adquirido, activado y descargado. Validación local aprobada: llave RSA de 2048 bits coincidente, exportación cifrada comprobada y vigencia hasta el 21-10-2029 a las 01:31 (America/Santiago). Secreto cifrado instalado en el servicio existente de Zyteron en Render y metadatos registrados. La autenticación técnica con el SII en certificación y producción fue verificada; Firefox confirmó servicio conectado, firma y autenticación el 29-10-2026 a las 00:19. La cadena de confianza completa no tiene una validación independiente registrada. La activación del certificado y la autenticación no acreditan autorización para emitir en producción.

El secreto de firma se configura exclusivamente en el servidor existente:

- `DTE_CERTIFICATE_PEM`: llave privada y certificado PEM del titular. Preferir llave privada cifrada.
- `DTE_CERTIFICATE_PEM_PASSPHRASE`: clave de la llave cifrada, almacenada como secreto.
- `DTE_CERTIFICATE_SECRET_REF`: opcional; por defecto `DTE_CERTIFICATE_PEM`.
- `DTE_SENDER_RUT`: RUT del firmante autorizado; no se deduce del RUT empresarial.

Si se usa otra referencia, la clave corresponde a `<REFERENCIA>_PASSPHRASE`. Los archivos se convierten en un equipo confiable, con permisos de lectura restringidos y sin contraseñas en argumentos ni historial. El PEM, PFX y claves no se incorporan a Git, base de datos, logs o frontend. Registrar en Finanzas → Configuración contable únicamente los metadatos del secreto instalado.

## Preparación local del certificado

La herramienta de preparación requiere macOS, Node y `/usr/bin/openssl`. No realiza conexiones de red, no instala secretos en Render y no envía documentos al SII.

```sh
node scripts/prepare-dte-certificate.mjs
```

Selecciona únicamente un PFX/P12 regular descargado durante las últimas 24 horas. Si existen varios, requiere elegir expresamente el archivo mediante `--file`. La clave se ingresa en Terminal con entrada oculta; nunca se incluye en argumentos ni variables de entorno.

La preparación valida una única llave RSA de al menos 2048 bits, su correspondencia con el certificado y las fechas de vigencia. No comprueba la cadena de confianza ni las facultades del firmante ante el SII. El archivo original permanece intacto.

Los archivos resultantes se guardan fuera de Git, en `~/Library/Application Support/Zyteron/Certificates/zyteron-dte-*`, con directorios 0700 y archivos 0600:

- `certificate.encrypted.pem`: llave PKCS#8 cifrada con AES-256-CBC, certificado del firmante primero y cadena adjunta.
- `passphrase.txt`: clave aleatoria de la exportación, distinta de la clave original del PFX.
- `metadata.json`: huella, titular, emisor, fechas y límites de la validación.
- `installation.txt`: nombres de secretos y destino previsto, sin valores privados.

La clave de exportación y el PEM se almacenan en el mismo equipo; esos permisos restringen el acceso a otros usuarios, pero no protegen frente a una sesión local comprometida. Ambos archivos requieren custodia privada y una transferencia autorizada al servidor. No adjuntarlos a incidencias, correos o chats.

La instalación en el servicio existente requiere aprobación específica del destino y de cualquier reinicio o despliegue. Registrar metadatos solamente después de comprobar que el secreto está instalado en el servidor correcto.

Pruebas de la herramienta, únicamente con certificados sintéticos:

```sh
npm run test:dte-certificate
```

## Activación

1. Completar razón social, RUT, giro, Acteco y domicilio con los datos tributarios vigentes del SII.
2. Postular al sistema propio mediante el representante autorizado, con certificado vigente. Configurar SII directo en certificación. Registrar la fecha real de postulación y resolución 0 para ese ambiente.
3. Obtener CAF del ambiente de certificación y cargarlo en el almacenamiento cifrado. Habilitar los tipos de documento del set asignado sin marcarlos como certificados.
4. Ejecutar el set de pruebas asignado por el SII, simulación, intercambio, muestras y declaración exigidos. Conservar las respuestas y evidencia de cada aprobación.
5. Completar y verificar la representación impresa con PDF417 y el intercambio electrónico ante el SII. La revisión 278578, número 1, aprobó las 60 muestras impresas. La validación XSD por sí sola no acredita certificación.
6. Registrar la resolución y autorización reales, habilitar únicamente tipos certificados y cargar CAF de producción. Verificar la primera emisión autorizada mediante respuesta oficial del SII y entrega del XML/PDF al receptor.

Los folios de prueba no son válidos en producción. La prueba de conexión consulta la semilla y, cuando existe certificado, intenta autenticación; no emite facturas ni acredita autorización tributaria.

## Postulación y alcance

Postulación aceptada por el SII el 21-10-2026 para ZYTERON SPA, con software `ZYTERON CONTROL - DESARROLLO PROPIO`. Administrador DTE: representante legal titular del certificado. Correo administrativo: `eduardo.avila@zyteron.cl`; contacto SII e intercambio: `contacto@zyteron.cl`.

La postulación incluyó los tipos exigidos por el set del SII. El catálogo conserva también documentos cuyo flujo operativo específico está pendiente:

| Código | Documento | Implementación local en SII directo |
| --- | --- | --- |
| 33 | Factura electrónica | Certificada y habilitada en producción |
| 34 | Factura no afecta o exenta electrónica | Certificada y habilitada en producción |
| 39 | Boleta electrónica | Pendiente |
| 41 | Boleta no afecta o exenta electrónica | Pendiente |
| 43 | Liquidación factura electrónica | Pendiente |
| 46 | Factura de compra electrónica | Pendiente |
| 52 | Guía de despacho electrónica | Pendiente |
| 56 | Nota de débito electrónica | Certificada y habilitada en producción |
| 61 | Nota de crédito electrónica | Certificada y habilitada en producción |
| 110 | Factura de exportación electrónica | Pendiente |
| 111 | Nota de débito de exportación electrónica | Pendiente |
| 112 | Nota de crédito de exportación electrónica | Pendiente |

Implementación, certificación y habilitación son estados independientes. La consulta del catálogo no crea registros ni cambia la configuración persistente. Los códigos ausentes de la base aparecen con estado explícito y sin acciones de habilitación. Cualquier incorporación persistente requiere un cambio de datos revisado y autorizado.

La declaración del 29-10-2026 completó la autorización del software propio. El SII advirtió el término del acceso al facturador gratuito Mipyme; esta consecuencia fue aceptada expresamente. Los once documentos históricos emitidos y 32 recibidos se conservaron y recuperaron antes de confirmar el cambio. Los documentos ya emitidos conservan su folio y no deben volver a emitirse por aparecer un borrador interno.

El set oficial, los libros, la simulación, el intercambio y las muestras aprobadas forman parte de la evidencia de certificación. El SII valida contra el último set obtenido: no se regenera automáticamente durante reintentos de descarga.

## Representación impresa local

Representación impresa publicada y muestras aprobadas por el SII. Para los tipos 33, 34, 56 y 61, el PDF se construye desde el XML firmado y el sobre de envío archivados. Se verifican la huella del archivo, la correspondencia de folio, emisor, receptor y totales, el rango CAF y la firma del timbre TED con su llave pública. La resolución se obtiene del sobre original; no se reemplaza con la configuración actual.

El timbre PDF417 se genera localmente con `bwip-js`, sin enviar documentos a servicios de imágenes. Compacción binaria, corrección nivel 5, módulo de 0,5 puntos, filas de 3 módulos y zona libre de 18 puntos. Las muestras de certificación muestran `SIN VALIDEZ TRIBUTARIA`. Un documento rechazado o pendiente no se presenta como aceptado.

Producción requiere `DTE_SII_OFFICE` con la oficina SII real del emisor, verificada previamente. La variable está configurada en el servidor y el requisito de oficina pasa en la comprobación productiva; no se deduce del domicilio. No se genera un timbre ficticio cuando falta evidencia. Documentos con extensiones no soportadas o contenido que excede la página se rechazan expresamente.

La verificación del timbre no reemplaza la validación completa de la firma XML, de la autoridad emisora del CAF ni la aprobación de muestras ante el SII. El intercambio y los recibos siguen los procedimientos de [operación y recuperación](SII-OPERACION-Y-RECUPERACION.md). Boletas, exportación y los demás flujos operativos no implementados permanecen deshabilitados.

## Validación local

Los cuatro XSD originales del SII están incluidos en `control-runtime/resources/sii/xsd`. La ruta se resuelve desde el módulo compilado para admitir el servidor combinado. `DTE_XSD_DIR` permite una ubicación explícita. Las pruebas incluyen el ejemplo oficial del SII y rechazo de XML inválido.

```sh
npm --prefix control-runtime run build
node --test control-runtime/test/dte-provider.test.mjs control-runtime/test/dte-print.test.mjs control-runtime/test/dte-catalog.test.mjs
```

La aceptación final se verifica con el SII. No se marca una factura emitida por la sola creación de su XML o recepción inicial del envío.

## Formulario de facturas · revisión del 29-10-2026

Publicado en Render y verificado el 29-10-2026. Commit activo: `a0aa8e2bfa69aa0a6694a9ffc13ab68f7e446945`, despliegue `dep-dbhcseg473hc739knksg` (Live). El formulario base se comprobó en Firefox con la versión `1041e6e`: selección de Fenice, descuento, cálculo del servidor y revisión previa sin guardar ni emitir. La revisión posterior incorpora edición de borradores. No modifica facturas históricas ni la plantilla PDF pendiente de aprobación.

- Secciones de documento y pago, receptor, productos o servicios y referencias comerciales, con resumen de neto, exento, IVA y total.
- Receptor visible y editable por documento: razón social, giro, dirección, comuna, ciudad y correo. El RUT debe coincidir con el cliente seleccionado; se conserva el alcance de acceso. Los cambios no modifican la ficha maestra del cliente.
- Fecha de emisión explícita, contado o crédito, tipo de venta y sugerencia de tipo de compra. El vencimiento al contado coincide con la emisión. El plazo acepta de 0 a 365 días.
- Nombre de ítem, descripción adicional, unidad, cantidad, precio neto, descuento y exención. Las referencias comerciales admitidas son orden de compra (801), nota de pedido (802), contrato (803) y guía electrónica (52), hasta 10 referencias.
- `POST /finance/invoices/preview` calcula con la tasa de IVA vigente a la fecha de emisión, comprueba acceso al cliente y devuelve campos faltantes. No escribe registros, reserva folios, firma ni envía al SII.
- Los borradores en estado DRAFT o PENDING_APPROVAL pueden abrirse mediante «Editar borrador». El cliente y el tipo de documento se conservan; se pueden completar los datos del receptor, fechas, ítems, pago y referencias. Una edición invalida la aprobación pendiente.
- Los datos revisados se conservan en el borrador y en el XML. Preparar la emisión no sustituye la fecha elegida ni los datos del receptor por la ficha maestra. Los documentos emitidos conservan sus restricciones de inmutabilidad.
- Migración aplicada en producción antes del despliegue: `20261029103000_invoice_composer_fields.sql` (metadatos del documento, nombre de ítem y unidad).
- Esquemas oficiales originales actualizados al paquete del 19-02-2026. Fuente y SHA-256 individuales en `control-runtime/resources/sii/xsd/README.md`.

Validación: 94 pruebas de facturación, permisos, edición, XML, timbre, impresión, folios y flujos existentes aprobadas; backend compilado y frontend verificado con TypeScript. Compilación completa local con fuentes ficticias de lectura y compilación real en Render aprobadas. La consulta contra datos productivos y la revisión del formulario no crearon registros ni consumieron folios. Permanecen 28 folios productivos disponibles. La ficha consultada de Fenice carece de giro y comuna; deben completarse con información tributaria verificada antes de emitir.

Vista local de diseño: `output/review/zyteron-formulario-factura-v02.html`, con datos ficticios y sin guardado ni emisión. Revisión visual realizada en Firefox, escritorio y viewport de 390 × 844. No acredita la operación de una factura real ante el SII.

Fuentes: [Guía de emisión del SII](https://www.sii.cl/destacados/factura_electronica/guias_ayuda/emitir_factura_electronica.pdf), [clasificación de compra y venta](https://www.sii.cl/preguntas_frecuentes/factura_electronica/001_003_6990.htm), [esquemas XML oficiales](https://www.sii.cl/servicios_online/3532-formato_xml-3811.html).

### Referencias de implementación anteriores

- Postulación: https://www.sii.cl/factura_electronica/factura_mercado/proc_postulacion.htm
- Etapas: https://www.sii.cl/preguntas_frecuentes/factura_electronica/001_003_2050.htm
- XSD y ejemplo: https://www.sii.cl/servicios_online/1039-formato_xml-1184.html

- Catálogo y códigos DTE: https://www.sii.cl/factura_electronica/formato_iecv.pdf
- Representación impresa y timbre: https://www.sii.cl/factura_electronica/factura_mercado/instructivo_emision.pdf
