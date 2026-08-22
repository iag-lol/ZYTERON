# Auditoría de URLs de Search Console — 21 de agosto de 2026

Rama: `seo/auditoria-urls-gsc`. No fusionada a `main`.

## Causa raíz

Search Console reporta 24 URLs con error 404. Todas pertenecen a `/blog/*` y
`/casos-exito/*`. El commit `cdd0975` ("fix: blog y casos 100% Supabase, sin
contenido curado") eliminó `src/content/blog-posts.ts` (23 artículos) y
`src/content/case-studies.ts` (10 casos) y trasladó ambas secciones a la base de
datos. Las filas equivalentes nunca se cargaron en producción, así que URLs que
Google ya tenía indexadas pasaron a responder 404.

Comprobación en este entorno: `/blog` y `/casos-exito` responden 200 pero
listan cero elementos. La verificación directa contra la base de producción no
fue posible porque el `.env` local apunta a una instancia local apagada.

El contenido original de las 33 URLs se recuperó desde el commit `3421155`, que
es el último donde ambos archivos existían.

## Segundo hallazgo: redirección permanente hacia un 404

`/blog/diferencia-pagina-web-tienda-online-sistema-web` respondía 308 hacia
`/blog/pagina-web-tienda-online-o-sistema-web-cual-necesita-tu-empresa`, un slug
que no existe en ninguna ruta, seed ni contenido del repositorio. La redirección
terminaba en 404 y consumía presupuesto de rastreo. Además, el mismo slug de
origen está en `RECOMMENDED_SLUG_PRIORITY` y en `blog_seo_articles_parte1.sql`,
de modo que el artículo sembrado habría quedado inalcanzable: las reglas de
`next.config.ts` se evalúan antes que el enrutador de archivos.

## Tabla de decisiones

### Restaurar y potenciar — blog (9)

Contenido original recuperado y reescrito a 1.274-1.613 palabras, con respuesta
directa en el primer párrafo, enlaces internos y `publishedAt` original para
conservar la señal de antigüedad.

| URL | Estado actual | Señales SEO | Decisión | Acción | HTTP final | Sitemap | Pruebas |
| --- | --- | --- | --- | --- | --- | --- | --- |
| /blog/seo-para-empresas-chile-primeros-90-dias | 404 | indexada, intención informativa propia | Restaurar | Seed `blog_restauracion_404.sql` | 200 tras ejecutar el seed | Sí, automático | Insert idempotente verificado |
| /blog/que-debe-incluir-sistema-gestion-interno-pymes | 404 | indexada, long-tail de sistemas | Restaurar | Ídem | 200 tras el seed | Sí | Verificado |
| /blog/soporte-ti-pymes-santiago-que-buscar-evitar | 404 | indexada, complementa /soporte-ti-pymes-santiago | Restaurar | Ídem | 200 tras el seed | Sí | Verificado |
| /blog/vender-online-chile-sin-shopify-alternativas-pymes | 404 | indexada, intención comparativa | Restaurar | Ídem | 200 tras el seed | Sí | Verificado |
| /blog/panel-administrativo-vs-excel-salto-digital | 404 | indexada, alimenta /sistemas-web | Restaurar | Ídem | 200 tras el seed | Sí | Verificado |
| /blog/landing-page-vs-sitio-web-completo-negocio | 404 | indexada, intención comparativa | Restaurar | Ídem | 200 tras el seed | Sí | Verificado |
| /blog/checklist-seguridad-digital-pymes-chilenas-2026 | 404 | indexada, alimenta /soporte-ti | Restaurar | Ídem | 200 tras el seed | Sí | Verificado |
| /blog/tienda-online-sin-inventario-catalogo-whatsapp | 404 | indexada, alimenta /tiendas-online | Restaurar | Ídem | 200 tras el seed | Sí | Verificado |
| /blog/medir-roi-pagina-web-empresa-b2b | 404 | indexada, intención B2B propia | Restaurar | Ídem | 200 tras el seed | Sí | Verificado |

### Restaurar — blog ya cubierto por seeds previos (6)

Estas URLs ya tenían contenido nuevo escrito en `blog_seo_articles_parte1.sql` y
`parte2.sql`; seguían en 404 sólo porque esos seeds no se han ejecutado.

`cuanto-cuesta-pagina-web-empresa-chile`, `que-debe-tener-pagina-web-profesional-pyme`,
`diferencia-pagina-web-tienda-online-sistema-web`, `que-es-sistema-web-a-medida`,
`errores-criticos-contratar-desarrollo-web-chile`,
`automatizacion-whatsapp-empresas-casos-reales-chile`.

### Restaurar — casos de éxito (10)

Evidencia comercial anonimizada. Sin ellos, `/casos-exito` queda vacío y las
money pages pierden su bloque de portafolio.

`app-checklist-revision-buses`, `control-asistencia-personal`,
`control-flota-combustible`, `tienda-online-articulos-personalizados`,
`control-ventas-inventario-efectivo`, `web-empresa-combustible-seo`,
`tickets-dano-estructural-georreferenciado`,
`control-equipos-tareas-reuniones-informes`, `web-cotizaciones-personalizadas-pdf`,
`control-documentacion-flota-permisos-rtg-soap`.
Acción: seed `casos_restauracion_404.sql`. HTTP final 200 tras ejecutarlo.

### Redireccionar con 301/308 (7)

Todos los destinos son rutas estáticas, nunca contenido de base de datos: una
fila despublicada no puede convertir la redirección en un 404.

| URL | Decisión | Destino | Justificación | HTTP | Sitemap |
| --- | --- | --- | --- | --- | --- |
| /blog/cuanto-cuesta-una-pagina-web-en-chile | Redirigir | /planes | Canibalizaba con `cuanto-cuesta-pagina-web-empresa-chile`; `/planes` es la URL canónica de "precio página web Chile" | 308 → 200 | No |
| /blog/como-elegir-agencia-diseno-web-chile | Redirigir | /recursos/como-elegir-empresa-desarrollo-web-chile | Reemplazo directo y más completo | 308 → 200 | No |
| /blog/elegir-wordpress-nextjs-saas-web-empresa-chile | Redirigir | /recursos/wordpress-vs-web-a-medida-chile | Reemplazo directo | 308 → 200 | No |
| /blog/diseno-web-chile-vs-plantillas | Redirigir | /recursos/wordpress-vs-web-a-medida-chile | Misma intención comparativa | 308 → 200 | No |
| /blog/landing-pages-para-empresas-checklist | Redirigir | /servicios/landing-pages-para-empresas | Money page equivalente | 308 → 200 | No |
| /blog/mantencion-web-chile-que-incluye | Redirigir | /servicios/mantencion-web-chile | Money page equivalente | 308 → 200 | No |
| /blog/por-que-empresa-necesita-web-profesional | Redirigir | /paginas-web-para-empresas | Money page equivalente | 308 → 200 | No |

### Corregir (1)

| URL | Problema | Acción | HTTP |
| --- | --- | --- | --- |
| /blog/diferencia-pagina-web-tienda-online-sistema-web | 308 hacia un slug inexistente | Redirección eliminada; la URL se restaura con contenido propio | 200 tras el seed |

### Mantener excluidas

Sin cambios, todas correctas:

- Bloqueadas por `robots.txt`: `/api/`, `/admin/`, `/portal-clientes/`,
  `/portal-comercial/`, `/checkout/`, `/pagos/`. Ninguna es contenido comercial.
- `noindex` deliberado: `/roadmap`, `/becas-web-pyme/ganador/[slug]`, la página
  404. Ninguna aparece en el sitemap.
- El `noIndex` presente en `generateMetadata` de las rutas dinámicas
  (`blog/[slug]`, `casos-exito/[slug]`, `servicios/[slug]`,
  `paginas-web/[vertical]`, `sistemas-web/[sistema]`) sólo cubre el caso "no
  encontrado"; el componente llama `notFound()` y devuelve un 404 real. No hay
  soft 404. Verificado con petición real.

## Las 7 páginas pendientes de indexación

Todas verificadas contra el servidor de producción local:

| URL | HTTP | Canonical | Robots | H1 | JSON-LD | Enlaces internos antes → después |
| --- | --- | --- | --- | --- | --- | --- |
| /paginas-web-santiago | 200 | autorreferente | index, follow | 1 | Sí | 9 → 9 |
| /paginas-web/constructoras | 200 | autorreferente | index, follow | 1 | Sí | 2 → 4 |
| /paginas-web/industria-b2b | 200 | autorreferente | index, follow | 1 | Sí | 2 → 4 |
| /paginas-web/servicios-profesionales | 200 | autorreferente | index, follow | 1 | Sí | 2 → 4 |
| /sistemas-web/gestion-documental | 200 | autorreferente | index, follow | 1 | Sí | 2 → 2 |
| /sistemas-web/intranet-corporativa | 200 | autorreferente | index, follow | 1 | Sí | 2 → 2 |
| /recursos | 200 | autorreferente | index, follow | 1 | Sí | 5 → 6 archivos, y ahora en las 7 páginas de servicio |

Ninguna tiene un problema técnico. El contenido se renderiza en el servidor, sin
depender de JavaScript. La causa del "descubierta sin indexar" es autoridad
interna insuficiente: recibían dos enlaces, en su mayoría entre páginas hermanas
igual de débiles.

Acciones aplicadas:

- Las cuatro landings por rubro se enlazan desde `/paginas-web-para-empresas`,
  su página comercial madre, con anchors descriptivos.
- `/recursos` se incorporó a `commonRelatedLinks`, así que la enlazan las siete
  páginas de servicio además del footer.
- `/sistemas-web/gestion-documental` e `/intranet-corporativa` ya recibían enlace
  desde `/sistemas-web` con descripción propia; no se añadió más para no forzar
  enlaces artificiales.

## Canibalización

`/paginas-web-santiago` y `/desarrollo-web-santiago` apuntan a consultas
vecinas. Hoy se diferencian por título, H1, `serviceType` y contenido, y se
enlazan entre sí con anchors descriptivos. No se consolidan porque una de las
dos está indexada y no hay datos de rendimiento para decidir cuál conservar.
Queda como decisión humana con datos de Search Console.

## Validaciones ejecutadas

| Validación | Resultado |
| --- | --- |
| `npm run build` | 130/130 páginas estáticas, compilado correcto |
| `npx tsc --noEmit` | Sin errores nuevos; persisten 4 preexistentes en el módulo de becas |
| `npx eslint` sobre archivos modificados | Sin errores |
| `npm test` | 129/129 pruebas |
| Redirecciones sobre servidor real | 30 comprobadas: todas 308, un salto, destino 200 |
| Cadenas y ciclos de redirección | Ninguno |
| Enlaces internos rotos | Ninguno |
| Enlaces internos que pasan por una redirección | Ninguno |
| Seeds en Postgres | 9 y 10 filas, segunda ejecución sin duplicados, cero errores |
| `metaTitle` de artículos restaurados | Todos ≤ 60 caracteres |
| `metaDescription` de artículos restaurados | Todos entre 140 y 160 |

Pruebas nuevas: `src/lib/seo/redirects.test.ts`, `src/lib/seo/internal-links.test.ts`
y `src/lib/seo/sitemap.test.ts` (13 casos). Cubren cadenas, ciclos, destinos
inexistentes, destinos dependientes de la base de datos, enlaces rotos y
duplicados en el sitemap.

## Orden de ejecución en Supabase

Cada archivo es idempotente. En el editor SQL de Supabase, en este orden:

1. `blog_cases_bootstrap.sql` — crea las tablas si no existen.
2. `seed_blog_casos_julio2026.sql` — contenido base ya existente.
3. `blog_seo_articles_parte1.sql`
4. `blog_seo_articles_parte2.sql`
5. `blog_restauracion_404.sql`
6. `casos_restauracion_404.sql`

Hasta ejecutarlos, las 25 URLs de blog y casos siguen respondiendo 404.

## Riesgos pendientes

1. Todo el blog y los casos dependen de filas en Supabase. La sección ya se
   vació una vez y volvió a dejar URLs indexadas en 404. Conviene decidir si se
   acepta ese riesgo o si el contenido crítico vuelve a versionarse en el
   repositorio.
2. No fue posible consultar la base de producción desde este entorno, así que el
   estado real de sus tablas se infiere del comportamiento observado en Search
   Console.
3. Las URLs restauradas tardarán en volver al índice: dependen del re-rastreo.
4. `/paginas-web-santiago` frente a `/desarrollo-web-santiago` sigue abierta como
   decisión de negocio.

## Decisiones que requieren una persona

1. Ejecutar los seeds en Supabase. Sin este paso el resto de la auditoría no
   surte efecto.
2. Elegir si consolidar las dos páginas de Santiago, con datos de Search Console.
3. Confirmar que los 10 casos restaurados siguen autorizados por sus clientes.

No debe marcarse ninguna validación en Search Console hasta que los cambios
estén publicados y comprobados en producción.
