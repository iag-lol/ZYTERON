# Integración de pagos y rutas privadas

## Estado verificable — 11-10-2026

Esta rama conserva la web del servicio pagado `srv-d7emn6dckfvc73ekrh70` y prepara `/administracion` y `/clientes`. Las direcciones anteriores redirigen temporalmente a las nuevas; la autenticación y las API administrativas siguen protegidas. No requiere otro servidor ni dominio.

**No desplegada. No habilitada para cobrar.** Las credenciales existentes en Render autenticaron una consulta firmada de sólo lectura en producción (HTTP200) y fueron rechazadas en Sandbox (HTTP401). No se creó ningún pago. Las claves Sandbox verificadas son distintas; no reemplazar las globales `FLOW_*` durante el piloto.

## Cambios

- Retorno de checkout: ignora el estado y texto enviados por query. Consulta al proveedor y exige token, referencia, moneda, importe y evidencia del pago coincidentes con el registro persistido.
- Checkout y cotizaciones: mismo control de evidencia antes de acreditar; sin persistencia durable no se crea el pago. Comprobante únicamente después de verificar la aprobación.
- Cobros reales protegidos por `FLOW_LIVE_PAYMENTS_ENABLED=true`, ausente por defecto. No activar por el mero resultado de un build ni de una consulta de autenticación.
- Experiencia cliente, correo y comprobante con marca Zyteron, sin publicidad del proveedor. El checkout alojado sigue siendo externo y se abre en la misma pestaña; no hay un iframe soportado implementado aquí.
- No se inyectan etiquetas de marketing al abrir directamente las rutas privadas. Debe verificarse además la transición desde páginas públicas antes de permitir datos financieros reales.

## Piloto aislado

`/clientes/pagos/prueba` y `/api/client-payment-pilot/*` trabajan exclusivamente con `zyteron_sandbox_payment_pilot`. El SQL está en `supabase/zyteron_sandbox_payment_pilot.sql`; no modifica Quote, Sale, stock, saldos, DTE ni registros de clientes reales. El importe permitido es $1.000 CLP de prueba. Todo comprobante lleva marca explícita de Sandbox.

La creación se reserva con bloqueo de fila. Una respuesta ambigua queda en revisión y no se vuelve a crear ciegamente. Token cifrado AES-GCM ligado al ID; la URL persistida no contiene el token. Acceso por capacidad aleatoria enviada en fragmento, retirada del navegador inmediatamente, y cookie HttpOnly Secure. CSRF, cuerpos limitados, origen y destino HTTPS restringidos. Callbacks sólo almacenan una señal; servidor y worker consultan la API firmada antes de confirmar. Un aviso pendiente tardío no revoca un pago confirmado.

Correo: lease durable, destinatario de pruebas autorizado e idempotencia. `ACCEPTED` significa aceptado por el proveedor, no entregado. No se enviaron correos externos; no se validó entrega ni un pago efectivo con Sandbox.

Configuración del piloto, siempre del servidor: `ZYTERON_SANDBOX_ENABLED`, `ZYTERON_SANDBOX_WORKER_ENABLED`, `ZYTERON_SANDBOX_API_KEY`, `ZYTERON_SANDBOX_SECRET_KEY`, `ZYTERON_SANDBOX_TOKEN_KEY` (64 hex), `ZYTERON_SANDBOX_ORIGIN` (https://www.zyteron.cl), `ZYTERON_SANDBOX_PAYER_EMAIL`, Supabase privado y remitente/API de correo. Mantener deshabilitado hasta completar la configuración. No añadir estas claves a `NEXT_PUBLIC_*`.

## Validación local

- Suite completa Node, tipos, ESLint y compilación Next.
- PostgreSQL/Supabase real local: 14 comprobaciones, incluyendo ocho reservas simultáneas con un único ganador, ocho solicitudes de envío con una única lease, referencias/importes falsos rechazados y tabla/RPC privadas.
- HTTP real: 9 comprobaciones, PDF sólo para fixture confirmado, intento de retorno falsificado sin aprobación, rechazo por CSRF y redirecciones de rutas.
- Inspección Chrome escritorio y móvil 390px; PDF renderizado e inspeccionado. Los fixtures representan estados simulados, nunca pagos externos.

## Pendientes antes de producción

1. Revocar las credenciales expuestas durante revisión y actualizar las dependencias afectadas de Render. La rotación la completa el propietario; no basta crear una clave nueva sin revocar la anterior. No guardar valores en Git ni registros.
2. Revisar/applicar el SQL aditivo y permisos en el destino correcto después de la rotación. Probar callbacks/retorno HTTPS con Sandbox, aprobados/rechazados/pendientes, concurrencia y reinicios; comprobar el PDF y entrega de correo.
3. Endurecer los efectos heredados de checkout (stock/venta/correos), callbacks y reintentos con transacciones/outbox. Las reservas del piloto aislado no arreglan automáticamente esos procesos históricos.
4. Completar unión autorizada entre la nueva experiencia de Control y el modelo de clientes/finanzas de esta web; son repositorios e identidades distintos. No traducir permisos por cabeceras del llamante.
5. Integrar y probar suscripción mensual, calendario, cancelación nativa, aviso interno y modo mantención por recurso preciso al finalizar la cobertura pagada. El código preparado en Control no está conectado a esta web por mover rutas.
6. Verificar cookies, permisos por cliente, navegación pública/privada, CSP, recuperación de pagos y consumo del Starter de 512MB. Sólo después evaluar la activación de cobros reales.

No declarar esta rama lista para producción ni fusionarla automáticamente mientras esos requisitos estén pendientes.
