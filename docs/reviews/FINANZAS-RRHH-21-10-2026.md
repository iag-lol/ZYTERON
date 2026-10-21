# Revisión de Finanzas y RR.HH. — 21-10-2026

Base: `iag-lol/ZYTERON`, `ecf8a5e441ad09475c3a9d75183701472f95bf95`.
Rama local: `fix/admin-finance-hr-review`.

El checkout `CONTROL ZYTERON` es otro repositorio y conserva sus modificaciones. El parche RR.HH. parte de `646a181`; la comparación contra `ecf8a5e` permite integrar sus cambios conservando la campana y comunicaciones actuales. La rama de trabajo no modifica la cola ni el procesador de mensajes de WhatsApp. No se han ejecutado ajustes financieros, trámites tributarios, cambios laborales ni migraciones o despliegues productivos.

## Correcciones de consulta

- Las cuentas por cobrar históricas AR tienen detalle por ID persistente, independientemente del límite del listado. Se identifican como obligaciones históricas, con total, pagos confirmados, saldo, vencimiento y origen. No se crean filas `invoices` ni documentos tributarios. No admiten modificaciones a través del adaptador.
- La suma histórica excluye pagos pendientes y pagos en otra moneda; los excesos se muestran para revisión, sin corregirlos automáticamente.
- Los comprobantes del libro nuevo se recuperan desde `finance-documents` por ID del pago, después de verificar permiso y cliente en servidor. El navegador no suministra una ruta de Storage. La respuesta es privada, no almacenable y sin interpretación de contenido arbitrario.
- El acceso a comprobantes históricos exige el vínculo Payment → PaymentAllocation → Receivable → Quote y el comprobante registrado en esa cotización. Los formatos históricos no compatibles requieren revisar el vínculo existente; no se exige otra subida ni se presume pérdida del archivo.
- FIFO declara que prepara una sugerencia para `invoices`. Un resultado vacío informa que no se aplicó dinero y explica la incompatibilidad con AR. Se controla doble activación en la interfaz; esto no sustituye idempotencia y bloqueo transaccional del servidor.
- La navegación entre pagos y documentos reinicia el detalle por ID. Un DTE vinculado ya enviado o emitido se bloquea antes de preparar el borrador o llamar al proveedor. Esto no detecta una emisión externa sin vínculo persistente: requiere revisión por sus identificadores oficiales, sin emitir para resolver una diferencia visual.
- RR.HH. agrupa destinos por función, separa sin datos / sin acceso / no configurado / pendiente de evidencia y corrige fuentes y navegación por persona. Los expedientes nuevos y evaluaciones no consultan listados amplios si el perfil no tiene un alcance verificado. Solicitudes muestra la limitación de Service Desk; no presenta el contador de ausencias como solicitudes.
- Consultar vacaciones calcula la proyección desde el ledger sin crear ni actualizar saldos persistidos. Ningún GET de saldo debe mutar vacaciones.

## Cruce entre libros: plan pendiente de aprobación

Estado: diseño revisable, **no implementado ni habilitado para aplicar dinero**. La corrección de consulta no implica que los libros ya estén conciliados.

### Modelo propuesto

Una tabla privada `finance_receivable_applications` representa la aplicación del movimiento existente de `public.payments` a `"Receivable"`. No crea otra fila `"Payment"`, otro movimiento bancario, otra venta ni otro documento tributario.

Campos: ID UUID; `payment_id` FK a `public.payments`; `receivable_id` FK a `"Receivable"`; cliente comercial y usuario histórico enlazados mediante `zyteron_legacy_client_link`; moneda; importe; actor autenticado; fecha; motivo; ID de solicitud y hash normalizado. Las reversiones conservan la aplicación original y registran actor, fecha, motivo y una solicitud propia. El historial no se elimina.

