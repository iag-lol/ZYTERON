# Aplicaciones originales conectadas

La administración monta la aplicación completa de `iag-lol/zyteroncontrol/apps/web`: sus componentes, navegación, espacios de trabajo y páginas originales se conservan bajo `/administracion`. No usa la adaptación reducida `connected-control`.

El portal monta el componente aprobado de `NEW ZYTERON/apps/portal/components/portal.tsx`, con sus quince secciones y estilos originales. Se cambiaron los datos sintéticos y las acciones de demostración por consultas y operaciones del servidor; no se sustituyeron sus páginas por otro diseño.

La API Nest original se ejecuta en el mismo proceso Node que Next.js, sólo en loopback. El puente verifica cada sesión administrativa, rechaza orígenes ajenos y firma método, ruta, cuerpo, sesión y nonce. El servidor interno rechaza firmas alteradas, vencidas y repetidas. La autenticación nativa proporciona AAL1: las operaciones que requieren MFA conservan su bloqueo; no se inventan usuarios ni factores verificados.

Las migraciones añaden los módulos originales ausentes (desarrollo, auditorías, soporte y RR. HH.) y políticas de publicación para proyectos, documentos y tickets. Los clientes usan un rol PostgreSQL sin login ni bypass de RLS. Las notas internas y los registros ajenos permanecen inaccesibles. Los clientes nuevos pueden preparar una cuenta pendiente de verificación; una coincidencia con una cuenta existente requiere revisión y nunca se vincula automáticamente.

Los registros históricos de la web se proyectan en las pantallas originales: formularios/leads, cotizaciones, proyectos, documentos, solicitudes, conversaciones del chat y pagos. Los libros financieros históricos se conservan y no se duplican. Algunas mutaciones de registros históricos requieren el flujo de origen o una nueva versión y devuelven un bloqueo explícito en vez de fabricar un resultado.

Se mantiene el checkout nativo y el piloto Sandbox aislado. Sandbox no puede abonar un libro real remoto. Aceptar una cotización o volver del checkout no crea una venta ni acredita dinero; se cerró además el antiguo endpoint de venta manual sin pago. La prueba externa de suscripción mensual sigue aplazada por decisión del propietario. No se realizaron cobros reales ni se enviaron invitaciones durante la verificación.

## Validación local

- 278 pruebas unitarias correctas; compilación de Next y de la API original correcta.
- 42 comprobaciones de pantallas/API originales, permisos, origen y creación local de una propuesta mensual con partidas gravadas y exentas.
- 18 comprobaciones de aislamiento de publicaciones en la base real, dentro de transacciones revertidas: cliente A/B, notas privadas, documentos internos, escritura no autorizada y acceso anónimo.
- 11 comprobaciones de la firma interna: alteraciones de método/ruta/cuerpo, replay, vencimiento, red externa y falsa declaración de MFA.
- 9 comprobaciones en modo producción con ambos servidores dentro de un único proceso; consumo observado en macOS cercano a 400 MB tras el recorrido. Debe comprobarse también el servicio real tras publicar.

La regresión financiera local con proveedor simulado pasó: concurrencia, callbacks repetidos, venta/comprobante/correo sólo tras pago, cuotas y cancelación/suspensión con cobertura pagada. No equivale a una transacción externa.
