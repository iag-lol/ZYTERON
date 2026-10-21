# Cobros mensuales y suspensión por falta de pago

Cada web de cliente necesita su propio `siteId`, cotización mensual, origen HTTPS y secreto aleatorio de 64 hex. Configurar en el servidor Zyteron `PAYMENT_SITE_BINDINGS` como JSON de objetos `{siteId, quoteId, origin, secret}`. No reutilizar el secreto ni incluir la web corporativa en estos bindings. Nunca usar variables NEXT_PUBLIC para estos valores.

Adaptar `proxy-template.ts` al proxy de la web Next.js existente, conservando sus reglas de autenticación. Configurar allí `SITE_ID`, `SITE_ORIGIN`, `SITE_SHARED_SECRET` y `SITE_MAINTENANCE_ENABLED=true`. El sitio consulta https://www.zyteron.cl/api/site-access y valida firma, nonce, instante y versión antes de aplicar un estado. Una confirmación de mantención se vuelve a verificar y se registra mediante ACK.

La cancelación solicita al proveedor terminar al final del período. El modo mantención sólo se autoriza para el sitio exacto, con cancelación verificada y sin cobertura pagada vigente; un pago posterior se vuelve a comprobar. Las respuestas de mantención son HTTP503, sin caché y sin indexación. Una verificación inconclusa muestra indisponibilidad temporal y no se presenta como cancelación confirmada.

No hay webs de clientes configuradas todavía: instalar el proxy y vincular la cotización al dar de alta cada web futura. No suspender el servicio de Render completo. El protocolo fue comprobado localmente con HMAC, rechazo de firma falsa, período pagado y ACK de vencimiento; no demuestra que una futura web ya tenga el proxy instalado.

En Comercial → Cotizaciones → Cobros y modalidad, las propuestas mensuales permiten guardar el primer vencimiento, el día mensual, los avisos, la suspensión por saldo pendiente y de 0 a 90 días de gracia. Un borrador guarda la configuración sin emitir deudas ni activar suspensión. La activación requiere aceptación y cuenta de cliente vinculada. Flow y los calendarios de Finanzas conservan su gestión propia.

El cambio de fecha sólo afecta períodos sin emitir. Un mes que ya tiene una cuenta emitida no se emite nuevamente al cambiar su día; sus importes y vencimientos se conservan. Los días 29–31 se ajustan al último día disponible sin perder el día configurado para los meses siguientes.

Para el calendario mensual manual activo, la suspensión comienza a las 00:00 de Santiago del día posterior al vencimiento y a todos los días de gracia. Por ejemplo, vencimiento 20-10-2026 y siete días de gracia permiten pagar hasta el 27-10-2026; la suspensión puede aplicar desde el 28-10-2026. Se requiere saldo positivo después de asignaciones de pagos confirmados, misma moneda, mismo cliente y cotización aceptada. El control vuelve a consultar el libro en cada solicitud firmada; un pago pendiente no libera la deuda. Pausar el calendario desactiva esta regla de suspensión y conserva los cobros emitidos.

La configuración privada usa control de revisión para rechazar cambios concurrentes. El panel distingue un sitio vinculado de uno pendiente de conexión. Guardar una regla sin `PAYMENT_SITE_BINDINGS` y sin el proxy instalado no suspende ninguna web. El portal de pago del cliente continúa disponible.
