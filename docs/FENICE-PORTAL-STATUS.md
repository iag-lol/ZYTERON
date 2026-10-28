# Fenice: proyecto GPS y portal cliente

Revisión: 28-10-2026. Cliente: SOCIEDAD DE TRANSPORTES Y DIESEL SpA, RUT 76.710.961-K.

## Estado operacional y comercial

La ejecución del proyecto GPS está terminada al 100%. La validación con Fenice continúa y el saldo final permanece pendiente. El cierre del trabajo, la conformidad y la liquidación son estados distintos.

Los cuatro proyectos aparecen en el portal con avance 100%. Sitio web, SEO y diseño Fleet Control están completados. PRJ-2026-000001, Creación Software GPS flota Fenice, conserva estado QA, con sus dos tareas y dos hitos completados. Su visibilidad cambió de INTERNAL a CLIENT_VISIBLE. OT-2026-000003 registra ejecución completada. El cliente está activo y tiene dos servicios mensuales vinculados a sus proyectos.

## Mensualidades

| Servicio | Importe con IVA | Respaldo |
| --- | ---: | --- |
| Fenice.cl: hosting, base de datos y soporte | $133.242 | Factura N.º 14 del 20-10-2026 |
| Fleet Control GPS: servidor, hosting, base de datos y ampliación | $280.514 | Factura N.º 15 del 20-10-2026 |
| Total mensual | $413.756 | Dos acuerdos independientes |

La propuesta GPS de $280.514 existía como READY_TO_SEND. Se concilió como acuerdo aceptado con la mensualidad confirmada por administración, la factura N.º 15 y PAG-2026-000002. La cotización anterior de $195.134 permanece archivada. No se creó otra mensualidad ni se alteraron pagos. Las dos asignaciones se comprobaron en la sesión real del cliente. La fecha recurrente está pendiente de confirmación; no se han activado cargos automáticos ni enviado avisos.

## Saldo final

COT-2026-09804 registra $2.368.100 y una imputación confirmada de $1.000.000. El saldo comprobado es $1.368.100, con vencimiento 30-10-2026. La notificación anterior de $1.184.050 fue corregida para coincidir con ese saldo. Los movimientos financieros y sus importes no fueron modificados.

## Documentos

Las facturas N.º 9 a N.º 16 están publicadas en almacenamiento privado, vinculadas a los proyectos y, donde corresponde, a sus pagos. Las ocho descargas administrativas responden correctamente y sus hashes SHA-256 coinciden con los originales. La factura N.º 6 ya existía; se comprobó su descarga y se evitó duplicarla.

El portal contiene 14 documentos. La factura N.º 15 se descargó desde la sesión real del cliente y su SHA-256 coincide con el original.

La guía de entrega y portal contiene los servicios, saldo, uso de Fleet Control, tratamiento de lecturas GPS, documentos y condiciones de acceso. Sus tres páginas fueron renderizadas y revisadas visualmente. No contiene contraseñas ni claves de infraestructura. Está publicada y visible en la sesión del cliente; su descarga autenticada devuelve el archivo original y el acceso sin sesión responde 401.

## Credenciales

Administración confirmó que el bloqueo por pago debe continuar. No hay autorizaciones de entrega anticipada activas. Las cuatro credenciales históricas sin proyecto quedaron vinculadas al sitio web de Fenice, sin modificar secretos.

El control publicado y verificado en Administración > Cliente > Portal cliente > Credenciales permite por proyecto autorizar consulta antes del pago y restablecer el bloqueo. Exige motivo, sesión administrativa válida, mismo origen y proyecto del destinatario. Registra la decisión en auditoría y detecta cambios concurrentes. La contraseña, los códigos, el cifrado y la validación de propietario permanecen obligatorios.

La tabla de autorizaciones tiene RLS y no permite escritura del cliente. Las pruebas transaccionales comprobaron lectura propia, aislamiento de otro destinatario y rechazo de escritura; los datos de prueba fueron revertidos. La migración se aplicó sin otorgar autorizaciones.

Los registros de Render y Supabase describen servicios administrados por Zyteron. Las invitaciones externas a GitHub y GoDaddy conservan su estado real; una autorización del portal no concede acceso a proveedores ni cuentas maestras.

## Conciliación de equipos GPS

Administración confirmó que el pago comercial agrupado de $1.798.819 corresponde a los mismos movimientos contables de $200.000 y $1.598.819. El historial muestra los dos movimientos con sus facturas y omite únicamente la representación comercial agregada. Conserva importes, imputaciones y saldo de la operación. La relación explícita quedó registrada en metadatos y auditoría.

La exclusión requiere confirmación, mismo cliente, moneda CLP, movimientos confirmados únicos y suma exacta. Una coincidencia de importes sin relación explícita no elimina movimientos. La sesión real de Fenice muestra 13 pagos confirmados después de la publicación.

## Código y validación

El repositorio publicado es iag-lol/ZYTERON. El commit de código be54620809ec1f5ba86ba00e82eb4fcc6a0b6f3c fue verificado en GitHub y Render. Servicio srv-d7emn6dckfvc73ekrh70, despliegue dep-dbgnarbbc2fs73b6fif0, estado Deploy succeeded y servicio Live el 28-10-2026 a las 01:12, hora de Santiago. El despliegue automático está deshabilitado.

La corrección de presentación diferencia planificación, pruebas y entrega. La sesión real del cliente muestra los cuatro proyectos al 100%, GPS en Pruebas, los otros tres Entregado, ambas mensualidades y el historial conciliado. El formulario administrativo muestra bloqueo activo en sus tres proyectos, exige motivo y mantiene Confirmar cambio deshabilitado mientras falta ese requisito. No se activó ninguna excepción.

TypeScript, ESLint de los archivos modificados y 26 pruebas dirigidas pasaron. Las pruebas cubren estados, mensualidades, documentos, conciliación explícita, alcance y revocación de autorizaciones, cifrado y verificación de identidad. La compilación completa de backend y Next.js pasó en Render. El control publicado respondió 200 a administración y rechazó sesión ausente (401), origen ajeno (403), proyecto ajeno (404), estado concurrente obsoleto (409) y motivo vacío (400). Las ocho entradas de credenciales conservan acceso bloqueado.

## Pendientes externos

- Conformidad de Fenice sobre la validación final del GPS.
- Pago del saldo de $1.368.100.
- Confirmación del día de vencimiento de ambas mensualidades. Los servicios están activos y sus importes visibles; las asignaciones recurrentes continúan pendientes de activación, sin fecha inventada ni cargos automáticos.
- Invitaciones o delegaciones externas sujetas a sus condiciones comerciales. El control del portal no las modifica.
