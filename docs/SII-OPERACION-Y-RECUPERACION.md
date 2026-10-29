# Operación y recuperación de facturación electrónica

Empresa: ZYTERON SPA, RUT 78398774-0. Responsable: Administración y Finanzas. Fechas y horas de presentación: zona America/Santiago, formato dd-mm-aaaa y hh:mm.

## Control de documentos y folios

Los CAF se conservan cifrados en almacenamiento privado. El certificado y su contraseña se administran como secretos del servidor. La emisión requiere certificado vigente, datos del emisor, resolución y ambiente correctos, formato implementado y folios autorizados disponibles para ese ambiente.

La asignación de folios y la adquisición del intento son transaccionales. Cada intento se adquiere una sola vez; el sobre exacto queda archivado antes de transmitir. Un timeout posterior al inicio del envío conserva el documento y folio bloqueados. El operador consulta el historial del SII y recupera el recibo; no vuelve a emitir para resolver una recepción incierta. Los folios utilizados o anulados no se reutilizan.

Los estados de recepción, aceptación, rechazo y aceptación con reparos se concilian con los Track ID y archivos originales. Un rechazo no acredita emisión. Las correcciones de documentos aceptados utilizan la nota y referencia que corresponda; no se eliminan las facturas emitidas ni se duplican al recuperar un respaldo.

## Recepción e intercambio

Finanzas revisa diariamente la casilla tributaria registrada y los documentos recibidos en el SII. Los XML recibidos se archivan y se comprueban por emisor, receptor, tipo, folio, fecha e importe. Los documentos históricos se mantienen identificados como tales; no se importan como nuevas ventas o pagos.

El acuse técnico y las respuestas de intercambio se generan desde los XML recibidos. La aceptación comercial y el acuse de mercaderías requieren comprobar la operación y su recepción. Un documento dirigido a otro receptor no se acepta. El envío de respuestas y documentos al destinatario autorizado debe quedar registrado con su evidencia. La generación local de un XML no acredita su transmisión.

## Respaldo fiscal

`scripts/fiscal-backup.mjs` conserva los registros fiscales y sus dependencias públicas, metadatos de columnas y restricciones, junto con los objetos de `finance-documents`, `finance-secrets`, `quote-invoices`, `accounting-documents` y `expense-documents`. Incluye documentos, CAF cifrados, recibos, folios, intentos, facturas, pagos, certificación y antecedentes históricos incorporados al archivo.

El proceso toma una instantánea de lectura repetible en PostgreSQL y copia los bytes de los archivos, no sólo sus rutas. Cada objeto se cifra con AES-256-GCM y se verifica mediante lectura posterior. Los objetos idénticos se reutilizan por SHA-256 sin sobrescribirlos. El manifiesto está cifrado y firmado; la clave de recuperación se protege con RSA-OAEP mediante el certificado de la empresa. El manifiesto cifrado conserva también la clave necesaria para recuperar los secretos financieros existentes. No contiene la clave privada del certificado.

Destino automático: bucket privado `fiscal-backups`, sin políticas de acceso para clientes. La comprobación se ejecuta al iniciar el servicio y cada hora; genera una instantánea diaria y reintenta si no existe una copia diaria confirmada. Los fallos se registran en Render y generan una notificación crítica en Finanzas cuando la base está disponible. `FISCAL_BACKUP_ENABLED=false` suspende el trabajo; requiere revisión operativa antes de continuar emitiendo.

Retención: al menos siete años. No hay borrado automático de copias ni objetos del archivo fiscal. Una retención legal prevalece sobre cualquier eliminación posterior. Al renovar el certificado deben conservarse también los certificados y claves privadas anteriores necesarios para abrir respaldos históricos, con el mismo control de acceso que los originales.

El destino automático comparte el proyecto Supabase con la aplicación. No protege por sí solo contra la eliminación del proyecto o la pérdida completa de esa cuenta. Administración conserva además una exportación cifrada fuera del servicio y la actualiza semanalmente, y antes de cambios de proveedor, certificado o ambiente. El certificado de recuperación y su contraseña deben conservarse por separado del archivo exportado. El respaldo de la base gestionado por Supabase no incluye los bytes de Storage.

## Comprobación y recuperación documental

Exportar a una carpeta nueva, con la configuración del servidor disponible sólo en el entorno del proceso:

```sh
node scripts/fiscal-backup.mjs create
node scripts/fiscal-backup.mjs export '<ruta del manifiesto>' '<carpeta nueva de respaldo cifrado>'
node scripts/fiscal-backup.mjs restore '<carpeta del respaldo cifrado>' '<carpeta nueva de recuperación>'
```

La recuperación comprueba empresa, firma del manifiesto, certificado, cifrado autenticado, SHA-256 y longitud de cada archivo. Rechaza rutas fuera de la carpeta y no sobrescribe destinos existentes. La carpeta recuperada contiene datos confidenciales y debe permanecer con permisos privados. No se escribe en la base productiva ni se transmite al SII durante esta comprobación.

Finanzas verifica los recuentos, identidades y estados de documentos, folios y recibos recuperados. La prueba se registra con fecha, referencia del manifiesto y resultado. Se repite mensualmente y después de cambios del mecanismo de cifrado o almacenamiento.

Esta recuperación reconstruye el archivo fiscal. El restablecimiento completo del servicio requiere además recuperar el esquema y permisos de la base, las identidades de acceso, la configuración de Render y los secretos corporativos en un entorno aislado. No se atribuye a una extracción de archivos el resultado de una restauración completa de la plataforma.

## Contingencias

1. Ante pérdida de conectividad, errores de firma, folios o respaldo, detener la emisión afectada y registrar la incidencia.
2. Conservar el intento, XML, folio, hashes y cualquier Track ID obtenido. No liberar folios ni repetir POST sin resolver la recepción.
3. Revisar el SII con el administrador autorizado; conciliar el resultado y recuperar el recibo si existe evidencia coincidente.
4. Ante pérdida de datos, recuperar el archivo cifrado en una carpeta aislada. Comprobar integridad y estados antes de planificar la reposición del servicio.
5. Restaurar el servicio en un entorno separado, verificar permisos y conexión, y conciliar los folios y documentos con el SII antes de reabrir emisión. Los documentos ya emitidos conservan identidad y folio.
6. Registrar la resolución y las comprobaciones. Si existe una discrepancia no resuelta, mantener bloqueada esa emisión y escalar al responsable de Finanzas y al SII según corresponda.

## Activación productiva

La certificación de pruebas no activa la producción de la aplicación. La Declaración de Cumplimiento corresponde al representante legal y exige confirmar las obligaciones indicadas por el SII en ese momento. Tras su presentación, se comprueban la autorización efectiva, la resolución, el ambiente, los tipos y los CAF productivos. Sólo se habilitan formatos implementados y autorizados. Las boletas mantienen su transporte y habilitación independientes.

Fuentes: [proceso de certificación del SII](https://www.sii.cl/factura_electronica/factura_mercado/proceso_certificacion.htm), [conservación de DTE](https://www.sii.cl/preguntas_frecuentes/factura_electronica/001_003_2356.htm) y [alcance de los respaldos de Supabase](https://supabase.com/docs/guides/platform/backups).
