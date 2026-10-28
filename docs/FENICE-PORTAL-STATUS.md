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

La guía de entrega y portal contiene los servicios, saldo, uso de Fleet Control, tratamiento de lecturas GPS, documentos y condiciones de acceso. Sus tres páginas fueron renderizadas y revisadas visualmente. No contiene contraseñas ni claves de infraestructura.

## Credenciales

Administración confirmó que el bloqueo por pago debe continuar. No hay autorizaciones de entrega anticipada activas. Las cuatro credenciales históricas sin proyecto quedaron vinculadas al sitio web de Fenice, sin modificar secretos.

El cambio de código incorpora en Administración > Cliente > Portal cliente > Credenciales un control por proyecto para autorizar consulta antes del pago y restablecer el bloqueo. Exige motivo, sesión administrativa válida, mismo origen y proyecto del destinatario. Registra la decisión en auditoría y detecta cambios concurrentes. La contraseña, los códigos, el cifrado y la validación de propietario permanecen obligatorios.

La tabla de autorizaciones tiene RLS y no permite escritura del cliente. Las pruebas transaccionales comprobaron lectura propia, aislamiento de otro destinatario y rechazo de escritura; los datos de prueba fueron revertidos. La migración se aplicó sin otorgar autorizaciones.

Los registros de Render y Supabase describen servicios administrados por Zyteron. Las invitaciones externas a GitHub y GoDaddy conservan su estado real; una autorización del portal no concede acceso a proveedores ni cuentas maestras.

## Código y validación

El repositorio publicado es iag-lol/ZYTERON. La versión Live comprobada antes del despliegue es 2020e4121e5be4c4d9b280a642c26f9d4ba30226, servicio srv-d7emn6dckfvc73ekrh70. El despliegue automático está deshabilitado.

La corrección de presentación diferencia planificación, validación y entrega en las tarjetas y en el detalle. Las pruebas cubren estados, mensualidades, alcance y revocación de autorizaciones, cifrado y verificación de identidad. TypeScript pasa; la compilación local pasa, pero el prerender completo necesita la configuración Supabase disponible en Render. La publicación y verificación del nuevo control administrativo siguen pendientes.
