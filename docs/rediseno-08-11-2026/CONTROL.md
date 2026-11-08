# Rediseño y captación comercial de Zyteron

Fecha de corte: 08-11-2026. Documento rector: `Zyteron-auditoria-y-plan-de-rediseno-08-11-2026.pdf`.

Estado: implementación local con pruebas automatizadas. La publicación, los datos de analítica, la entrega real de avisos y los resultados comerciales requieren las comprobaciones externas indicadas abajo. No hay cifras de crecimiento atribuibles al rediseño.

## Cobertura por sección

| Sección | Implementación y evidencia | Condición pendiente |
| --- | --- | --- |
| 1. Objetivo y recorridos | Portada con web/ecommerce y sistemas/automatización; CTA contextual; `service_line` compartido en formularios y eventos. | Comparar oportunidades y ventas después de publicar. |
| 2. Línea base | Rastreo público de 80 URL del sitemap y cuatro comprobaciones adicionales. HTML, títulos, H1, canonical, JSON-LD, enlaces y estado HTTP registrados. 80 decisiones «conservar» en `inventario-url.csv`. | Enriquecer con Search Console, GA4, enlaces externos y registros del servidor. El sitemap no representa todo el tráfico histórico. |
| 3. Fricciones | Siete pasos coherentes; contexto `tipo=sistema` y `servicio`; asistente sin burbuja automática ni presencia en contacto/cotizador/Becas; recepción con ID persistente, reintentos y referencia; fechas de Becas controladas en página y APIs. | Prueba de recepción con la base y configuración reales de preproducción; comprobar bandeja comercial real. Los adaptadores locales no acreditan entrega externa. |
| 4. Arquitectura y diseño | Navegación simplificada; portada con dos recorridos, casos publicados, precios, condiciones, proceso, FAQ y formulario; revisión a 360, 390, 430 y 1440 px; contraste, etiquetas, foco y tablas accesibles. | Verificación visual de los casos y reseñas alimentados por el CMS real. |
| 5. Oferta | Catálogo compartido; Catálogo WhatsApp con importe existente; plazos coherentes; IVA, coste inicial, mantenimiento y terceros separados; planes llevan al formulario con contexto. Becas vencidas no aceptan postulaciones. | Revisión comercial de capacidad, licencias y condiciones particulares antes de cada contrato. |
| 6. Páginas comerciales | Bloque de alcance, coste, condiciones y CTA en plantillas de servicios, sectores y sistemas; se conservan las dos intenciones de Santiago y todas las rutas. | Priorizar por rentabilidad y datos reales, sin fusionar por similitud textual. |
| 7. Contenido y evidencia | Fenice y Eliana enlazados desde recorridos pertinentes, fecha y evidencia cualitativa; comparativas con títulos/intenciones distintos; demo de búsqueda, selección y preparación de pedido ficticio, sin cobros ni envíos. | Programa editorial de ocho semanas en `OPERACION.md`; nuevas pantallas, testimonios y resultados requieren evidencia y permisos. |
| 8. Diferenciación | Captación conectada con operación, trabajos publicados, costes claros y demostración de tarea. Referencias contrastadas en `FUENTES.md`. | Difusión en LinkedIn, alianzas y solicitud de reseñas auténticas: acciones comerciales posteriores. No se han enviado mensajes ni publicado piezas externas. |
| 9. SEO técnico e IA | Mismas rutas; HTML inicial, canonicals y metadatos; sin redirecciones nuevas; sitemap con fechas reales; protección de áreas privadas conservada. FAQ visible sin promesa de rich result; sin archivos especiales de IA. | Repetir inventario completo con CMS disponible antes y después de publicar. No se acredita posicionamiento ni menciones de IA. |
| 10. Identidad y rendimiento | Datos confirmados: inicio 2019, equipo 25, Antonio Bellet 193 y reuniones coordinadas. Imágenes dimensionadas, hero con precarga, menos animación y catálogo de adicionales sin duplicar HTML móvil/escritorio. Instrumentación de LCP/INP/CLS. | Google Business sigue sin verificación confirmada. La medición de laboratorio no acredita p75 de campo; se requiere muestra real. |
| 11. Medición comercial | Eventos de interés separados de recepción; `generate_lead` solo con ID confirmado; deduplicación; lista de parámetros sin datos personales. Calificación con cuatro criterios en el CRM vigente. Tablero de 7 y 28 días en `/administracion/commercial`, con fuente registrada, solicitudes, oportunidades, propuestas enviadas y ventas reales separadas por moneda. | Propiedad GA4, reglas GTM y datos Search Console de Zyteron; atribución asistida, margen y denominadores de sesión. El conector consultado aún lista Denurvia; una consulta sin filas de Zyteron no prueba ausencia de tráfico. |
| 12. Publicación y reversión | Copia de trabajo previa, inventario y HTML; scripts repetibles de aceptación; plan de salida por etapas y reversión en `OPERACION.md`. No se ejecutaron migraciones destructivas. | Servicio y versión vigente identificados. Faltan respaldo de base y configuración, ensayo de reversión y publicación gradual. |
| 13. Fases y responsables | Bloques de código, contenido, medición y verificación documentados; dependencias explícitas. Sin cambio de dominio ni stack, sin páginas masivas ni cifras inventadas. | Calendario comercial y revisiones posteriores a 30, 60 y 90 días. |
| 14. Aceptación | Pruebas de UI, recepción, permisos de calificación, catálogo, privacidad y fechas; comandos y resultados en `VERIFICACION.md`. | Cierre integral en entorno con datos y servicios reales. No debe marcarse 100 % operativo con dependencias pendientes. |

