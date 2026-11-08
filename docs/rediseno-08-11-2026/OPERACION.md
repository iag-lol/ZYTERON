# Publicación, seguimiento y contenido

## Condiciones de salida

1. Servicio identificado: `ZYTERON`, workspace `My Workspace` (`tea-cvcnlb52ng1s7390ia4g`), servicio `srv-d7emn6dckfvc73ekrh70`. Panel: https://dashboard.render.com/web/srv-d7emn6dckfvc73ekrh70. Repositorio `iag-lol/ZYTERON`, rama `main`, despliegue automático desactivado. Versión publicada comprobada: `57574903c95dbf6595ae2084eb020e32a3413ffd`, despliegue `dep-dbo2ovm417fc73f4fskg` del 08-11-2026 a las 05:05 (Chile). Volver a verificar estos identificadores inmediatamente antes de publicar.
2. Guardar respaldo de base de datos, configuración privada y artefacto anterior recuperable. El respaldo de código local no sustituye esos respaldos. El estado Git previo y la copia de archivos están en `/tmp/zyteron-rediseno-08112026/`; trasladar a almacenamiento duradero antes de depender de ellos.
3. Usar preproducción con autenticación, `noindex` y datos controlados. La instancia local se vincula a loopback. No indexar variantes del diseño bajo nuevas rutas públicas.
4. Configurar CMS, PostgreSQL y receptores de prueba. Validar solicitud web y solicitud sistemas: registro, visibilidad en administración, aviso real, confirmación, error de base, fallo de proveedor y reintento. Verificar además acceso de clientes, permisos y pagos existentes con cuentas de prueba; no ejecutar cobros reales.
5. Configurar `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` con la propiedad verificada de Zyteron. Revisar en GTM que no haya una segunda emisión de `generate_lead` o conversión por el mismo formulario. Validar DebugView/Tag Assistant y excluir entornos y áreas privadas. No publicar etiquetas de envío automático de formularios que capturen texto o parámetros personales.
6. Ejecutar pruebas y rastreo contra el inventario guardado. Corregir 5xx, canonical/noindex accidentales, pérdida de URL y fallos de formulario antes de salir.
7. Publicar primero fricciones y medición; después el conjunto visual de plantillas representativas. Registrar commit, fecha y hora de cada salida. Verificar el despliegue que llega a estado operativo y su comportamiento público.

## Reversión

Restaurar el artefacto anterior de la capa afectada si falla la recepción, aparecen 5xx generalizados o se publican directivas SEO incorrectas. Mantener compatibilidad con los metadatos opcionales nuevos: no hay cambio de esquema requerido para este bloque. Conservar las solicitudes recibidas y los registros comerciales. La reversión de código no deshace correos, pagos, cambios externos ni datos.

La integración usa la rama `codex/zyteron-redesign-20261108`, en `../zyteron-redesign`, basada en el commit publicado `5757490`. La carpeta original estaba desactualizada y no es una base apta para desplegar. Su punto de partida consta en `/tmp/zyteron-rediseno-08112026/git-head.txt`; los cambios previos sin commit están guardados en `tracked-before.patch` y `before/`. No usar `git reset --hard` ni restaurar indiscriminadamente el árbol actual. Los archivos existentes ajenos al rediseño deben conservarse.

## Seguimiento después de la salida

| Momento desde publicación | Control | Responsable funcional |
| --- | --- | --- |
| Salida | HTTP, canonical, sitemap, noindex, dos solicitudes controladas y avisos; versión y capturas | Desarrollo y comercial |
| 24 y 72 horas | Recepción efectiva, errores, fallos de proveedor y contacto de pendientes | Operaciones comerciales |
| 7, 14 y 28 días | Cohortes comparables, solicitudes/sesión elegible, abandono por paso, errores y primera respuesta; consultas y URL | Analítica y comercial |
| 30, 60 y 90 días | Oportunidades, propuestas, ventas, valor, margen disponible y decisiones editoriales | Dirección comercial |

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

## Preparación de la publicación

La rama de integración conserva el comando de construcción del runtime y el arranque conectado de Render. La modificación no requiere una migración nueva. Las primeras verificaciones deben ejecutarse contra un clon de la configuración de producción con receptores de prueba y datos autorizados; los sustitutos de CMS vacíos sirven exclusivamente para compilar y revisar las plantillas estáticas.

El despliegue de Render está conectado a `main` y es manual. Subir la rama de revisión no publica el sitio. No cambiar la rama del servicio ni usar «Deploy latest commit» hasta verificar la versión que se va a publicar, el respaldo y las condiciones de salida. El checkout original y sus cambios sin commit quedan conservados.
