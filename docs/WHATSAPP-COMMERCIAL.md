# WhatsApp y leads comerciales

El panel publicado en zyteron.cl usa el repositorio `iag-lol/ZYTERON`, con Next.js y la API de `control-runtime` en el mismo servicio de Render. El repositorio `zyteroncontrol` contiene la aplicación independiente anterior.

- `/administracion/commercial/leads`: bandeja completa de leads, con consulta de todas las páginas y actualización de respaldo cada 20 segundos mientras la pestaña está visible.
- `/administracion/commercial/whatsapp`: bandeja compartida con el administrador anterior. Conserva conversaciones, mensajes, notas y modos IA, humano y asistido.
- `/administracion/conversaciones-web`: conversaciones del chat del sitio.

La migración `20261021014026_connect_whatsapp_commercial_leads.sql` incorpora las conversaciones existentes y sincroniza las nuevas mediante triggers. Cada conversación tiene un único lead, vinculado mediante `leads.whatsapp_conversation_id`. El campo histórico `whatsapp_conversations.lead_id` conserva su significado de vínculo a una cotización.

Los cambios de nombre, empresa, contacto y servicio se reflejan en el lead. La sincronización conserva el estado comercial, responsable, notas y archivo establecidos en Comercial. El envío de mensajes utiliza la integración existente con Meta y respeta la ventana de atención de 24 horas.

El inicio del servicio aplica la migración en una transacción, con bloqueo, validación de cobertura y registro de checksum en `zyteron_admin_client_migrations`. Un error revierte la transacción e impide iniciar una versión incompleta. No se amplían permisos públicos ni se incorporan credenciales al navegador.

Verificación SQL sin conservar registros de prueba: `supabase/tests/whatsapp-commercial.sql`. La prueba termina con `ROLLBACK`.
