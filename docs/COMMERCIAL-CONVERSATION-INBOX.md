# Bandeja comercial de conversaciones

Fecha de revisión: 28-10-2026. Zona horaria de presentación: America/Santiago.

## Acceso y presentación

La sección Comercial → Chat web abre `/administracion/conversaciones-web`. La ruta `/administracion/support/inbox` utiliza la misma bandeja. La gestión completa de tickets permanece en `/administracion/support/all`.

Las conversaciones se ordenan por actividad reciente. Cada fila muestra contacto, empresa, canal, último mensaje y estado de atención. Los visitantes sin identificación reciben una referencia estable; la vinculación con un usuario o lead permite mostrar sus datos de contacto. Los filtros disponibles son Todas, Chat web, Sin leer, Por responder e IA activa. La búsqueda comprende contacto, empresa, correo, asunto y referencia.

La conversación distingue cliente, Equipo Zyteron, Zara · IA, sistema y notas internas. El encabezado conserva el destinatario al escribir. Los datos adicionales se despliegan desde el botón de información. La vista móvil alterna entre la lista y el chat.

## Lectura, sincronización y envío

- `GET /api/admin/inbox`: lista paginada, con filtros y búsqueda en el servidor.
- `GET /api/admin/inbox/[source]/[id]`: conversación específica; últimas 60 entradas y cursor compuesto por fecha e identificador para las anteriores.
- `POST /api/admin/inbox/[source]/[id]`: lectura por administrador, limitada a la última entrada del cliente que se mostró.
- Orígenes admitidos: `web`, `ticket`, `native` y `request`.
- La lectura evita `controlSnapshot` y el catálogo general de Soporte. Cambiar de conversación no vuelve a solicitar clientes, cotizaciones, pagos, usuarios ni políticas SLA.
- Eventos SSE administrativos de tipo `inbox` contienen solamente origen e identificador. Una consulta de respaldo se ejecuta cada 12 segundos mientras la pestaña está visible; al recuperar visibilidad se actualiza la información.
- Las consultas anteriores se cancelan y sus resultados se descartan si cambió el destinatario. La caché conserva el historial consultado. Si la actividad durante una ausencia supera la ventana cargada, vuelve a habilitarse la paginación para evitar huecos silenciosos.
- Los borradores se mantienen por conversación durante la permanencia en la página. Se eliminan después de un envío confirmado. No persisten al recargar o cerrar la página.
- Las respuestas del chat web reutilizan `requestId` al reintentar el mismo texto y bloquean el doble envío en la interfaz. La escritura conserva la idempotencia transaccional del servidor.
- Las nuevas respuestas a solicitudes del portal enlazan la comunicación con su solicitud mediante `ClientAuditLog.details.communicationId`. Las comunicaciones antiguas sin referencia no se atribuyen por coincidencia de asunto.

## Estado de Zara

“Zara está respondiendo” requiere una concesión `reply_lease` vigente y `awaiting_reply=true`. “Respondió Zara” identifica una respuesta ya registrada. El sistema no informa presencia ni escritura del visitante porque no existe esa señal.

Durante una respuesta IA se permite preparar el borrador del equipo. Su envío espera el término de esa respuesta. El endpoint administrativo verifica la concesión bajo `FOR UPDATE` y devuelve 409 si sigue activa. La bandeja no introduce un modo de suspensión permanente de la IA.

Cuando el equipo responde después de una concesión vencida se eliminan `reply_key` y `reply_lease` bajo el mismo bloqueo. Una ejecución IA atrasada pierde así la autorización para registrar otra respuesta en el historial.

## Seguridad y base de datos

Los endpoints requieren la sesión administrativa existente y responden con `Cache-Control: private, no-store`. Los secretos de visitante y las claves de respuesta no forman parte del modelo público de la bandeja.

La migración `20261028100000_admin_conversation_inbox.sql` crea `zyteron_inbox_reads` con RLS y sin permisos para `anon`, `authenticated` ni `zyteron_portal_client`. Añade índices para actividad, historial, último mensaje entrante y respuestas vinculadas; incorpora las tablas de chat a la publicación Realtime existente. La entrega por Realtime mantiene las políticas RLS y el flujo administrativo autenticado.

Migración validada primero dentro de una transacción revertida y aplicada después en el proyecto `bwybwrxrbzjkwpxhpkcr`. Las seis conversaciones existentes se consultaron con el nuevo modelo sin alterar mensajes de clientes.

## Validación

- Siete pruebas de modelo: identidad, lecturas, estados IA, conversaciones finalizadas, combinación de mensajes, continuidad del historial y fecha chilena.
- Integración PostgreSQL aislada: cuatro orígenes, historial de 130 mensajes, paginación sin duplicados, separación entre clientes, lecturas por administrador, concesión IA vigente y vencida, búsqueda parametrizada y referencias de solicitudes.
- Componente React: cambio de destinatario con respuesta atrasada, borradores independientes, selección sin recargar lista, conservación del texto ante error, reintento con la misma clave y protección ante doble clic.
- Endpoint de respuesta en entorno aislado: 409 sin escrituras cuando Zara responde, respuesta del equipo al terminar la IA y rechazo sin autenticación. No se enviaron mensajes de prueba a clientes reales.
- TypeScript, ESLint de los archivos nuevos y modificados y compilación de producción completados.
- Ocho pruebas de origen de solicitudes: incluyen el origen público configurado detrás del proxy interno y el rechazo de solicitudes de otro sitio.
- Base publicada: seis conversaciones; consulta de lista entre 285 y 317 ms desde la conexión de revisión. Los chats web requieren dos consultas y devolvieron sus historiales propios. Estas mediciones SQL no equivalen a la latencia HTTP del portal.
- Medición HTTP anterior: `/api/control-core/api/support/workspace` devolvió seis conversaciones en 7.067 ms. Es una muestra puntual, no un compromiso de rendimiento.
- Medición HTTP publicada: lista de seis conversaciones en 558 ms; filtro Chat web en 277 ms; historiales de chat web en 308 y 318 ms. Las solicitudes anónimas devolvieron 401 y el parámetro de paginación inválido devolvió 400.
- Registro de leído publicado: POST 200; lectura visible sin el indicador Sin leer después de abrir la conversación. Conexión SSE administrativa a Realtime confirmada, sin insertar mensajes de prueba.
- Inspección visual en Chrome: escritorio y emulación de teléfono de 390 × 844. Cliente identificado, mensajes diferenciados, contenido de Zara con formato y compositor completo. La altura se distribuye con flex según el espacio disponible bajo la cabecera.

## Publicación

Código: `8be9b53ba809d598ffc24816e63ce5514ddaf75d`, enviado a `iag-lol/ZYTERON:main`. Incluye el rediseño, la protección de concesiones vencidas, la identidad de la cuenta y la validación del origen público en Render.

Render: despliegue `dep-dbgs1h4s728c73c8h2eg` activo. El commit publicado se comprobó en Render y GitHub; las verificaciones HTTP y visuales corresponden al código publicado. La migración y el portal no alteraron importes ni saldos de clientes.
