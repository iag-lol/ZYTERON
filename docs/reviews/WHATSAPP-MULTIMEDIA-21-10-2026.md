# WhatsApp multimedia — 21-10-2026

Estado: implementación local; publicación y comprobación con Meta pendientes de aprobación. Base remota comprobada: `ecf8a5e441ad09475c3a9d75183701472f95bf95`. Rama de integración: `fix/admin-finance-hr-review`.

## Funciones

- Imágenes JPG/PNG recibidas y enviadas: miniatura, apertura y descarga autenticadas. El espacio de la miniatura se reserva antes de cargar para conservar la posición del historial.
- Documentos PDF recibidos y enviados: nombre, apertura y descarga. Otros formatos muestran su limitación explícita.
- Adjuntos con vista previa, descripción opcional, eliminación de la selección y progreso de envío. Límites del panel: imágenes de 5 MB y PDF de 20 MB; descripción de 1024 caracteres.
- Un archivo y su descripción se envían juntos. Mientras existe un adjunto, el botón de texto separado permanece deshabilitado.
- Fuera de las 24 horas desde el último mensaje del cliente, el envío libre exige retomar el contacto mediante una plantilla aprobada. Consultar el estado de un envío ya registrado conserva su identificador y sigue permitido aunque cierre la ventana.

## Acceso y trazabilidad

`POST /api/admin/whatsapp/media` usa la sesión administrativa y la validación de origen existentes. El cuerpo multipart tiene límites de tamaño y tiempo; se comprueban tipo, extensión y firma de bytes. La capacidad de archivos se limita por proceso para acotar memoria.

La restricción UNIQUE existente de `whatsapp_messages.client_request_id` decide qué solicitud puede enviar. La huella incluye conversación, actor, descripción, nombre, tipo y bytes. Un identificador reutilizado con otro contenido se rechaza. La fila se registra antes de cargar el archivo en Meta; el identificador del archivo se guarda antes del envío. La ventana se vuelve a consultar después de la carga.

Un rechazo confirmado queda como `failed`. Una entrega sin confirmación queda como `unknown`; la consulta posterior del mismo identificador no vuelve a enviar el archivo. La interfaz conserva la solicitud original cuando falla la conexión o caduca la sesión. También permite continuar escribiendo sin repetir ese adjunto. El estado `read`/`delivered` recibido antes de la finalización no se sustituye por `sent`.

`GET /api/admin/whatsapp/messages/:id/media?conversationId=:id` valida sesión, ambos UUID y el vínculo persistente entre mensaje y conversación. La consulta del servidor aplica ambos filtros. El navegador recibe bytes con caché privada deshabilitada, `nosniff` y disposición de contenido segura. Los tokens y las direcciones privadas de Meta permanecen en el servidor.

Cada lectura solicita a Meta una dirección actualizada usando el identificador guardado y el número de negocio configurado. Solo se admite HTTPS hacia `lookaside.fbsbx.com/whatsapp_business/attachments/`, sin redirecciones; se validan tipo, límites, firma y hash cuando Meta lo proporciona. Las rutas o direcciones suministradas por el navegador no se usan como origen del archivo.

El parche de multimedia no depende de los commits locales de Finanzas/RRHH y puede publicarse por separado sobre la base remota comprobada.

La implementación reutiliza las columnas y el índice existentes. No requiere una migración nueva. La autorización sigue siendo la del módulo administrativo; estas rutas no son endpoints del portal de clientes.

## Validación

- `npm test`: 382 pruebas aprobadas. Incluye 25 pruebas multimedia, 2 de capacidad y 1 regresión adicional de mezcla de mensajes; el resto corresponde a la integración local existente.
- Regresiones backend de Finanzas/RRHH/DTE: 13 pruebas aprobadas.
- Typecheck frontend y compilación completa Next/backend aprobados con servicios aislados y direcciones de base de datos de prueba.
- Lint dirigido de todos los archivos afectados: 0 errores y 0 avisos.
- Lint global de fuentes, excluyendo `output/**` con artefactos generados de QA: 0 errores y 5 avisos preexistentes. Una ejecución sin excluir esos bundles generados produce diagnósticos ajenos a las fuentes de la aplicación.
- `git diff --check`: aprobado.
- Next compilado con autenticación real y servicios aislados: 7 verificaciones aprobadas, incluidas sesión ausente, cookie alterada, UUID inválido, mensaje inexistente, origen ajeno y conversación inexistente. Se realizaron solo dos lecturas del backend simulado, sin escrituras ni envíos al proveedor.
- Navegador con el componente real, handlers y flujo de envío reales, repositorio y proveedor sintéticos: imagen recibida visible de 600 × 360; una imagen enviada mediante doble clic produjo un único envío; un PDF enviado produjo otro envío; ambas entradas aparecieron en el historial. El PDF se abrió correctamente en el visor de Chrome. El PDF descargado coincide exactamente con el original: SHA-256 `515e9592959931f99529eae1a3c720118d87f1bc0b6929eeafc541ea81cf1a8e`.
- Historial anterior: carga completa de 125 mensajes de texto, archivos y eventos adicionales, conservando la posición relativa de lectura. Mensajes SSE recibidos durante la lectura no fuerzan el desplazamiento al final. Ventana cerrada: adjuntos y texto deshabilitados; vuelta a la conversación vigente: adjuntos habilitados.

La extensión de Chrome impidió la asignación automatizada de archivos locales por falta de acceso a URLs de archivos. La validación de la interfaz utilizó archivos sintéticos servidos por el entorno de QA y el mismo evento de selección del componente. El selector nativo y el circuito real de Meta requieren comprobación posterior; no se modificaron permisos de la extensión.

## Pendientes

1. Aprobar la publicación de la mejora de WhatsApp y comprobar posteriormente imagen y PDF con un destinatario de prueba autorizado. Las pruebas locales no demuestran entrega productiva.
2. La conservación del contenido depende de la disponibilidad de los archivos en Meta. Este cambio no incorpora archivo permanente propio. Un contenido que Meta ya no permita recuperar requiere revisión; el sistema no puede reconstruirlo ni afirma que nunca haya existido.
3. La ampliación a Word, Excel, audio o video queda fuera de estos formatos habilitados.
4. Los pendientes previos de Finanzas/RRHH conservan su revisión y sus aprobaciones separadas en `FINANZAS-RRHH-21-10-2026.md`.

Referencia de integración: [Media — colección oficial de Meta](https://www.postman.com/meta/whatsapp-business-platform/folder/13382743-ecb27be5-4d27-4763-bbee-6a8002c04bf3).

Evidencia local: `/Users/eduardoavila/Documents/Codex/2026-10-21/whatsapp-multimedia/`.