Una solicitud explícita contiene el ID del pago original y uno o más IDs de obligación con importes. La referencia visible, el número abreviado AR, el monto coincidente y la antigüedad no constituyen vínculos ni autorizan selección automática. Un mismo prefijo de cotización puede corresponder a varios IDs.

### Validación y atomicidad

1. Validar identidad y permiso financiero actual en servidor. No admitir roles enviados por el navegador ni ampliar la matriz de permisos.
2. Exigir pago `CONFIRMED`, cliente vinculado inequívocamente, moneda idéntica, obligación vigente y saldo verificable. Para CLP exigir enteros positivos; otras monedas requieren una política de precisión aprobada, sin conversión implícita.
3. Verificar que no exista ya el mismo movimiento representado en ambos libros. Una coincidencia por texto o monto sólo se presenta como alerta para revisión; no se fusiona.
4. Comenzar una transacción. Bloquear primero el pago y luego las obligaciones en orden estable. La ruta de aplicación histórica existente también debe participar del mismo protocolo; bloquear sólo el nuevo puente sería insuficiente.
5. Recalcular dentro de la transacción: saldo disponible del pago = bruto − devoluciones confirmadas − aplicaciones nativas vigentes − aplicaciones del puente vigentes. El contador `allocated_amount` debe equivaler a la suma de ambos tipos de aplicación, sin sumar de nuevo el puente en los reportes que ya utilizan ese contador.
6. Recalcular saldo de cada obligación = total − aplicaciones históricas de pagos confirmados y misma moneda − aplicaciones del puente vigentes respaldadas por pagos confirmados y misma moneda. Rechazar sobreaplicaciones, destinos repetidos y saldos cambiados; no truncar importes silenciosamente.
7. La clave única de solicitud liga ID, actor autorizado y hash del contenido normalizado. Mismo contenido devuelve el resultado persistido; contenido distinto con la misma clave devuelve conflicto. Escrituras, actualización de contadores y evento de auditoría se confirman juntas o se revierten juntas.
8. Reintentar sólo fallos de serialización/deadlock, con límite. Una respuesta perdida se consulta por ID de solicitud antes de reenviar. La reversión utiliza los mismos bloqueos y valida que conserve los saldos disponibles.

### Lecturas y contabilidad

Una proyección común de aplicaciones efectivas debe alimentar: `client-finance.ts`, `quote-register-data.ts`, snapshots administrativo y del portal, `collection-settings.ts`, `monthly-billing.ts`, reportes de antigüedad y detalle AR. Las lecturas SQL directas también necesitan la proyección; corregir sólo la tarjeta de cotización dejaría recordatorios o suspensión con saldos incorrectos.

Los ingresos de caja y bancos se cuentan una sola vez desde el pago original. El puente se agrega a aplicaciones y saldos, nunca a ingresos. Los reportes deben identificar el origen del movimiento y reconciliar suma aplicada con contadores de pago. Las obligaciones históricas enlazadas a una factura deben excluir una segunda representación de la misma deuda mediante ID persistente, no por monto o referencia.

No registrar otro evento/asiento `PAYMENT_RECEIVED`. Antes de contabilizar una aplicación a AR, verificar su reconocimiento en el saldo de apertura del libro contable y las cuentas correspondientes. Sin esa evidencia, bloquear la aplicación contable y solicitar revisión. No inventar un asiento de apertura ni ajustar contabilidad sólo para igualar pantallas.

### Pruebas previas y publicación

La implementación del puente debe pasar pruebas de aplicaciones parciales y múltiples, reintento tras respuesta perdida, doble clic, cliente/moneda incorrectos, solicitud alterada, pago no confirmado, reversión y dos sesiones concurrentes compitiendo por el mismo pago u obligación. Los escenarios de concurrencia deben ejecutarse contra PostgreSQL aislado; mocks no acreditan el comportamiento transaccional.

