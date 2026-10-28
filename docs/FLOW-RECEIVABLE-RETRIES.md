# Reintentos de pago de cobros con Flow

Revisión: 28-10-2026.

## Incidencia y corrección candidata

El aviso «El intento anterior se está verificando. Actualiza el cobro para continuar» se originaba en createReceivableCheckout. Al recuperar un intento PENDING fuera de su plazo local, se consultaba a Flow y luego se devolvía el aviso de forma incondicional, sin continuar de acuerdo con el estado verificado.

La versión candidata consulta y aplica el estado del intento existente antes de resolver el reintento. Si Flow confirma pendiente y el intento conserva token, enlace e importe coincidente, se retoma ese mismo enlace. Si confirma rechazo o anulación, se vuelve a reservar un intento dentro de la misma solicitud, comprobando nuevamente propietario, disponibilidad del documento y saldo antes de contactar al proveedor. Un pago confirmado actualiza el documento y no permite otro pago del mismo saldo. El portal solicita una actualización de datos cuando recibe un conflicto de estado o importe.

Las creaciones en curso, respuestas no verificadas, órdenes sin token recuperable y cambios de importe conservan su protección. Un fallo de consulta al proveedor no habilita otro intento. La antigüedad local por sí sola no acredita pago ni anulación. La reserva mantiene el bloqueo transaccional del documento y el índice único de intentos abiertos por cobro y cuenta de Flow.

La orden existente debe comprobarse además en Flow para confirmar si su enlace sigue siendo utilizable o si requiere una resolución adicional de expiración. Los adaptadores de creación de cobros envían actualmente timeout=3600. Según la [API oficial de Flow](https://developers.flow.cl/api), ese plazo es la expiración de la orden del proveedor. La [consulta oficial de estado](https://developers.flow.cl/en/docs/tutorial-basics/status) distingue pendiente, pagada, rechazada y anulada. Un vencimiento local no se utiliza para sustituir esa comprobación.

## Verificación local

Pasaron 29 pruebas dirigidas: retomar un intento pendiente antiguo; reemplazar uno rechazado o anulado en la misma solicitud; no recrear pagos confirmados; volver a comprobar el saldo; conservar órdenes con respuesta desconocida o consulta fallida; proteger creaciones concurrentes; validar identidad, moneda, evidencia de pago y cifrado del token. TypeScript y ESLint pasaron para los archivos modificados.

Next.js completó la compilación local en modo compile con una URL ficticia de base de datos, sin acceso al registro financiero de producción. No se aplicaron migraciones ni se modificaron importes, saldos o pagos reales para estas pruebas.

## Estado de publicación

Repositorio iag-lol/ZYTERON, rama fix/flow-receivable-retry. La versión activa comprobada al iniciar fue 14fd51e56e8d0a6b8347cc15855a516a6f9fdaa1. La inspección del intento real, la publicación en Render y la revisión del enlace de pago continúan pendientes: la sesión nativa del navegador presenta capturas en blanco y cambios de ventana durante las acciones. Las comprobaciones locales no acreditan que la incidencia publicada esté resuelta.
