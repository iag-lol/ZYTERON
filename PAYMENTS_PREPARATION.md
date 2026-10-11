# Pagos y renovaciones Zyteron

## Implementación — 11-10-2026

Integración nativa del sitio existente iag-lol/ZYTERON: `/administracion`, `/clientes`, checkout, cotizaciones y calendario mensual/anual. Se reutiliza el servicio Render srv-d7emn6dckfvc73ekrh70; no se contratan servicios adicionales. El usuario confirma credenciales revocadas y actualizadas en Render. PostgreSQL verifica certificado TLS con la CA oficial Supabase.

## Acreditación de dinero

El servidor consulta la API firmada y exige identidad persistida de orden, importe CLP y fecha de pago efectiva. El retorno del navegador, registrar una tarjeta o activar una suscripción no acredita dinero. Los intentos se guardan cifrados antes de redirigir; callbacks y conciliación usan colas privadas durables. Respuestas ambiguas de creación quedan para revisión sin repetir cobros ciegamente.

Transacciones con bloqueo crean una sola venta y descuentan stock una vez. Una cotización comercial marcada ganada sin pagos suficientes no genera venta. Cada factura mensual confirmada tiene su propio pago y venta idempotentes. Cobros desfasados o de otro importe quedan para conciliación; no se aplican a la deuda incorrecta.

## Comprobante y correo

PDF privado y sólo de pagos confirmados, con comprobación actual de la API. El portal exige dueño autenticado; el checkout usa grant firmado HttpOnly Secure. Es comprobante de pago, no boleta/factura tributaria. Correo en outbox con deduplicación, leases y API de envío idempotente. ACCEPTED significa aceptado para envío, no entregado. Documentos nuevos de transferencia se guardan en Storage privado; documentos públicos históricos no se migraron.

## Suscripciones y sitios

Activación y cancelación requieren sesión verificada y código de un solo uso al correo del dueño. La cancelación se solicita al final del período, genera aviso al cliente y Zyteron y se reconcilia con el proveedor. Calendario separa pagos reales de proyección estimada; la solicitud sin confirmación aún permite proyectar posibles cobros. El sitio conserva el período pagado. Vinculación por web futura: docs/site-maintenance/README.md. No hay webs de clientes ya vinculadas.

## Validación y activación

Suite Node, tipos, lint y build; pruebas PostgreSQL local de 24 confirmaciones concurrentes, stock, venta, correo y permisos; recorrido nativo con pasarela simulada de pago único, dos facturas mensuales, PDF, correo, cancelación OTP y ACK de mantención. Estas pruebas no representan pagos externos. Dependencias de producción sin vulnerabilidades conocidas reportadas por npm audit; quedan avisos en herramientas de desarrollo. Marketing deshabilitado globalmente para que sus scripts no sigan la navegación privada.

Migración privada aplicada en Supabase bwybwrxrbzjkwpxhpkcr. Render tiene configuración separada Sandbox y workers en el servicio existente. El piloto `/clientes/pagos/prueba` usa exclusivamente zyteron_sandbox_payment_pilot por $1.000 CLP; no modifica ventas/stock/clientes. Acceso aleatorio privado, callbacks HTTPS, API firmada, PDF marcado prueba y correo a destinatario autorizado. Mantener FLOW_LIVE_PAYMENTS_ENABLED=false hasta verificar el piloto HTTPS.

Publicación comprobada: revisión 74391b5 Live en Render, ocho controles HTTP por HTTPS correctos. Se creó desde la web una orden Sandbox y abrió checkout en la misma pestaña. Estado PENDING: PDF denegado HTTP409, email NOT_SENT, sin dinero acreditado. Pendiente: completar aprobado/rechazado y verificar PDF/correo; suscripción externa Sandbox. El botón de pago solicita aceptar términos y necesita confirmación del propietario antes de continuar. No afirmar prueba de cobro efectivo por un build. El checkout soportado se abre en la misma pestaña del proveedor, sin ventana emergente; no se implementa un iframe. La experiencia propia usa marca Zyteron.
