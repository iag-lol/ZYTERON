# Portal y Zyteron Control conectados

La navegación principal de clientes usa una aplicación nueva en `src/components/connected-portal`, basada en el portal aprobado de `apps/portal/components/portal.tsx`. Las quince rutas ya no renderizan los cuerpos de los módulos antiguos. Las tarjetas, búsqueda, filtros, dialogs, formularios y calendario trabajan con DTO propios obtenidos mediante el rol limitado `zyteron_portal_client` y RLS.

La navegación administrativa principal usa el diseño de Zyteron Control (`.integration/control/apps/web` en el workspace de integración), adaptado al mismo servicio pagado y a la identidad existente. `connected-control` reemplaza AdminSidebar, AdminTopbar y las vistas principales con ejecutivo, Cliente 360°, CRM, cotizaciones, entradas, proyectos, finanzas, servicios, agenda, documentos, conversaciones y auditoría. Los endpoints y herramientas especializadas heredadas ajenas al portal permanecen en el repositorio; no se sustituyó su modelo de negocio ni se migró la identidad a Supabase Auth.

## Datos y acciones

- Conserva los registros nativos de User, Lead, Quote, Project, Receivable, Payment, ClientDocument, SupportTicket, PortalRequest, ClientCommunication y ClientNotification. Reutiliza client_services/client_events y el vínculo canónico existente.
- Los formularios públicos y cotizadores continúan entrando en sus registros originales; se muestran en la nueva bandeja y CRM. El chat web persistido está en sales_threads/sales_messages, con vistas de web y portal para el equipo y lectura RLS del historial propio para clientes.
- Cliente: tickets/respuestas, conversaciones, pedidos, reunión/cambio de datos, perfil/contraseña, lectura de notificaciones, documentos privados, cotizaciones PDF, códigos de acceso y cargos/cancelaciones.
- Administración: propuestas pendientes, proyectos, servicios y agenda publicados, archivos privados, credenciales cifradas, respuestas al chat/tickets/solicitudes y mensajes al portal. /api/control exige sesión de administrador revalidada, origen permitido y payload acotado/validado.
- Preparar una cotización no crea venta ni acredita dinero. Un borrador con payment.enabled=false no puede cobrar; habilitar exige una etapa existente. Una propuesta con pagos confirmados no puede cambiar sus importes desde el editor nuevo.
- Las ventanas de resultado derivan de etapas persistidas y pagos CONFIRMED; el éxito tiene enlaces al comprobante PDF real. No se interpreta el estado de pago desde parámetros de URL. La pasarela usa la misma pestaña y su dominio de checkout autorizado.
- La activación/cancelación mensual conserva códigos de correo de un uso. Las proyecciones se distinguen de pagos confirmados. La continuidad usa cobertura efectivamente pagada y reconciliación; no se inventan mediciones técnicas.

## Verificación de esta corrección

272 pruebas nativas, tipos, lint sin errores (6 advertencias heredadas), build. Regresión financiera local con proveedores simulados. En el workspace: 24 controles HTTP de portal/rutas, 12 RLS/atomicidad, 18 de formularios/chat/admin, 6 de autenticación y 25 de las vistas y acciones nuevas. Esas pruebas mutan únicamente PostgreSQL local y no cobran dinero. Inspección visual de los dos diseños en escritorio y vista móvil local a 390 × 844; el override del conector no aplicó móvil, por lo que se usó emulación real de Chrome.

La prueba externa de suscripción Sandbox continúa pendiente por decisión del propietario. Las webs futuras necesitan su agente Next.js y vínculo específico para comprobar la suspensión real. La validación local de IA/correo no acredita entrega externa; deben comprobarse con un caso controlado del propietario. Esta corrección reutiliza el servicio Render existente y no contrata recursos nuevos.
