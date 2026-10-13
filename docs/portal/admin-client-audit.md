# Revisión de administración y portal cliente — 13 octubre 2026

Se recorrieron las 215 rutas distintas de navegación. Un recorrido de lectura no certifica una mutación, una entrega externa o una operación financiera. El inventario y los resultados están en `admin-page-inventory.json`, `admin-ui-audit.json` y `admin-api-audit.json`.

Correcciones: proyectos de la web gestionables en el mismo registro operativo; publicación explícita y aislamiento entre clientes; mensajes de administración visibles en asistencia del cliente, con notificación y auditoría atómicas e idempotencia; resumen de contratos aprobados/fijados; páginas de actividad/notificaciones/informes con fuentes reales, búsqueda y CSV; orden de tickets; enlaces seguros; permisos de módulos aplicados por RLS y comprobados también antes de checkout/PDF; descargas documentales sólo publicadas con escaneo completado. Se retiró el acceso al RPC antiguo que creaba ventas sin pago.

No se creó otra base, no se inventaron órdenes de trabajo/ventas para migrar proyectos y no se envió comunicación a clientes como prueba. Se conservaron los registros y su visibilidad previa. El modo interno de un proyecto impide que se consulte también por su fila nativa.

Validación: 370 pruebas del núcleo actual usando los casos originales y el adaptador local de resolución (se excluye la suite comercial heredada que exige una venta sin fondos; el flujo comercial actualizado se verifica en transacción). 284 pruebas de la web. Comprobaciones transaccionales: 16 puente de proyectos, 29 permisos/contratos, 8 comunicación, 27 publicaciones y 19 comercial. Los ensayos se revierten y no prueban tarjetas ni entregas externas.

Conexiones al cliente: proyectos publicados, servicios visibles, documentos publicados, respuestas públicas de soporte (notas internas excluidas), comunicaciones/notificaciones, agenda publicada, monitoreo publicado, resúmenes contractuales publicados y los cobros/comprobantes de su propio libro. RR. HH., seguridad, contabilidad interna y borradores permanecen administrativos.

Límites: la autorización y prueba mensual de Sandbox permanecen pendientes por decisión del dueño. Firma electrónica, escaneo/otros proveedores que la propia pantalla marca no configurados permanecen bloqueados; no se declaran firmas, archivos limpios ni emisiones tributarias ficticias. Las acciones legales/financieras y cambios de identidades reales no se ejecutan sobre clientes como QA. Los comprobantes PDF son de pago, no boletas fiscales.

Migraciones aplicadas en la base existente: 20261013060325, 20261013061603, 20261013062505, 20261013065816. Registro privado con SHA-256 en `zyteron_admin_client_migrations`, sin lectura pública.

Publicado y verificado: commit b6138df, Render dep-db6u65nf3r2c73ci5mbg (Live; 3m46s). 45 APIs de lectura respondieron 200. Se abrió Proyecto 360° de un proyecto web y se comprobaron sus acciones, relaciones y visibilidad; ficha de cliente con comunicación e historial real; informes con registros. La sesión del cliente había expirado y la vista pública exigió inicio de sesión: queda pendiente repetir su recorrido gráfico en Live con sesión del dueño. El comportamiento/aislamiento se verificó en las transacciones anteriores. Se añade una corrección visual menor en botones y fechas civiles de contratos para el despliegue final.
