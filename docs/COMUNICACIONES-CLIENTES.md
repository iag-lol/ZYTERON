# Comunicaciones con clientes

WhatsApp: `/administracion/commercial/whatsapp`.

La bandeja utiliza los colores de Zyteron Control, conserva el historial al actualizarse, abre los mensajes más recientes y permite cargar los anteriores. Al leer arriba no baja automáticamente. «Volver al último mensaje» retoma la lectura reciente.

## Seguimiento por WhatsApp

La ventana para mensajes libres dura 24 horas desde el último mensaje del cliente. Marcar una atención como resuelta o reabrirla no modifica esta regla. Fuera de la ventana, el equipo utiliza una plantilla aprobada con autorización del cliente. La respuesta del cliente habilita nuevamente texto libre.

«Retomar contacto con plantilla» consulta las plantillas aprobadas de la cuenta vinculada, completa variables, muestra vista previa y registra quién solicitó el envío. Cada solicitud utiliza un identificador único para evitar duplicados al repetir la misma petición. Los envíos sin confirmación deben revisarse antes de repetirlos.

Plantillas solicitadas para Zyteron, idioma `es_CL`:

- `zyteron_seguimiento_solicitud`: seguimiento de una solicitud existente.
- `zyteron_alerta_contacto`: avisos internos del equipo, con una variable de resumen.

La aprobación y disponibilidad final corresponden a Meta. No se utiliza la plantilla de ejemplo `hello_world` para contactar clientes.

## Alertas

«Alertas» permite configurar correos, números con código de país, cuenta WABA y plantilla de aviso. La cuenta se verifica contra el número remitente antes de guardarse. Los destinatarios de WhatsApp deben autorizar las alertas.

La captura de leads comerciales, formularios web, cotizador, mensajes de chat web y WhatsApp genera un evento persistente en la misma transacción que el contacto. No genera avisos por las respuestas salientes del equipo o de la IA. Las cotizaciones automáticas utilizan la misma cola de comunicaciones.

El servidor revisa la cola cada cinco segundos. Cada canal y destinatario tienen estado independiente:

- Pendiente / En proceso.
- Aceptado por el proveedor: la API aceptó el envío; todavía no acredita entrega.
- Entregado: WhatsApp confirmó entrega mediante webhook.
- Configuración pendiente: falta un destinatario, credencial o plantilla aprobada.
- Falló el envío / Revisar envío: requiere revisar el detalle.

El correo utiliza una clave estable de idempotencia para sus reintentos. Un envío ambiguo de WhatsApp requiere revisión y no se repite automáticamente, para evitar mensajes duplicados. Los intentos antiguos de correo también pasan a revisión cuando vence la vigencia de idempotencia del proveedor.

## Conexión y acceso

Las actualizaciones del chat pasan por `/api/admin/whatsapp/events`, que valida la sesión de administración y mantiene un canal de eventos con Supabase desde el servidor. El navegador no puede consultar las tablas privadas con una clave pública. Existe actualización periódica de respaldo cuando se interrumpe la conexión.

Variables de servidor:

- `META_WHATSAPP_TOKEN`, `META_WHATSAPP_PHONE_ID`: conexión existente de Meta.
- `META_APP_SECRET` o `META_WHATSAPP_APP_SECRET`: verificación HMAC del webhook cuando está configurado. Debe corresponder a la app de Meta que envía los eventos.
- `WHATSAPP_VERIFY_TOKEN`: validación inicial del callback por Meta.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`: correo.
- `BILLING_WORKER_ENABLED=true`: activa los trabajadores del servicio combinado, incluida la cola de contacto.

Los secretos no se muestran en la bandeja ni se guardan en la configuración de destinatarios. La instalación del secreto de firma de Meta se realiza en Render como variable privada.

Referencias:

- https://business.whatsapp.com/policy
- https://www.postman.com/meta/whatsapp-business-platform/overview
- https://supabase.com/docs/guides/realtime/postgres-changes