Antes de migrar producción: aprobar este modelo, completar y probar la implementación local, revisar DDL y permisos, generar un informe de conciliación de sólo lectura y aprobar el despliegue. La migración estructural no debe aplicar pagos ni hacer backfill automático. Cada lote de aplicaciones reales requiere un preview con IDs, saldos antes/después, diferencias, actor y aprobación explícita. El calendario de cuotas permanece independiente.

## RR.HH.: límites y propuesta de acceso

El puente firma `GERENTE_GENERAL`; los comandos laborales reservados a `RRHH` no funcionan con esa identidad. No se cambia el rol para eludir esta restricción. Propuesta pendiente de autorización: identidad laboral persistente por usuario, permisos explícitos por operación y alcance por persona/cliente cuando corresponda, con auditoría y revocación. Nunca aceptar un rol del encabezado del navegador.

`sourceStatus` sólo informa `PERSISTENT` o `NOT_CONFIGURED`; no devuelve configuración ni credenciales. Un directorio vacío con fuente no configurada no demuestra inexistencia de personal.

Asistencia usa `DeferredAttendanceProvider`; firma, anexos y propagación documental requieren evidencia de integración. Nómina no acredita por sí sola el cálculo integral de cotizaciones e impuestos. La presencia de un proveedor configurado o una exportación no acredita operación completa ni presentación oficial. Los procesos no se cierran para ocultar pendientes.

## Evidencia de validación local

Render mantiene `ecf8a5e` como último commit publicado y Live en el servicio `srv-d7emn6dckfvc73ekrh70`. La validación de esta revisión corresponde a código local, no a una nueva publicación.

| Comprobación | Resultado |
| --- | --- |
| Suite frontend y librerías | 354 pruebas aprobadas, incluidas 23 de RR.HH. |
| Seguridad de consultas/backend y regresión DTE | 13 pruebas aprobadas |
| Typecheck frontend | Aprobado |
| Compilación backend | Aprobada |
| Build Next completo | Aprobado con servicios y base aislados |
| Lint global configurado | 0 errores, 5 avisos existentes, igual a `ecf8a5e` |
| Lint dirigido frontend que el global excluye | 58 errores y 4 avisos; base: 62 y 4. Sin diagnósticos nuevos |
| Lint dirigido backend que el global excluye | 166 errores y 2 avisos; base: 168 y 2. Sin diagnósticos nuevos |
| Diff-check | Aprobado |

El lint global excluye `src/full-control` y `control-runtime`; por eso su resultado no acredita que esos directorios estén libres de deuda previa. La comparación dirigida usa archivo, regla y texto normalizado del diagnóstico, sin considerar cambios de línea.

Pruebas SQL: el selector real del detalle AR se ejecutó en PostgreSQL embebido aislado con IDs CUID, UUID, UUID en mayúsculas, inexistentes y entrada hostil parametrizada. No accedió a datos reales. Esto verifica la consulta; no verifica concurrencia de aplicaciones entre libros, todavía no implementadas.

Navegador local: componentes reales con API y navegación controladas de prueba. Casos: detalle AR con aplicación parcial; ausencia explícita de contrato; cambio rápido A → B con respuesta de A retrasada; Atrás/Adelante; restricciones de expediente; sugerencia vacía y doble clic; descarga de comprobante sintético con contenido comparado byte a byte. El servidor de prueba registró cero mutaciones en rutas de negocio. Esta prueba no sustituye el recorrido de Next ni la autorización y los objetos reales de producción.

La existencia y disponibilidad de comprobantes productivos deben verificarse por ID con la sesión autorizada al revisar o publicar; esta validación no afirma que esos objetos falten ni solicita reemplazarlos. Ninguna prueba utiliza pagos, personal o comprobantes reales.

Evidencia visual: `finanzas-ar-detalle-local.png`, `finanzas-comprobante-sugerencia-local.png`, `rrhh-detalle-contrato-local.png`. El entorno de captura se identifica como QA aislada con datos sintéticos.
