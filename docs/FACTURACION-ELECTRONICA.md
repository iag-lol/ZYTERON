# Facturación electrónica de Zyteron

Estado al 21-10-2026: emisión tributaria en producción pendiente de activación y certificación. Los borradores internos y comprobantes de pago no sustituyen una factura aceptada por el SII.

## Certificado digital

El certificado debe pertenecer al firmante autorizado para operar por Zyteron SpA. La compra y validación de identidad se completan personalmente en el proveedor acreditado. No se comparte la clave por chat ni se carga el PFX en formularios generales.

Opción revisada: Acepta, certificado descargable de tres años, $21.990 netos y $26.168 con IVA al 21-10-2026. Confirmar el importe final antes de pagar: https://acepta.com/certificado-digital/.

El secreto de firma se configura exclusivamente en el servidor existente:

- `DTE_CERTIFICATE_PEM`: llave privada y certificado PEM del titular. Preferir llave privada cifrada.
- `DTE_CERTIFICATE_PEM_PASSPHRASE`: clave de la llave cifrada, almacenada como secreto.
- `DTE_CERTIFICATE_SECRET_REF`: opcional; por defecto `DTE_CERTIFICATE_PEM`.
- `DTE_SENDER_RUT`: RUT del firmante autorizado; no se deduce del RUT empresarial.

Si se usa otra referencia, la clave corresponde a `<REFERENCIA>_PASSPHRASE`. Los archivos se convierten en un equipo confiable, con permisos de lectura restringidos y sin contraseñas en argumentos ni historial. El PEM, PFX y claves no se incorporan a Git, base de datos, logs o frontend. Registrar en Finanzas → Configuración contable únicamente los metadatos del secreto instalado.

## Activación

1. Completar razón social, RUT, giro, Acteco y domicilio con los datos tributarios vigentes del SII.
2. Postular al sistema propio mediante el representante autorizado, con certificado vigente. Configurar SII directo en certificación. Registrar la fecha real de postulación y resolución 0 para ese ambiente.
3. Obtener CAF del ambiente de certificación y cargarlo en el almacenamiento cifrado. Habilitar los tipos de documento del set asignado sin marcarlos como certificados.
4. Ejecutar el set de pruebas asignado por el SII, simulación, intercambio, muestras y declaración exigidos. Conservar las respuestas y evidencia de cada aprobación.
5. Completar y verificar la representación impresa con PDF417 y el intercambio electrónico. La implementación directa actual todavía requiere estos desarrollos y validación real de firma y timbre; la validación XSD no acredita certificación.
6. Registrar la resolución y autorización reales, habilitar únicamente tipos certificados y cargar CAF de producción. Verificar la primera emisión autorizada mediante respuesta oficial del SII y entrega del XML/PDF al receptor.

Los folios de prueba no son válidos en producción. La prueba de conexión consulta la semilla y, cuando existe certificado, intenta autenticación; no emite facturas ni acredita autorización tributaria.

## Validación local

Los cuatro XSD originales del SII están incluidos en `control-runtime/resources/sii/xsd`. La ruta se resuelve desde el módulo compilado para admitir el servidor combinado. `DTE_XSD_DIR` permite una ubicación explícita. Las pruebas incluyen el ejemplo oficial del SII y rechazo de XML inválido.

```sh
npm --prefix control-runtime run build
node --test control-runtime/test/dte-provider.test.mjs
```

La aceptación final se verifica con el SII. No se marca una factura emitida por la sola creación de su XML o recepción inicial del envío.

Referencias oficiales:

- Postulación: https://www.sii.cl/factura_electronica/factura_mercado/proc_postulacion.htm
- Etapas: https://www.sii.cl/preguntas_frecuentes/factura_electronica/001_003_2050.htm
- XSD y ejemplo: https://www.sii.cl/servicios_online/1039-formato_xml-1184.html
