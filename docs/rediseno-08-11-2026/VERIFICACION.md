# Verificación del rediseño

Fecha: 08-11-2026. Base: `57574903c95dbf6595ae2084eb020e32a3413ffd`, correspondiente al servicio ZYTERON de Render. Rama de integración: `codex/zyteron-redesign-20261108`.

## Resultado técnico

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| Pruebas del sitio | 528 aprobadas | Casos existentes y aceptación de contexto, oferta, fechas, privacidad e idempotencia del navegador. |
| Recepción de formularios | 6 aprobadas | Rutas reales, SQL de idempotencia en PostgreSQL embebido; doble envío, contenido modificado, transacción cotización/lead, rollback, reintento, fallo de aviso y entradas inválidas. |
| Calificación y medición comercial | 5 aprobadas | Actualización de un solo lead, cuatro criterios, reintentos, registros cerrados, período chileno con cambio de hora, deduplicación de ventas y separación de monedas. |
| Compilación | Aprobada | Runtime comercial y Next.js 16.4.3. CMS sustituido por un servidor local vacío; no es una prueba de conectividad con producción. |
| TypeScript | Sin errores | Árbol de integración completo. |
| ESLint | Sin errores en archivos públicos modificados y componentes comerciales nuevos | El proyecto excluye el runtime y el árbol administrativo original del lint general; la compilación comprueba sus tipos. |
| Interfaz pública | 32 combinaciones | Ocho rutas a 360, 390, 430 y 1440 px; encabezado, contenido y pie de página, desbordamientos, errores del navegador y axe WCAG A/AA. |
| Asistente móvil | Aprobado a 390 px | Apertura, etiqueta del mensaje, cierre con Escape y ausencia de errores axe; la vista previa no carga etiquetas externas. |
| Cotizador | 14 estados | Siete pasos en móvil y escritorio; validación, fallo de red, conservación de respuestas, reintento y una conversión con el ID real del lead. |
| Inventario anterior | 80 rutas del sitemap y 4 controles adicionales | Rastreo de producción antes del cambio. No acredita aceptación de la versión nueva con el CMS real. |
| Grafo de código | Actualizado con AST | Referencias estructurales locales; no análisis semántico de todo el material editorial. |

Las pruebas automatizadas no demuestran ausencia absoluta de errores. La revisión de accesibilidad no sustituye una evaluación manual completa con tecnologías de asistencia. Las pruebas de recepción no envían correo, WhatsApp ni solicitudes a producción.

## Reproducción local

Requisitos: Node.js 24, dependencias del proyecto y Google Chrome disponible para Playwright.

```sh
npm ci
npm test
npm run test:reception
npm run test:commercial-measurement
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
node scripts/audit-public-site.mjs https://www.zyteron.cl output/redesign-08-11-2026/live
```

Las pruebas de envío solo admiten localhost. Los POST del navegador se interceptan; las pruebas de rutas usan PostgreSQL embebido y adaptadores locales para correo y CRM. La medición de rendimiento bloquea etiquetas externas y escrituras. Ejecutarla sin las otras suites de navegador en paralelo.

## Evidencias

- `output/redesign-08-11-2026/qa/results.json`: resultados y capturas de páginas públicas.
- `output/redesign-08-11-2026/quote/results.json`: recorrido del cotizador.
- `output/redesign-08-11-2026/performance/measurements.json`: muestras de laboratorio, sin emulación de red ni CPU.
- `output/redesign-08-11-2026/evidence/`: inventario anterior y registros de comprobación.

Las evidencias locales están excluidas de Git; los scripts y este informe están versionados. Las mediciones de localhost y producción no son directamente comparables por red, caché y contenido del CMS. No se declara mejora porcentual de velocidad ni cumplimiento de Core Web Vitals de campo.

## Condiciones externas pendientes

La conexión de Windsor.ai consultada sigue mostrando únicamente `sc-domain:denurvia.cl`; no expone Search Console ni GA4 de Zyteron. Faltan datos históricos, verificación de etiquetas, sesiones elegibles y atribución. Google Business no tiene verificación confirmada.

Antes de publicar: conectar preproducción al CMS y a una base autorizada, comprobar recepción y entrega real de avisos a receptores de prueba, revisar acceso de clientes y administración, ejecutar el inventario completo, respaldar datos/configuración y ensayar reversión. La ruta de calificación y el tablero requieren una sesión comercial autorizada para su aceptación en ese entorno.

El sitio publicado no se ha sustituido. La copia original del IDE está conservada; la integración sobre la versión vigente se encuentra en `../zyteron-redesign`. No desplegar la copia antigua.
