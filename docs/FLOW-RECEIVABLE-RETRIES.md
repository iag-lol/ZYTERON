# Reintentos de pago de cobros con Flow

Revisión: 28-10-2026. Fechas y horas de presentación: America/Santiago.

## Incidencia

`createReceivableCheckout` consultaba el intento PENDING fuera de su plazo local y devolvía de forma incondicional «El intento anterior se está verificando. Actualiza el cobro para continuar». La respuesta no continuaba según el estado confirmado por Flow.

El intento de Fenice revisado correspondía a un saldo de $1.368.100, creado el 24-10-2026 y con vencimiento local una hora después. La consulta inicial al proveedor devolvió pendiente; al revisar su checkout y volver a consultar, Flow confirmó anulación. No se modificó manualmente el estado para simular pago, rechazo o anulación.

## Resolución del reintento

La reserva conserva el bloqueo transaccional del documento y el índice único de intentos abiertos por cobro y cuenta de Flow. Antes de reservar se comprueban propietario, acceso mediante RLS, moneda, vigencia y saldo exigible.

- Una orden pendiente con token, enlace e importe coincidente reutiliza el mismo checkout después de consultar a Flow.
- Si el plazo local venció y Flow aún devuelve pendiente, el servidor abre mediante GET el checkout existente y repite la consulta autenticada de estado. El contenido HTML no acredita pago ni permite liberar una orden. Esta comprobación no envía datos de tarjeta ni ejecuta un pago.
- La comprobación del checkout admite sólo HTTPS de los hosts de Flow establecidos, un token con formato válido y sin credenciales, puertos, fragmentos ni parámetros ajenos. No sigue redirecciones y tiene un plazo máximo de cuatro segundos.
- Sólo el rechazo o la anulación confirmados por el proveedor permiten volver a reservar dentro de la misma solicitud. Esa reserva comprueba otra vez la disponibilidad y el saldo antes de crear una orden.
- Un pago confirmado actualiza el documento e impide otro pago del mismo saldo. El portal vuelve a solicitar los datos cuando recibe un conflicto de estado o importe.
- Una creación en curso, una respuesta desconocida, un fallo de consulta o una orden sin token recuperable conserva la protección contra duplicados. La antigüedad local no demuestra por sí sola que una orden esté anulada.

La [documentación oficial de Flow](https://developers.flow.cl/api) establece que `timeout` limita la vigencia de la orden y que, vencido ese plazo, no puede pagarse. Los adaptadores de creación conservan `timeout=3600`. La [consulta oficial de estado](https://developers.flow.cl/en/docs/tutorial-basics/status) distingue pendiente, pagada, rechazada y anulada. La reserva sólo se libera usando esa respuesta verificada, no a partir del reloj local o de un mensaje del checkout.

## Validación

- 27 pruebas dirigidas completadas: identidad y saldo, cifrado y vinculación del token, evidencia exacta de pago, firma, importe CLP, concurrencia, reintentos, estados terminales, expiración, destinos de red y errores del proveedor.
- TypeScript, ESLint de los archivos modificados y compilación completa de producción completados.
- Preparación real de checkout para el cobro revisado: importe $1.368.100, una sola orden activa, estado pendiente confirmado por Flow y respuesta HTTP 200 de la página del proveedor.
- Una segunda preparación devolvió exactamente el mismo enlace. No se creó otra orden activa por el reintento.
- El documento, sus asignaciones y la cantidad de pagos permanecieron sin cambios durante la validación. No se completó ningún pago ni se introdujo dinero de prueba en la contabilidad real.

La validación inicial ejecutó la función del servidor con la configuración de producción. Después de publicar se verificó también el endpoint real del portal, con dos solicitudes POST autenticadas para el mismo usuario activo, verificado y con su versión de sesión vigente. La identidad se obtuvo de la base de datos y la sesión técnica temporal se firmó en memoria con vencimiento de cinco minutos; no se cambió la contraseña ni se ampliaron permisos. El servidor volvió a validar la cuenta y el acceso al cobro.

- Endpoint publicado: `/api/portal/payments/receivables/[id]/flow`, respuesta HTTP 200 en ambas solicitudes y `Cache-Control: private, no-store`.
- El segundo POST reutilizó exactamente el checkout del primero; una sola orden activa para $1.368.100 y estado pendiente confirmado mediante la API autenticada de Flow.
- Checkout oficial con HTTP 200 y medios de pago disponibles.
- Solicitud anónima rechazada con HTTP 401.
- Documento, asignaciones y cantidad de pagos sin cambios. Ningún pago completado.

Esta verificación cubre el endpoint publicado y el checkout del proveedor. No acredita un pago recibido ni una sesión iniciada desde el formulario de acceso del cliente. La pestaña disponible del cliente se encontraba en la pantalla de ingreso; no se realizó una prueba manual del botón dentro de esa sesión.

## Publicación

Corrección enviada a `iag-lol/ZYTERON:main`, commit `bac76e9`. Incluye el controlador de reintentos y la comprobación de checkout vencido. No requiere migración de base de datos.

Código activo comprobado en Render: `bac76e9b2da30da98f8eebfa9c5d495bc69a2f00`, despliegue `dep-dbgt0pgm7kps73eogqg0`. Render confirmó `Deploy succeeded | Live` el 28-10-2026 a las 07:40. La página del servicio mostró este commit como el último desplegado y activo.

Las variables `FLOW_API_KEY`, `FLOW_SECRET_KEY` y `PAYMENT_TOKEN_KEY` están presentes en el entorno publicado y `FLOW_LIVE_PAYMENTS_ENABLED` está habilitada. La comprobación real de Flow validó las credenciales; no se incluyeron claves ni tokens en este documento. La prueba del endpoint publicado completó la preparación y reutilización del enlace sin realizar el pago.
