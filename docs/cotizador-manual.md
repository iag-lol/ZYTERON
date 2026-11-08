# Cotizador manual

El cotizador público está en `/cotizador/manual`, con selector de plan en el inicio y acceso en la navegación. Catálogo de alcance cerrado: `src/lib/manual-quote/catalog.ts`. Las tarifas se obtienen de `src/config/pricing.ts`.

## Oferta

Seis paquetes de compra directa: Web Básica, Emprendedor, Pyme, Empresa, Catálogo WhatsApp y Ecommerce Profesional. Diecinueve adicionales con límites, exclusiones, compatibilidad y días adicionales. Los servicios que requieren levantamiento técnico conservan el formulario de propuesta a medida: flota, sistemas empresariales, integraciones específicas, IA y desarrollos corporativos.

Pago único del desarrollo completo, neto más IVA de 19%. No se activan suscripciones. Dominio, hosting, licencias, consumo y comisiones de terceros quedan excluidos. La entrega comienza con pago confirmado y recepción completa de contenidos, accesos y decisiones de diseño. El plazo suma el intervalo base y los días de los adicionales. El resumen explicita dos rondas de ajustes, entrega de código y accesos, sesión de entrega y 30 días de corrección de fallas del alcance.

Cada modificación del alcance comercial requiere incrementar `CATALOG_VERSION`. El servidor recalcula precios y rechaza un total diferente del que el cliente revisó. Las cotizaciones sin contratar duran siete días. Las condiciones aceptadas se conservan en el pedido, incluso si cambia el catálogo después.

## Recepción y compra

1. El cliente ingresa nombre, correo y teléfono, acepta privacidad e inicia la cotización. Se guardan Quote, Lead y el evento de aviso en una transacción. Los datos están pendientes de verificación en esta etapa.
2. Selecciona plan y adicionales. Puede guardar y descargar el PDF del alcance guardado.
3. Al comprar, crea una cuenta CLIENT con contraseña repetida, o inicia sesión en su cuenta existente. Un registro público no modifica cuentas anteriores. El alta está limitada al correo de la cotización activa.
4. Confirma el código enviado al correo: seis dígitos, vigencia de 15 minutos, cinco intentos, reenvíos limitados. Se reutilizan la verificación y las sesiones del portal.
5. Revisa alcance, exclusiones, calendario, total y datos de boleta o factura. La aceptación se guarda con fecha y versión. La selección queda reservada al preparar el pago.
6. Flow recibe el monto validado en el servidor. Los callbacks existentes verifican orden, token y monto con el proveedor. Una redirección del navegador no acredita por sí sola un pago.

La referencia visible debe coincidir con la cookie firmada. La sesión para pagar debe estar activa, verificada y corresponder al correo del pedido. El PDF contratado puede descargarse por el propietario autenticado. Ningún endpoint público entrega credenciales, tokens de pago ni otros pedidos.

## Avisos

El inicio crea un evento `MANUAL_QUOTE_STARTED` en `zyteron_contact_events`, con clave única por cotización. Usa los destinatarios existentes de `zyteron_contact_settings` y sus alternativas de entorno. Se intenta despachar después de responder al formulario; la bandeja de salida conserva los estados y reintentos. El worker de contactos procesa pendientes cada cinco segundos.

Correo requiere Resend y remitente autorizado. WhatsApp requiere Meta Cloud API, destinatario y una plantilla aprobada para mensajes iniciados fuera de la ventana de conversación. Un evento guardado no equivale a un mensaje entregado. La vista administrativa de notificaciones presenta el estado por canal. Los logs `MANUAL_QUOTE_NOTICE` contienen sólo referencia, canal, estado y código de error.

## Configuración y operación

Se reutilizan las tablas Quote, Lead, User, los códigos del portal y las tablas existentes de idempotencia, avisos y pagos. No requiere una nueva migración.

Flow necesita credenciales vigentes, `PAYMENT_TOKEN_KEY` y la activación validada de producción. Las colas de pagos requieren `PAYMENT_WORKER_ENABLED=true`; los avisos usan `BILLING_WORKER_ENABLED=true`. `MANUAL_QUOTE_READINESS` registra indicadores de configuración sin valores secretos. La habilitación global de registro público del portal no es necesaria para esta compra.

Un resultado incierto de creación de pago exige conciliación del intento; no se genera otro cobro automáticamente. Los pedidos pagados no permiten modificar el alcance. Una cotización nueva no cancela ni elimina pedidos anteriores.

## Verificación

- `npm test`: reglas, tarifas y acceso firmado, junto con la batería existente.
- `npm run test:manual-quote`: rutas reales y transacciones en PostgreSQL embebido; cuentas, propiedad, totales, PDF y recuperación de fallos. Los proveedores externos se sustituyen y no se envían mensajes ni se mueve dinero.
- `node scripts/qa-manual-quote.mjs`: recorrido visual a 1440, 360, 390 y 430 px, con APIs y pasarela simuladas. Revisa accesibilidad, desbordamientos y errores de JavaScript. No acredita una entrega real de correo/WhatsApp ni un pago real.
- La publicación requiere comprobar adicionalmente la recepción de avisos y la configuración del proveedor en producción.
