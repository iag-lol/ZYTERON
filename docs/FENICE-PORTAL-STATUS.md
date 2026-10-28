# Fenice: proyecto GPS y portal cliente

Revisión: 28-10-2026. Cliente: SOCIEDAD DE TRANSPORTES Y DIESEL SpA, RUT 76.710.961-K.

## Estado operacional y comercial

La ejecución del proyecto GPS está terminada. La validación está en curso y el pago final permanece pendiente. El cierre del trabajo, la conformidad de la validación y la liquidación del saldo son estados distintos.

## Mensualidades comprobadas

| Servicio | Mensualidad con IVA | Antecedente |
| --- | ---: | --- |
| Fenice.cl: hosting, base de datos y soporte remoto | $133.242 | Factura electrónica N.º 14, emitida el 20-10-2026 |
| Fleet Control GPS: servidor, hosting, base de datos y ampliación de capacidad | $280.514 | Factura electrónica N.º 15, emitida el 20-10-2026 |
| Total mensual | $413.756 | Suma de los dos servicios |

Las facturas N.º 11 y 12 registraban $195.134 para el servicio GPS. La factura N.º 15 incorpora la ampliación: $235.726 netos más $44.788 de IVA. No corresponde conservar $195.134 como mensualidad vigente.

El portal muestra pagos confirmados de $280.514 y $133.242 del 20-10-2026. Sin embargo, la sección Mensualidades sólo presenta COT-2026-06963 por $133.242, pendiente de activación y sin fecha activada. Registrar un pago no crea por sí solo el acuerdo recurrente.

## Diferencias observadas en producción

- Inicio informa cero servicios activos y cero proyectos en curso.
- PRJ-2026-000029, Diseño de Fleet Control: estado publicado `READY`, avance 0%, tarjeta «En curso».
- PRJ-2026-000027, Sitio web Fenice.cl: estado publicado `READY`, avance 100%, tarjeta «En curso».
- PRJ-2026-000028, Mejoramiento SEO para fenice.cl: estado publicado `READY`, sin avance publicado, tarjeta «En curso».
- Administración contabiliza cuatro proyectos y una OT abierta para este cliente; el portal muestra tres proyectos. Falta conciliar la identidad y visibilidad del cuarto registro.
- El saldo publicado de COT-2026-09804 es $1.368.100, con vencimiento 30-10-2026. Una notificación anuncia $1.184.050 como pago final del 50%. La factura N.º 16 documenta un abono de $1.000.000. La notificación debe contrastarse con las imputaciones vigentes antes de corregirla.
- El listado inicial de documentos muestra tres antecedentes de junio. La descarga autorizada de las facturas recientes y la documentación GPS aún no está comprobada.
- La política de credenciales exige un proyecto vinculado y pagado íntegramente, sin otros saldos pendientes, además de contraseña y códigos de verificación. Con saldo pendiente, esa condición impide revelar credenciales; el cierre operacional no levanta el bloqueo comercial.

## Código y despliegue

El repositorio publicado es `iag-lol/ZYTERON`. GitHub `main` y Render Live coinciden en `2020e4121e5be4c4d9b280a642c26f9d4ba30226`; despliegue `dep-dbe8c9ks728c73bcg2vg`, servicio `srv-d7emn6dckfvc73ekrh70`. El despliegue automático está deshabilitado.

La corrección local de presentación usa los estados operacionales en las tarjetas y el detalle del proyecto. Un avance de 100% no se transforma automáticamente en conformidad ni en pago recibido. La auditoría `scripts/audit-fenice-portal.mjs` valida el proyecto de base de datos y la identidad del cliente, utiliza una transacción de sólo lectura y excluye contraseñas y secretos cifrados del resultado.

Las correcciones locales no están desplegadas. No se han modificado proyectos, servicios, mensualidades, documentos, credenciales ni saldos productivos en esta revisión. La conexión de automatización de Chrome está indisponible; las operaciones interactivas no proporcionan una verificación fiable de escritura.

## Conciliación pendiente

1. Verificar el cuarto proyecto, la OT y los vínculos entre registros históricos y operacionales. Registrar el término del trabajo sin afirmar que la validación o el pago están cerrados.
2. Vincular los dos acuerdos mensuales a los servicios y proyectos correspondientes; comprobar fechas de cobro y evitar duplicar obligaciones o activar cargos de tarjeta.
3. Comprobar descarga privada y vínculos de cada factura, manual y documento de entrega. Publicar únicamente materiales del cliente.
4. Resolver expresamente el acceso a credenciales durante la espera del saldo, conservando el aislamiento de clientes y la verificación de identidad.
5. Conciliar la notificación del saldo final con la deuda y las imputaciones verificadas.
6. Desplegar la corrección de presentación y verificar las secciones desde la sesión real del cliente.
