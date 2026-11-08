# Verificación del rediseño

Fecha: 08-11-2026. Base: `57574903c95dbf6595ae2084eb020e32a3413ffd`, correspondiente al servicio ZYTERON de Render. Rama de integración: `codex/zyteron-redesign-20261108`.

Sitio publicado: https://www.zyteron.cl. Primer despliegue: `dep-dbo4c767bikc73fucheg`, commit `7468934`, estado `live` el 08-11-2026 a las 06:54 (Chile).

Revisión final publicada: `58249de`, despliegue `dep-dbo4fcu7bikc73fujs3g`, estado `live` el 08-11-2026 a las 07:00 (Chile). La segunda revisión excluye visitas internas desde dominios de prueba.

## Resultado técnico

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| Pruebas del sitio | 528 aprobadas | Casos existentes y aceptación de contexto, oferta, fechas, privacidad e idempotencia del navegador. |
| Recepción de formularios | 6 aprobadas | Rutas reales, SQL de idempotencia en PostgreSQL embebido; doble envío, contenido modificado, transacción cotización/lead, rollback, reintento, fallo de aviso y entradas inválidas. |
| Calificación y medición comercial | 5 aprobadas | Actualización de un solo lead, cuatro criterios, reintentos, registros cerrados, período chileno con cambio de hora, deduplicación de ventas y separación de monedas. |
| Compilación | Aprobada | Runtime comercial y Next.js 16.4.3. Compilación local con CMS vacío y compilación de Render con la configuración real aprobadas. |
| TypeScript | Sin errores | Árbol de integración completo. |
| ESLint | Sin errores en archivos públicos modificados y componentes comerciales nuevos | El proyecto excluye el runtime y el árbol administrativo original del lint general; la compilación comprueba sus tipos. |
| Interfaz pública | 32 combinaciones | Ocho rutas a 360, 390, 430 y 1440 px; encabezado, contenido y pie de página, desbordamientos, errores del navegador y axe WCAG A/AA. |
| Asistente móvil | Aprobado a 390 px | Apertura, etiqueta del mensaje, cierre con Escape y ausencia de errores axe; la vista previa no carga etiquetas externas. |
| Cotizador | 14 estados | Siete pasos en móvil y escritorio; validación, fallo de red, conservación de respuestas, reintento y una conversión con el ID real del lead. |
| Inventario antes/después | 80 rutas del sitemap y 4 controles adicionales | CMS real; cero incidencias, ninguna ruta perdida y mismas canonicals. Cambios editoriales deliberados en dos comparativas, casos y demos. |
| Interfaz de producción | 40 combinaciones aprobadas | Diez rutas a 360, 390, 430 y 1440 px, incluidos Fenice y Eliana; cero desbordamientos, imágenes rotas, errores de navegador o infracciones axe detectadas. |
| Endpoints de producción | 16 controles aprobados | Salud HTTP, rechazo de entradas inválidas/grandes, protección de origen, acceso anónimo denegado y noindex en accesos privados. No crean leads ni envían avisos. |
| Privacidad de producción | 4 controles aprobados | Parámetros de URL excluidos de eventos; sin etiquetas ni visitas internas en administración, clientes y dominio Render. |
| Reparación de almacenamiento de visitas | SQL preparado y prueba local aprobada | Ejecución idempotente, permisos exclusivos del backend y denegación de lectura/escritura a anon/authenticated. No aplicado en producción. |
| Grafo de código | Actualizado con AST | Referencias estructurales locales; no análisis semántico de todo el material editorial. |

Las pruebas automatizadas no demuestran ausencia absoluta de errores. La revisión de accesibilidad no sustituye una evaluación manual completa con tecnologías de asistencia. Las pruebas de recepción no envían correo, WhatsApp ni solicitudes a producción.

## Reproducción local

Requisitos: Node.js 24, dependencias del proyecto y Google Chrome disponible para Playwright.

```sh
npm ci
npm test
npm run test:reception
npm run test:commercial-measurement
node scripts/test-web-visit-storage.mjs
```

Para compilar sin acceso al CMS real, iniciar en otra terminal `node scripts/qa-cms-fixture.mjs`. Este servidor escucha exclusivamente en `127.0.0.1:3199`, acepta solo lecturas y devuelve colecciones vacías. Definir `ZYTERON_QA_CMS_KEY` con una credencial sintética local compatible con el validador administrativo. Ese valor de prueba no se versiona y no da acceso a ningún servicio real.

```sh
DATABASE_URL='postgresql://localhost:5432/zyteron_preview' \
SUPABASE_URL='http://127.0.0.1:3199' \
SUPABASE_SERVICE_ROLE_KEY="$ZYTERON_QA_CMS_KEY" \
npm run build
```

Con las mismas variables, ejecutar `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3102`. Este arranque sirve para revisar la interfaz pública; `npm start` conserva el arranque conectado de Render y requiere su configuración completa.

```sh
node scripts/qa-public-site.mjs http://127.0.0.1:3102
node scripts/qa-quote-journey.mjs http://127.0.0.1:3102
node scripts/measure-public-pages.mjs http://127.0.0.1:3102
node scripts/audit-public-site.mjs https://www.zyteron.cl output/redesign-08-11-2026/published output/redesign-08-11-2026/evidence/inventory-before.json
node scripts/qa-published-site.mjs
node scripts/verify-published-endpoints.mjs
node scripts/verify-published-privacy.mjs
```

