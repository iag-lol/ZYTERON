# Avisos de mensajes de clientes

Revisión: 28-10-2026.

## Presentación

Los avisos de WhatsApp y chat web usan un formato de conversación. El nombre del cliente y su contacto aparecen junto a un avatar de iniciales; el canal y la fecha están separados del contenido. El mensaje ocupa una burbuja blanca, con texto de 18 px y sus saltos de línea. El botón «Ver y responder en Zyteron» abre la conversación en el panel administrativo.

La hora corresponde a America/Santiago y se presenta con fecha dd-mm-aaaa y hora hh:mm de 24 horas. Se usa la fecha del evento persistido; no se sustituye por la hora de un reintento. El texto de vista previa del correo incluye el canal, el cliente y el comienzo de su mensaje.

La plantilla usa tablas de presentación y estilos en línea para los clientes de correo. No depende de imágenes externas ni de etiquetas semánticas de maquetación que Outlook puede ignorar. Se revisó visualmente en escritorio y con un ancho de 360 px. El contenido del cliente se escapa como texto y los enlaces de acción se limitan a la administración de Zyteron.

## Entrega y reintentos

El proceso de envío guarda una copia del remitente, destinatario, asunto, HTML, texto y reply_to de cada entrega antes de enviarla. La copia se conserva en el campo privado payload._emailSnapshots del evento, identificada por el UUID de la entrega. Los cambios concurrentes de otras entregas se incorporan mediante una actualización JSONB protegida por el lease vigente.

Los reintentos reutilizan esa copia y la misma clave idempotente de Resend. Una entrega iniciada antes de esta versión y sin copia conserva el HTML anterior. La igualdad de bytes del formato anterior se comprobó contra la versión previa del repositorio. Las plantillas específicas de contactos y cotizaciones siguen usando su HTML persistido.

Los mensajes recibidos de WhatsApp y chat web continúan originándose en los eventos existentes de la base de datos. La presentación no añade conversaciones, mensajes de cliente ni envíos externos de WhatsApp. La copia del correo no contiene claves de API.

## Validación y publicación

Pasaron las pruebas de contenido escapado, saltos de línea, canal correcto, hora de Chile, formato previo e HTML específico, junto con las regresiones de monitoreo y presentación del portal: 14 pruebas dirigidas. TypeScript y ESLint pasaron. La operación de conservación JSONB se comprobó en PostgreSQL y se revirtió junto con sus datos temporales.

Commit publicado: c1b3f182ac20d768fe47421d2dcbe5f9c8cb7491, repositorio iag-lol/ZYTERON. Incluye también el panel de monitoreo de dos semanas. Render confirmó Deploy succeeded | Live en dep-dbgqfqec6qcc73ccnh50 el 28-10-2026 a las 04:48, America/Santiago. La compilación y generación completa pasaron.

La prueba de WhatsApp llegó a contacto@zyteron.cl a las 04:41 y se revisó visualmente dentro de Outlook. La prueba del proceso automático de producción para chat web llegó a las 04:50 con el formato nuevo: entrega dd961836-ee97-4444-948a-384eff23c59c, estado ACCEPTED, un intento, sin error y con copia del correo persistida. Resend asignó 01a1817d-6263-7042-ae1d-e92adff1d707 y Outlook confirmó su recepción. Se insertó exclusivamente una entrega de correo de prueba; no se insertaron mensajes entrantes ni se enviaron mensajes a clientes.

Una prueba anterior de las 04:49 fue procesada con la plantilla previa durante la transición de instancias del despliegue. La comprobación posterior de las 04:50 confirmó la instancia nueva. Los correos ya recibidos conservan su diseño original. Las pruebas están identificadas por el prefijo design-qa: y el asunto Prueba de diseño.

La regla existente de Outlook para el remitente de Zyteron dirige estos avisos a Zyteron Intranet. La excepción de ingreso de clientes sigue limitada al asunto de los avisos de acceso; no se modificaron las reglas de mensajes de chat.
