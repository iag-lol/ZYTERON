# Publicación, seguimiento y contenido

## Estado de publicación

Servicio `ZYTERON`, workspace `My Workspace` (`tea-cvcnlb52ng1s7390ia4g`), servicio `srv-d7emn6dckfvc73ekrh70`. [Panel de Render](https://dashboard.render.com/web/srv-d7emn6dckfvc73ekrh70). Repositorio `iag-lol/ZYTERON`, rama `main`, despliegue automático desactivado.

El rediseño quedó operativo el 08-11-2026 a las 06:54 (Chile), commit `7468934`, despliegue `dep-dbo4c767bikc73fucheg`. La revisión `58249de` quedó operativa a las 07:00, despliegue `dep-dbo4fcu7bikc73fujs3g`; excluye el dominio de Render del registro interno de visitas. La publicación conserva dominio, 80 rutas del sitemap, esquema de datos, comandos de arranque y configuración de integraciones. No hubo sustitución de variables privadas ni migración de base.

Las plantillas se comprobaron primero en localhost y después en producción: 84 destinos rastreados, 40 vistas con el CMS real y 16 controles de endpoints. Las pruebas locales de formularios interceptan envíos; las pruebas públicas rechazan entradas antes de persistir. Estos controles no equivalen a recibir una solicitud válida y su aviso en la bandeja comercial real.

El archivo fuente de la versión anterior, el parche reversible y el HTML previo están en `output/redesign-08-11-2026/rollback/`, excluidos de Git. Se verificó la aplicación inversa del parche y la integridad de tres archivos del archivo fuente. El respaldo privado de datos/configuración y una restauración completa siguen sin ejecutarse: la clave SSH disponible fue rechazada. La reversión de código no sustituye esos respaldos.

## Comprobaciones con acceso privado

1. Usar preproducción autenticada, no indexable y con receptores de prueba; validar solicitud web y sistemas: registro, visibilidad comercial, aviso, confirmación, error de base, fallo de proveedor y reintento.
2. Comprobar portal, calificación y tablero con cuentas autorizadas. Los accesos anónimos y la protección de origen ya se verificaron; no se ejecutaron cobros reales.
3. Configurar `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` únicamente con una propiedad verificada de Zyteron. Validar DebugView/Tag Assistant, deduplicación en GTM, exclusión de entornos privados y ausencia de texto personal.
4. Exportar el respaldo privado de datos/configuración y probar su restauración en un entorno separado. Mantener los archivos fuera de Git y con acceso restringido.
5. Comprobar `SELECT to_regclass('public."WebVisit"');` en la base correcta de Supabase. Tras el respaldo, aplicar `supabase/web_visit_storage.sql` y verificar la lectura del backend y una visita controlada. El SQL está probado localmente, pero no aplicado. No hay respaldo ni recuperación de visitas que nunca se almacenaron.

Para próximas publicaciones: confirmar commit y servicio, conservar una versión recuperable, ejecutar las pruebas pertinentes, desplegar manualmente desde `main`, esperar estado `live` y verificar HTTP, recepción y contenido. La aceptación visual local por plantillas no equivale a una prueba A/B ni a resultados comerciales.

## Reversión

Restaurar el artefacto anterior de la capa afectada si falla la recepción, aparecen 5xx generalizados o se publican directivas SEO incorrectas. Mantener compatibilidad con los metadatos opcionales nuevos: no hay cambio de esquema requerido para este bloque. Conservar las solicitudes recibidas y los registros comerciales. La reversión de código no deshace correos, pagos, cambios externos ni datos.

La integración usa la rama `codex/zyteron-redesign-20261108`, en `../zyteron-redesign`, basada en el commit publicado `5757490`. La carpeta original estaba desactualizada y no es una base apta para desplegar. Su punto de partida y parche previo están copiados en `output/redesign-08-11-2026/rollback/`; la copia adicional original permanece en `/tmp/zyteron-rediseno-08112026/`. No usar `git reset --hard` ni restaurar indiscriminadamente el árbol actual. Los archivos existentes ajenos al rediseño deben conservarse.

## Seguimiento después de la salida

| Fecha de control (Chile) | Control | Responsable funcional |
| --- | --- | --- |
| 08-11-2026 | HTTP, canonical, sitemap, noindex, versión y capturas comprobados; recepción válida y avisos con acceso privado pendientes | Desarrollo y comercial |
| 09-11-2026 y 11-11-2026 | Recepción efectiva, errores, fallos de proveedor y contacto de pendientes | Operaciones comerciales |
| 15-11-2026, 22-11-2026 y 06-12-2026 | Cohortes comparables, solicitudes/sesión elegible, abandono por paso, errores y primera respuesta; consultas y URL | Analítica y comercial |
| 08-12-2026, 07-01-2027 y 06-02-2027 | Oportunidades, propuestas, ventas, valor, margen disponible y decisiones editoriales | Dirección comercial |

Estas revisiones están definidas; no constituyen un monitoreo programado ni resultados ya obtenidos. Comparar 7 y 28 días completos con los mismos días de semana y, cuando haya datos válidos, el año anterior. Conservar anotaciones del 23-09-2026 y 02-11-2026. No revertir por una caída porcentual aislada con pocos clics.

Objetivos de campo: LCP ≤ 2,5 s; INP ≤ 200 ms; CLS ≤ 0,1 en p75, por móvil y escritorio. Ausencia de muestra CrUX/GA4 se registra como falta de medición. Una prueba local sin emulación no equivale al rendimiento móvil real ni a una puntuación PageSpeed.

## Programa editorial y distribución

| Periodo | Activo y condición de publicación | Destino comercial |
| --- | --- | --- |
| Semanas 1–2 | Fenice/Eliana y comparativas: revisión inicial implementada. Verificar pantallas, fecha y permisos del CMS en preproducción. | Web corporativa / sistemas y diagnóstico |
| Semanas 3–4 | Actualizar guía de precios y catálogo frente a carrito: catálogo vigente, renovaciones, comisiones y tarea de demo. Validación comercial de cantidades y alcance. | Planes, calculadora, catálogo/ecommerce |
| Semanas 5–6 | Documentar una integración real con estado inicial, roles, pantallas autorizadas y resultado comprobable. Sin inventar tiempo ahorrado. | Sistemas y automatización |
| Semanas 7–8 | Ampliar un rubro con caso propio y margen comprobado. Revisar WordPress frente a desarrollo a medida con mantenimiento, titularidad, licencias y migración. | Ruta sectorial existente / desarrollo |

Cada pieza exige intención propia, fuente, responsable de actualización y siguiente paso. La elección del rubro depende de rentabilidad y evidencia, aún no de una preferencia supuesta. Preparar difusión en LinkedIn y alianzas desde los casos publicados. Pedir reseñas auténticas a clientes con experiencia real; no comprar enlaces ni reseñas ni crear otra ficha local.

## Search Console y GA4

Cuando la conexión exponga Zyteron: exportar hasta 16 meses disponibles de Search Console por fecha, consulta, página, dispositivo y país; separar marca/no marca. Exportar 90 días de GA4 por sesión elegible, ruta, dispositivo y recorrido. Guardar los extractos originales y la zona horaria de cada fuente. No inferir tráfico cero del resultado vacío de un conector que todavía lista otra propiedad.

Validar si el informe de impresiones de IA está disponible para esta propiedad. No atribuir a IA ventas sin seguimiento. Confirmar Google Business y modalidad de atención antes de enlazar una ficha; una búsqueda de la dirección no acredita verificación.

## Recuperación del código

Versión previa al rediseño: `57574903c95dbf6595ae2084eb020e32a3413ffd`, despliegue `dep-dbo2ovm417fc73f4fskg`. El archivo `rollback/production-5757490.tar.gz` conserva su fuente. El SHA-256 y el resultado del ensayo de parche constan en `rollback/verification.json`.

En caso de incidente, seleccionar el artefacto anterior en Render si sigue retenido; comprobar que termina en `live` y repetir los controles públicos. Si el artefacto ya no está disponible, revertir el cambio de código mediante un commit normal sobre `main` y desplegar esa revisión. Evitar force push y cambios de esquema. Mantener las solicitudes y ventas recibidas después de la salida. La recuperación de configuración o datos se realiza mediante sus propios respaldos y no forma parte del ensayo de código efectuado.

El checkout original del IDE contiene trabajo previo sin commit y está conservado. La copia de integración en `../zyteron-redesign` corresponde a la línea publicada. No desplegar la copia antigua ni sobrescribir indiscriminadamente sus cambios.