## Datos comerciales y privacidad

La calificación exige ajuste al servicio, necesidad confirmada, viabilidad de alcance/plazo/presupuesto y un siguiente paso acordado. El CRM conserva el contexto anterior y registra `LEAD_QUALIFIED`, con la equivalencia de medición `qualify_lead` y parámetros controlados. Los reintentos dentro del proceso no repiten la transición; el tablero deduplica por identificador de lead y período. No se afirma garantía transaccional entre la actualización y la publicación del evento comercial: ese mecanismo preexistente requiere comprobación operacional.

El tablero consulta las tablas comerciales vigentes, pagina los resultados y separa las monedas CLP, UF y USD. Cuenta ventas `WON` por ID y fecha de cierre; una propuesta aceptada no crea una venta analítica ni confirma un pago. Las fuentes `WEB`, `CONTACTO_WEB`, `COTIZADOR_WEB`, `CHAT_IA` y `WEB_ZYTERON` se muestran como fuente web registrada; esto no implica atribución orgánica ni asistida. Los registros sin vínculo verificable permanecen sin atribución web.

Los períodos son 7 o 28 días completos en America/Santiago, comparados con el período inmediatamente anterior. Los conteos se basan en la fecha de cada etapa y no constituyen tasas de conversión de una misma cohorte. Sesiones, clics orgánicos no de marca, primera respuesta y margen requieren fuentes adicionales; no se representan como cero. El endpoint de medición está limitado a gerencia y responsables comerciales y devuelve agregados sin contactos ni texto libre.

La recepción conserva la transacción de PostgreSQL de la versión vigente. Las migraciones existentes conectan el lead web al CRM y crean el evento de aviso mediante triggers. La entrega usa la cola persistente de comunicaciones existente. Las pruebas locales comprueban el SQL de idempotencia y la transacción de recepción en PostgreSQL embebido; no acreditan que los triggers y destinatarios estén configurados en producción. Los errores al enriquecer un aviso se registran sin datos personales en logs del servidor.

La activación de GA4 y la correspondencia de ventas con `close_convert_lead` permanecen condicionadas a verificar propiedad, deduplicación y atribución. No hay envío de eventos comerciales a una propiedad desconocida ni cambios en las liquidaciones financieras.

## Gestión de contenido existente

Las correcciones de las dos comparativas se aplican a las versiones publicadas anteriores al corte editorial. Una edición posterior del CMS tiene prioridad. Se mantienen los slugs y las canonicals; la fecha modificada corresponde al cambio editorial real. Las futuras correcciones deben incorporarse al CMS y retirar el adaptador cuando las versiones se hayan reconciliado.

Los casos usan únicamente contenido e imágenes que el CMS ya marca como publicados. Los resultados se describen de forma cualitativa cuando no existe periodo y fuente de medición. La demo interactiva no presenta productos de clientes ni ejecuta pagos o mensajes.
