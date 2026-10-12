# Conexión del nuevo portal — 12-10-2026

Destino autorizado: sitio existente iag-lol/ZYTERON, Render srv-d7emn6dckfvc73ekrh70. Se conservarán los registros históricos de la web y sus identidades. No se comprará infraestructura. Prueba mensual externa diferida por el propietario.

Criterios de aceptación:

1. El diseño aprobado se muestra en `/clientes`, acceso y panel, con navegación de sus 15 secciones y datos propios reales. Ningún fixture de demostración llega a producción.
2. `/administracion` comparte los registros de clientes, solicitudes, proyectos, documentos, soporte, mensajes y finanzas. Sus acciones actualizan lo que el cliente ve.
3. Formularios públicos y cotizaciones persisten en Lead/Quote existentes, de forma atómica e idempotente; sin fallback de escritura anónima ni falso éxito.
4. El chat guarda turnos completos en servidor, distingue visitante/cliente e impide que el navegador se apropie de una conversación o fabrique mensajes de la IA. Su historial y leads son consultables en administración.
5. Permisos de tablas y políticas RLS se comprueban contra dos clientes, notas internas, documentos, credenciales y finanzas. Los contextos de lectura de clientes usan un rol limitado y transacciones, sin depender únicamente de un filtro WHERE con acceso privilegiado.
6. Formularios/chat tienen protección de origen, límites de cuerpo y abuso, errores sin información privada. Operaciones cliente+auditoría son transaccionales.
7. Calendario/pagos/cancelación existentes siguen funcionando; una venta requiere pago verificado y no se repite ante callbacks concurrentes.
8. Tipos, lint, build, pruebas significativas y recorrido visual escritorio/móvil pasan antes de publicar. Se inspeccionan migración y grants en el proyecto correcto antes de ejecutarlos y se verifica Render/HTTPS al terminar.

Acceso cloud: conector Supabase sin permiso sobre el proyecto. El propietario reconectó Chrome Trabajo, perfil de la cuenta de base de datos. Sólo se usarán servicios/proyectos exactos autorizados; copias privadas temporales fuera de Git y borradas al finalizar.

Estado verificado del hito:

- Nuevo diseño integrado en el mismo Next.js y sus 15 secciones, con datos del usuario autenticado. La demostración de 3000 no se publica.
- Se reutilizan User, Quote, Lead, Project, ClientDocument, Sale, Receivable y Payment. Los modelos canónicos clients/client_services/client_events y sales_threads/sales_messages se conectan mediante un puente privado; no se duplican ventas ni deudas.
- Cinco cuentas históricas enlazadas; se conservaron 5 usuarios, 4 leads, 18 cotizaciones, 3 proyectos, 5 documentos, 11 ventas, 7 pagos y 11 obligaciones. Las dos cuentas activas verificadas superaron consultas con el rol RLS restringido en la base real.
- Cinco PDF antiguos copiados a client-files privado, con hash de contenido verificado. El portal usa descarga autorizada y URL firmada de 90 segundos. Los originales de Drive se conservaron; sus permisos externos no cambian con la copia.
- Formularios y chat usan persistencia de servidor, límites de origen/cuerpo/abuso y claves de idempotencia. Una solicitud no crea una venta ni acredita un pago. El historial del chat se recupera mediante una capacidad HttpOnly y la identidad del cliente; administración puede responder.
- Admin comparte servicios/agenda, documentos/credenciales e informes desde la ficha de cada cliente; nuevas bandejas de Entradas y Conversaciones web. Los recursos pueden vincularse sólo a proyectos/cotizaciones del mismo cliente.
- Sesiones existentes de NextAuth se revalidan contra estado, verificación y versión; cambiar/restablecer contraseña revoca sesiones antiguas. No se migró el proveedor de identidad a Supabase Auth ni se implementó delegación de múltiples organizaciones en este hito.
- Verificación: 264 pruebas del sitio, tipos, lint (6 advertencias preexistentes), build; 23 controles HTTP, 12 pruebas de RLS/atomicidad, 16 pruebas de formularios/chat/admin en base local aislada; recorrido visual móvil/escritorio. Prueba externa de alta mensual diferida por el propietario; no se registró tarjeta ni se activó una nueva suscripción real.
- Monitoreo muestra continuidad administrativa y cobertura pagada cuando existe una cotización vinculada. Las webs futuras requieren su vínculo exacto en PAYMENT_SITE_BINDINGS y el componente de control en Next.js; no se inventan mediciones técnicas ni vínculos de hosting.
