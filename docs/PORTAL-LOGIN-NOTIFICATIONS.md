# Avisos de ingreso al portal de clientes

## Funcionamiento

Cada inicio de sesión nuevo de una cuenta CLIENT activa y con correo verificado registra un aviso dirigido a contacto@zyteron.cl. Cubre ingreso con correo o RUT y contraseña, e ingreso con Google. El mensaje identifica nombre, empresa, correo, método y fecha y hora de Chile continental, con formato dd-mm-aaaa hh:mm.

La renovación del JWT, la navegación con una sesión abierta, los intentos rechazados y los ingresos de administración no generan avisos de cliente. El mensaje no contiene contraseñas, códigos ni tokens de sesión.

La autenticación registra el aviso y lastLoginAt en una transacción antes de habilitar la nueva sesión. Si el registro falla, la sesión no conserva permisos. Un fallo del proveedor de correo conserva el aviso pendiente y no interrumpe una sesión cuyo registro ya se guardó.

## Entrega y recuperación

La tabla privada zyteron_portal_login_notifications conserva cada aviso con una identidad única por sesión. El proceso de envío inicia con el servidor Node de Next.js y consulta la cola cada cinco segundos, independientemente de las opciones de facturación. Su activación no depende del navegador del cliente ni de una petición posterior.

Las tareas se reservan con FOR UPDATE SKIP LOCKED y un lease de dos minutos. Dos instancias no procesan simultáneamente la misma tarea; los leases vencidos se recuperan después de una interrupción. El remitente y el mensaje quedan persistidos para mantener idéntica la solicitud al reintentar.

El envío usa Resend, RESEND_API_KEY y RESEND_FROM_EMAIL, con RESEND_FROM como alternativa de remitente. Sin configuración, el estado WAITING_CONFIGURATION conserva el aviso y reintenta cada minuto. Los fallos temporales usan espera progresiva, desde 15 segundos hasta 15 minutos. Una clave idempotente evita repetir el correo durante los reintentos.

Resend conserva las claves idempotentes durante 24 horas. Un envío sin confirmación durante 23 horas pasa a REVIEW_REQUIRED; requiere conciliar el historial del proveedor antes de reactivarlo. ACCEPTED significa que Resend aceptó el mensaje y devolvió un identificador; no certifica que el destinatario lo haya leído ni su ubicación en la bandeja.

## Supervisión

GET /api/portal/admin/login-notifications requiere sesión administrativa y devuelve configuración, recuento por estado y los 50 ingresos más recientes. La respuesta es privada y no se almacena en caché. La cola no concede lectura ni escritura a anon, authenticated ni zyteron_portal_client.

PORTAL_LOGIN_NOTIFICATIONS_READY confirma que el proceso pudo consultar la cola. PORTAL_LOGIN_NOTIFICATIONS_UNAVAILABLE indica un fallo de base de datos o ejecución. PORTAL_LOGIN_NOTIFICATION_PENDING registra únicamente identidad del aviso, estado y código de error, sin claves ni contenido del mensaje.

Para un aviso REVIEW_REQUIRED, consultar el historial de Resend y el identificador del aviso. Si existe aceptación, registrar su provider_id y estado ACCEPTED. Si está comprobado que no se envió, restablecer PENDING, first_attempt_at y la programación mediante una operación administrativa auditada. No repetir envíos inciertos fuera de la ventana idempotente.

## Validación

La migración 20261028060000_portal_login_notifications.sql se aplicó el 28-10-2026 después de comprobar creación transaccional y permisos. Las pruebas con PostgreSQL comprobaron unicidad de identidad, reservas concurrentes distintas y recuperación de un lease vencido; sus datos temporales se eliminaron antes del despliegue.

Pasaron TypeScript, ESLint de los archivos modificados y 22 pruebas dirigidas. Se cubren destinatario, contenido escapado, fecha chilena, entrega idempotente, rechazo del proveedor, respuesta incompleta, fallo de red, ingreso con contraseña y Google, renovación de sesión, cuenta desactivada, administrador, persistencia fallida, falta de configuración y conciliación de envíos antiguos.

## Publicación

Commit de código: 6bd38df6da8522ef77531589d8318c70669a57eb, repositorio iag-lol/ZYTERON. Servicio Render: srv-d7emn6dckfvc73ekrh70. Despliegue: dep-dbgp0nei0phs738kh99g. Render confirmó Deploy succeeded y Live el 28-10-2026 a las 03:08, hora de Santiago, con el proceso PORTAL_LOGIN_NOTIFICATIONS_READY. La compilación completa de backend y Next.js pasó en Render.

La prueba real con una cuenta temporal comprobó contraseña incorrecta rechazada (401), autenticación correcta (200), sesión activa y tres renovaciones sin duplicar el aviso. La cola envió un solo correo, aceptado en el primer intento. Su recepción en contacto@zyteron.cl se comprobó mediante Outlook el 28-10-2026 a las 03:08. El mensaje de prueba se conserva en el buzón como evidencia de recepción; la cuenta y el registro temporal de la cola se eliminaron.

El diagnóstico administrativo respondió 200 con configuración activa; el acceso sin sesión respondió 401 y la sesión de cliente recibió 403. La separación de pruebas de servidor permite ejecutar también el comando de pruebas habitual del proyecto, sin modificar el comportamiento publicado.


## Clasificación en Outlook: 28-10-2026

El aviso real de Ruben Pierattini, SOCIEDAD DE TRANSPORTES Y DIESEL SpA, llegó a contacto@zyteron.cl el 28-10-2026 a las 03:44. Estaba en la carpeta Zyteron Intranet. La recepción en el buzón y la presencia en la bandeja de entrada son verificaciones distintas.

La regla activa «Mover todos los mensajes de Zyteron a Zyteron Intranet» trasladaba los mensajes del remitente configurado en Resend y detenía el procesamiento de otras reglas. Se agregó y guardó una excepción de asunto: «Zyteron | Ingreso de cliente:». La regla conserva su clasificación de los demás mensajes del remitente. La regla no se ejecutó sobre mensajes históricos.

El aviso real se recuperó en la bandeja de entrada, sin marcarlo como leído. Un nuevo correo de prueba con el mismo remitente y prefijo de asunto llegó directamente a la bandeja de entrada el 28-10-2026 a las 03:52, sin intervención para moverlo. La consulta se limitó expresamente a esa carpeta. El mensaje identifica su propósito como prueba técnica y no registra un ingreso ficticio de cliente. Esta corrección corresponde a la configuración del buzón; el código publicado conserva su versión Live.
