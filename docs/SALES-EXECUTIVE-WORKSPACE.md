# Gestión de ejecutivos de ventas

## Accesos

- Equipo: `/equipo/commercial/workspace`. Inicio de sesión con RUT y contraseña.
- Administración: `/administracion/commercial/workspace`, menú Comercial → Gestión de ejecutivos.
- Rol del ejecutivo: `EJECUTIVA_VENTAS`. Validaciones administrativas: `GERENTE_GENERAL`.

El espacio reúne contactos propios de administración y del equipo, jornada, cartera, propuestas, planes y material, informes y comisiones. Administración dispone de Nuevo contacto comercial y del filtro Contactos de administración; puede editar contactos, registrar avances y preparar propuestas con el mismo historial y etapas. Las gestiones corporativas conservan la autoridad administrativa de origen y no se atribuyen a un empleado ni generan comisión. La bandeja visible se actualiza cada 45 segundos y después de cada acción. La presentación comercial contempla empresas y organizaciones de distintos tamaños y proyectos corporativos a medida. El catálogo usa los precios publicados, con valores referenciales sin IVA y aprobación de alcance y condiciones.

## Interfaz

Encabezado compacto, colores neutros y acentos azules, indicadores operativos, filtros de responsable y período, cartera en lista, tarjetas o tablero por etapas. La portada muestra agenda y últimas actualizaciones. En móvil, las secciones se distribuyen en dos filas, los filtros y formularios se reorganizan y las filas de cartera muestran campos apilados. Las tablas de informes y el tablero mantienen desplazamiento dentro de su contenedor. Los controles admiten teclado, foco visible y preferencias de movimiento reducido.

## Flujo comercial

1. Administración o el ejecutivo registra empresa, persona, medio de contacto, necesidad y siguiente seguimiento. Puede completar RUT, giro y domicilio al preparar la facturación. El contacto se vincula a un lead propio; los registros del ejecutivo requieren revisión y los de administración quedan validados por su autoridad de origen.
2. Cada conversación registra medio, resultado, etapa y próximo contacto. Etapas: Contactado, Respondió, Interesado, En propuesta, Aceptación informada, Venta validada o No continúa.
3. Administración revisa el contacto. Aprobar sus datos no lo convierte en cliente. Los clientes ya existentes pueden incorporarse al seguimiento sin contarlos otra vez como generados.
4. El ejecutivo prepara una propuesta desde planes publicados o un alcance a medida. Declara pago único o mensual, vigencia, condiciones y precios propuestos. El servidor recalcula neto, IVA y total en pesos. Toda propuesta se crea PENDING_APPROVAL; el navegador no fija propietario ni aprobación.
5. Administración aprueba o solicita correcciones con observaciones. Un PDF pendiente conserva la indicación de borrador. El PDF aprobado se descarga después de revisar el alta del cliente.
6. El ejecutivo registra la entrega al cliente. Este registro es una declaración de gestión; el sistema no envía correos ni WhatsApp automáticamente.
7. Administración valida la aceptación y configura el cobro desde Finanzas. Si se necesita, se crea una ficha ONBOARDING con RUT para facturación; aún no cuenta como cliente generado. La aceptación comercial no demuestra recepción de dinero.
8. Con un cobro completo confirmado y respaldado, administración usa Convertir a cliente por compra confirmada. Se conserva el contacto, lead, propuestas y todo el historial; la ficha nueva pasa a ACTIVE y la gestión a Venta validada. El registro de conversión guarda autoridad, fecha y folio de respaldo; los reintentos no duplican el cliente ni sus eventos. Los abonos, aceptaciones o cobros de otra gestión no permiten convertir. Si se revierte el respaldo, el indicador deja de confirmar la compra.
9. La validación de costos y comisión del ejecutivo es independiente de la conversión. No se exige inventar un costo o una comisión para una venta corporativa. Después del cierre puede registrarse una nueva oportunidad para el mismo cliente sin contarlo dos veces.

Los informes de gestión tienen período, detalle y cliente opcional, y quedan pendientes de revisión administrativa. Gerencia consulta resultados por ejecutivo y período y exporta CSV; el ejecutivo consulta y exporta su propia gestión.

## Comisiones

Regla comercial: **15% de la utilidad, cuando el cliente pague**.

- Ingreso neto: cobro confirmado, excluido IVA.
- Utilidad: máximo entre ingreso neto menos costo neto validado y cero.
- Comisión: utilidad × 15%, redondeada a pesos.
- Ejemplo: $100.000 netos cobrados − $40.000 de costos = $60.000 de utilidad; comisión $9.000.

Las fuentes son cuotas completas pagadas con factura de respaldo o facturas con aplicaciones no revertidas de pagos CONFIRMED. Se excluyen abonos incompletos, facturas anuladas, créditos y registros sin respaldo suficiente. Si el mismo folio aparece en calendario y facturación, se usa una sola fuente. Las cuotas mensuales se validan por cobro y no sobre ingresos futuros.

Cada fuente admite una sola validación de utilidad. Los reintentos conservan el registro original; no modifican costos ya validados. Si el cobro deja de ser válido, la comisión aparece en revisión y se excluye del total ganado. El cálculo no registra una transferencia ni declara pagada la comisión al ejecutivo.

Los costos y la utilidad detallada quedan reservados a administración. El PDF descargado por un ejecutivo omite los datos bancarios configurados para administración. El ejecutivo recibe únicamente su comisión, propuesta vinculada, fecha y estado.

## Aislamiento y trazabilidad

- La identidad procede de la sesión verificada; los encabezados de rol del navegador no otorgan autoridad.
- La API de equipo y el guardián global restringen EJECUTIVA_VENTAS al dominio sales-workspace. No se habilitan controladores empresariales anteriores por permisos históricos.
- Los filtros de propietario se fijan desde la identidad. Los IDs de otro ejecutivo no permiten lectura, edición, actividades, informes o propuestas.
- Las nuevas tablas, vistas y RPC no tienen acceso directo para anon ni authenticated. Una política restrictiva impide al JWT del ejecutivo consultar directamente tablas internas con RLS, aunque exista una política permisiva anterior.
- Las mutaciones se ejecutan en una transacción; las solicitudes de creación tienen clave idempotente. Las propuestas se vinculan al cliente y propietario del registro; esos valores no se aceptan del formulario.
- Altas, seguimientos, propuestas, revisiones e informes conservan actor, fecha y observaciones. Validar un alta o propuesta revisa también su evento de origen; las gestiones del ejecutivo se revisan individualmente.
- La lectura pagina hasta 10.000 registros y comunica el límite de consulta; los indicadores no se calculan sobre una primera página silenciosamente truncada.
- El CSV protege celdas que pueden interpretarse como fórmulas. Las fechas se presentan como dd-mm-aaaa y horas de Chile en formato de 24 horas.

## Implementación y operación

Backend: `control-runtime/src/sales-workspace/`. Interfaz: `src/full-control/components/commercial/sales-*`. Migraciones: `20261122100000_sales_executive_workspace.sql` y `20261122110000_admin_sales_prospects.sql`, incluidas en el arranque transaccional existente.

`node --import tsx scripts/sync-sales-plans.ts` actualiza el catálogo derivado de `src/config/pricing.ts`; el comando prebuild mantiene la misma fuente de precios que el sitio público.

Las verificaciones locales usan datos sintéticos y no crean clientes, cotizaciones, cobros ni comisiones productivas. La verificación del despliegue se registra por separado, con commit, estado activo y comprobación en la interfaz.
