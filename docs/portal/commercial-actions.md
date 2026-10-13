# Acciones comerciales conectadas

La recuperación de datos no conectaba las acciones de los leads de la web: la lectura mostraba IDs proyectados, mientras los botones consultaban una tabla que no contenía esos leads. Además, la interfaz dejaba promesas rechazadas sin mostrar el error.

La migración `20261013044253_connect_web_leads_commercial_workflow.sql` conserva los IDs estables, incorpora los registros reales y conecta futuros ingresos del formulario, cotizador y chat mediante un trigger transaccional. Los estados comerciales son autoritativos y la lectura descarta proyecciones duplicadas. La conversión bloquea el lead y reutiliza la oportunidad al reintentar. Las funciones usan SECURITY INVOKER y no son ejecutables por anon/authenticated.

Las acciones de cotizaciones de la web tienen implementación propia para duplicar, crear una revisión, preparar un contrato en borrador y crear una orden de trabajo. Las copias reservan un folio nuevo y excluyen pagos, tokens y documentos anteriores. Los contratos conservan acceso interno y los reintentos reutilizan el registro. Crear OT exige el importe requerido confirmado, asignado a esa cotización y perteneciente al cliente; pendiente, anulado o Sandbox no acredita el pago. No se crea una venta al preparar contrato/OT. El alta de un cliente utiliza el servicio existente con validación de RUT y prepara acceso pendiente, sin activar cuentas ni enviar invitaciones automáticamente.

Se corrigieron también secuencias independientes usadas para folios de negocio. La migración `20261013050127_synchronize_recovered_business_folios.sql` descubre las funciones de los defaults y sólo adelanta contadores que están detrás de los códigos existentes, con locks y reinicio transaccional.

La interfaz muestra errores, limpia avisos anteriores, bloquea clics simultáneos y lleva el lead actualizado a la vista. Los PDF se descargan con el nombre del archivo, sin depender de una ventana emergente que el navegador puede bloquear.

Verificación: `scripts/commercial-workflow-check.mts` prueba 17 condiciones dentro de una transacción que siempre revierte, incluyendo persistencia, reintentos, revisión, contrato, OT y bloqueos financieros. No persiste datos QA ni envía correos ni ejecuta cobros. Se ejecuta con `ZYTERON_COMERCIAL_CONFIG` apuntando a un archivo privado fuera del repo y `node --conditions=react-server --import tsx scripts/commercial-workflow-check.mts`. La cuenta nueva de cliente no se crea durante esta prueba, para no introducir identidades de QA en producción.
