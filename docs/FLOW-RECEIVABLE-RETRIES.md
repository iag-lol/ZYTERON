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

La prueba real ejecutó la función del servidor con la configuración de producción. No equivale a una prueba del endpoint ya publicado ni a un pago recibido.

## Publicación

Corrección enviada a `iag-lol/ZYTERON:main`, commit `bac76e9`. Incluye el controlador de reintentos y la comprobación de checkout vencido. No requiere migración de base de datos.

Último código activo comprobado en Render: `8be9b53ba809d598ffc24816e63ce5514ddaf75d`, despliegue `dep-dbgs1h4s728c73c8h2eg`, correspondiente a la bandeja comercial publicada.

La publicación de la corrección de Flow y la prueba del botón del portal permanecen pendientes. El acceso nativo a Chrome devuelve capturas en blanco y `noWindowsAvailable`; el acceso directo del navegador informa que el host no está disponible. El código subido y la preparación real del enlace no acreditan por sí solos una publicación en Render.
