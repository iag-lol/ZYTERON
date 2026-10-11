# Mantención al terminar la cobertura pagada

Cada web de cliente necesita su propio `siteId`, cotización mensual, origen HTTPS y secreto aleatorio de 64 hex. Configurar en el servidor Zyteron `PAYMENT_SITE_BINDINGS` como JSON de objetos `{siteId, quoteId, origin, secret}`. No reutilizar el secreto ni incluir la web corporativa en estos bindings. Nunca usar variables NEXT_PUBLIC para estos valores.

Adaptar `proxy-template.ts` al proxy de la web Next.js existente, conservando sus reglas de autenticación. Configurar allí `SITE_ID`, `SITE_ORIGIN`, `SITE_SHARED_SECRET` y `SITE_ACCESS_ENABLED=true`. El sitio consulta https://www.zyteron.cl/api/site-access y valida firma, nonce, instante y versión antes de aplicar un estado. Una confirmación de mantención se vuelve a verificar y se registra mediante ACK.

La cancelación solicita al proveedor terminar al final del período. El modo mantención sólo se autoriza para el sitio exacto, con cancelación verificada y sin cobertura pagada vigente; un pago posterior se vuelve a comprobar. Las respuestas de mantención son HTTP503, sin caché y sin indexación. Una verificación inconclusa muestra indisponibilidad temporal y no se presenta como cancelación confirmada.

No hay webs de clientes configuradas todavía: instalar el proxy y vincular la cotización al dar de alta cada web futura. No suspender el servicio de Render completo. El protocolo fue comprobado localmente con HMAC, rechazo de firma falsa, período pagado y ACK de vencimiento; no demuestra que una futura web ya tenga el proxy instalado.