Las pruebas de envío válido solo admiten localhost. Los POST del navegador se interceptan; las pruebas de rutas usan PostgreSQL embebido y adaptadores locales para correo y CRM. Los controles HTTP de producción solo envían entradas que las rutas rechazan antes de cualquier escritura. La medición de rendimiento bloquea etiquetas externas y escrituras. Ejecutarla sin las otras suites de navegador en paralelo.

## Evidencias

- `output/redesign-08-11-2026/qa/results.json`: resultados y capturas de páginas públicas.
- `output/redesign-08-11-2026/quote/results.json`: recorrido del cotizador.
- `output/redesign-08-11-2026/performance/measurements.json`: muestras de laboratorio, sin emulación de red ni CPU.
- `output/redesign-08-11-2026/evidence/`: inventario anterior y registros de comprobación.
- `output/redesign-08-11-2026/published/`: HTML, sitemap, inventario y comparación de metadatos después de publicar.
- `output/redesign-08-11-2026/published-ui/`: 40 vistas con CMS real y capturas.
- `output/redesign-08-11-2026/published-endpoints/`: 16 controles públicos de seguridad y recepción inválida.
- `output/redesign-08-11-2026/published-privacy/`: parámetros saneados y exclusión de áreas privadas/Render.
- `output/redesign-08-11-2026/rollback/`: archivo fuente de `5757490`, parche reversible, HTML anterior y comprobación de integridad.

Las evidencias locales están excluidas de Git; los scripts y este informe están versionados. Las mediciones de localhost y producción no son directamente comparables por red, caché y contenido del CMS. No se declara mejora porcentual de velocidad ni cumplimiento de Core Web Vitals de campo.

## Condiciones externas pendientes

La conexión de Windsor.ai consultada sigue mostrando únicamente `sc-domain:denurvia.cl`; no expone Search Console ni GA4 de Zyteron. Faltan datos históricos, verificación de etiquetas, sesiones elegibles y atribución. Google Business no tiene verificación confirmada.

Pendiente con acceso privado: comprobar recepción persistente y entrega real de avisos a receptores de prueba, recorrido autenticado de clientes y comercial, respaldo de base/configuración y ensayo completo de restauración. La conexión SSH disponible devuelve `Permission denied (publickey)`. Las comprobaciones anónimas sí verifican que las áreas y APIs privadas no entregan datos sin autenticación.

El rediseño está publicado. La copia original del IDE está conservada; la integración sobre la versión vigente se encuentra en `../zyteron-redesign`. No desplegar la copia antigua. La versión previa `5757490` y el despliegue `dep-dbo2ovm417fc73f4fskg` están identificados para recuperación. La aplicación inversa del parche y tres archivos del archivo fuente se comprobaron localmente; no se ejecutó una reversión de producción ni una restauración de datos.

## Incidencia de almacenamiento de visitas

Los logs de Render registraron tres errores `PGRST205` entre las 06:56 y las 06:57 del 08-11-2026: `public.WebVisit` no estaba disponible en la caché de esquema de Supabase. El contador de visitas internas no se considera operativo. No se atribuyen esos errores al rediseño sin comprobar el estado previo de la base.

`supabase/web_visit_storage.sql` crea la tabla si falta, habilita RLS, limita el acceso a `service_role` y solicita recarga de esquema. La prueba `scripts/test-web-visit-storage.mjs` verifica ejecución repetida, persistencia y rechazo de anon/authenticated. El SQL no se ejecutó contra producción: falta una conexión SQL autorizada. No ejecutar el esquema administrativo completo como sustituto de esta reparación puntual.

## Rendimiento observado en producción

Comparación de 18 muestras anteriores y 18 posteriores, con el mismo script y navegador, sin emulación de red/CPU, caché del navegador vacía y etiquetas Google bloqueadas. Cada celda LCP es la mediana de tres cargas; no representa p75 de campo ni INP. Los tiempos de red y la caché de servidor pueden variar entre mediciones.

| Ancho | Página | LCP anterior / posterior | HTML anterior / posterior |
| --- | --- | --- | --- |
| 390 px | `/` | 0,96 s / 0,77 s | 451.796 / 158.961 bytes |
| 390 px | `/planes` | 0,99 s / 0,65 s | 672.890 / 623.726 bytes |
| 390 px | `/contacto` | 1,02 s / 0,71 s | 110.656 / 96.644 bytes |
| 1440 px | `/` | 0,73 s / 0,58 s | 451.796 / 158.961 bytes |
| 1440 px | `/planes` | 0,68 s / 0,66 s | 672.890 / 623.726 bytes |
| 1440 px | `/contacto` | 0,83 s / 0,67 s | 110.656 / 96.644 bytes |

El CLS máximo posterior fue 0,0139. La comparación completa está en `output/redesign-08-11-2026/published-performance/comparison.json`. Estos resultados no acreditan crecimiento comercial ni cumplimiento de Core Web Vitals de campo.
