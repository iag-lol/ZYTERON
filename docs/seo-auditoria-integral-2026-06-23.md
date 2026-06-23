# Auditoria SEO integral Zyteron - 2026-06-23

Dominio canonico oficial: `https://www.zyteron.cl`

## 1. Resumen ejecutivo

Se audito el proyecto Next.js 16.2.3 con App Router, rutas publicas, rutas privadas, metadata, sitemap, robots, redirects, schema JSON-LD, analytics, formularios, pagos y contenido visible.

Mejoras aplicadas:

- Canonical e identidad: se mantuvo `siteConfig.url` como fuente central para canonicals, metadataBase, sitemap, Open Graph y JSON-LD.
- Ruta antigua `/nosotros`: se conservaron redirecciones 301 hacia `/quienes-somos` y no quedaron enlaces internos ni contenido indexable con la ruta antigua.
- Indexacion: `/portal-clientes` y paginas locales `/ciudades` quedaron con `noindex`; sitemap excluye rutas privadas, checkout/gracias, admin, portal y landings locales de baja diferenciacion.
- Robots: se corrigio para no bloquear paginas que necesitan exponer `noindex`, manteniendo bloqueo de areas privadas y APIs.
- Schema: se elimino `LocalBusiness` incompleto y cualquier fallback de reviews falsas; se mantiene `Organization`, `WebSite`, `ProfessionalService`, `Service`, `FAQPage`, `BlogPosting`, `BreadcrumbList` y `ContactPage` solo con informacion real disponible.
- Telefonos: el control final no encontro telefonos antiguos; solo aparece el numero oficial `+56939526626`.
- Analytics: se agregaron eventos reutilizables sin PII para formularios, cotizaciones, clics de WhatsApp/correo/telefono e inicio de checkout.
- Calidad tecnica: `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan correctamente.

## 2. Archivos modificados

- `debug-ot.ts`: se elimino `any` para que lint pase.
- `docs/seo-local/google-business-profile.md`: se ajusto checklist para no usar `LocalBusiness` ni `Review` sin datos verificables.
- `docs/seo-auditoria-integral-2026-06-23.md`: reporte final de auditoria.
- `next.config.ts`: redireccion 301 de `/nosotros` y `/nosotros/:path*` hacia `/quienes-somos`.
- `public/robots.txt`: sitemap absoluto y bloqueo solo de `/api/`, `/admin/`, `/portal-clientes/`.
- `src/app/page.tsx`: se suavizo un claim numerico no verificable de experiencia.
- `src/app/admin/(protected)/comunicaciones/page.tsx`: limpieza de import no usado.
- `src/app/admin/(protected)/ordenes-trabajo/page.tsx`: limpieza de imports no usados.
- `src/app/api/checkout/flow/create/route.ts`: tipado seguro para items de checkout.
- `src/app/api/portal/credentials/send-code/route.ts`: manejo de errores sin `any`.
- `src/app/ciudades/page.tsx`: `noindex` para hub de ciudades.
- `src/app/ciudades/[slug]/page.tsx`: `noindex` para paginas locales generadas por plantilla.
- `src/app/layout.tsx`: verificacion de Search Console por env y tracker de eventos de conversion.
- `src/app/portal-clientes/layout.tsx`: `noindex, nofollow, nocache` para portal privado.
- `src/app/portal-clientes/panel/asistencia/page.tsx`: limpieza de import no usado.
- `src/app/portal-clientes/panel/credenciales/page.tsx`: retiro de prop no usado.
- `src/app/quienes-somos/page.tsx`: limpieza de imports no usados.
- `src/app/sitemap.ts`: sitemap limpio sin `/ciudades`, portal, admin, checkout, pagos ni rutas internas.
- `src/components/analytics/conversion-event-tracker.tsx`: nuevo tracker de clics a WhatsApp, email y telefono sin datos personales.
- `src/components/admin/admin-communications-center.tsx`: limpieza de warning de hook y variable no usada.
- `src/components/admin/auto-submit-select.tsx`: limpieza de import no usado.
- `src/components/admin/portal-client-admin-actions.tsx`: tipo seguro para estado de cuenta.
- `src/components/forms/commercial-quote-builder.tsx`: evento `quote_request_submit` en envio exitoso.
- `src/components/forms/contact-lead-form.tsx`: evento `contact_form_submit` en envio exitoso.
- `src/components/forms/package-builder.tsx`: evento `quote_request_submit` en envio exitoso.
- `src/components/forms/public-products-catalog.tsx`: evento `begin_checkout` antes de iniciar compra publica.
- `src/components/payments/online-payment-launcher.tsx`: evento `begin_checkout` para pagos online.
- `src/components/portal/panel/communications-center.tsx`: limpieza de estado/import no usado.
- `src/components/portal/panel/credential-secret-display.tsx`: temporizador compatible con reglas de hooks.
- `src/components/portal/panel/portal-panel-shell.tsx`: polling de notificaciones compatible con reglas de hooks.
- `src/components/portal/panel/portal-store.tsx`: evento `begin_checkout` y limpieza de catch no usado.
- `src/components/portal/panel/support-ticket-center.tsx`: limpieza de variable no usada.
- `src/config/analytics.ts`: IDs por `NEXT_PUBLIC_*` y verificacion Google opcional por env.
- `src/config/seo.ts`: `sameAs` reducido a LinkedIn verificado.
- `src/config/seo-intents.ts`: mapa central de intenciones SEO por URL.
- `src/content/reviews.ts`: eliminado por contener reviews placeholder.
- `src/lib/admin/work-order-pdf.ts`: limpieza `prefer-const`.
- `src/lib/analytics/google-ads.ts`: helpers de eventos `generate_lead`, `contact_form_submit`, `quote_request_submit`, `begin_checkout`.
- `src/lib/seo.ts`: titulos sin doble marca, canonicals absolutos, schema sin `LocalBusiness` incompleto.
- `src/lib/web-control.ts`: reviews publicas solo desde aprobadas reales, sin fallback ficticio.

## 3. URLs optimizadas

| URL | Keyword principal | Title | Meta description | Canonical | Schema |
| --- | --- | --- | --- | --- | --- |
| `/` | desarrollo web y soluciones digitales Chile | Desarrollo web y sistemas para empresas en Chile \| Zyteron | Servicios web, sistemas, ecommerce, automatizacion y soporte TI para empresas en Chile. | `https://www.zyteron.cl/` | WebPage, Organization, WebSite, ItemList, FAQPage |
| `/desarrollo-web` | desarrollo web Chile | Desarrollo Web para Empresas \| Zyteron | Landing comercial de desarrollo web para empresas en Chile. | `https://www.zyteron.cl/desarrollo-web` | WebPage, Service, ProfessionalService, FAQPage |
| `/servicios/paginas-web-para-empresas` | paginas web para empresas Chile | Paginas web para empresas en Chile \| Zyteron | Servicio orientado a presencia comercial, conversion y confianza. | `https://www.zyteron.cl/servicios/paginas-web-para-empresas` | WebPage, Service, ProfessionalService, FAQPage, BreadcrumbList |
| `/servicios/diseno-web-chile` | diseno web Chile | Diseno web Chile para empresas B2B \| Zyteron | Diseno web claro, comercial y responsive para empresas. | `https://www.zyteron.cl/servicios/diseno-web-chile` | WebPage, Service, ProfessionalService, FAQPage, BreadcrumbList |
| `/desarrollo-web-santiago` | desarrollo web Santiago | Desarrollo web Santiago \| Zyteron | Pagina comercial local real para demanda en Santiago. | `https://www.zyteron.cl/desarrollo-web-santiago` | WebPage, Service, FAQPage |
| `/servicios/seo-para-empresas-chile` | SEO para empresas Chile | SEO para empresas Chile orientado a leads B2B \| Zyteron | SEO tecnico, arquitectura y contenido sin promesas falsas. | `https://www.zyteron.cl/servicios/seo-para-empresas-chile` | WebPage, Service, ProfessionalService, FAQPage, BreadcrumbList |
| `/soporte-ti` | soporte TI para empresas Chile | Soporte TI para empresas \| Zyteron | Soporte y continuidad tecnologica para empresas. | `https://www.zyteron.cl/soporte-ti` | WebPage, Service, FAQPage |
| `/planes` | planes de paginas web Chile | Planes web, ecommerce y sistemas para empresas \| Zyteron | Precios referenciales publicados y alcance por plan. | `https://www.zyteron.cl/planes` | WebPage, OfferCatalog, FAQPage |
| `/casos-exito` | proyectos de desarrollo web | Casos de exito \| Zyteron | Casos anonimos documentados sin clientes ni metricas inventadas. | `https://www.zyteron.cl/casos-exito` | WebPage, ItemList |
| `/blog` | recursos de desarrollo web y SEO | Blog \| Zyteron | Recursos informacionales sobre web, SEO, sistemas y soporte. | `https://www.zyteron.cl/blog` | WebPage, BlogPosting en detalle |
| `/quienes-somos` | empresa de desarrollo web Zyteron | Quienes somos \| Zyteron | Informacion de empresa, enfoque, equipo y rutas de contacto. | `https://www.zyteron.cl/quienes-somos` | WebPage |
| `/contacto` | cotizar pagina web Chile | Contacto comercial para tu proyecto digital \| Zyteron | Formulario y canales comerciales oficiales. | `https://www.zyteron.cl/contacto` | WebPage, ContactPage |

Las rutas dinamicas de blog, casos y servicios heredan canonical absoluto, Open Graph, Twitter cards y schema desde los helpers centrales.

## 4. Redirecciones

Rutas antiguas detectadas:

- `/nosotros`
- `/nosotros/:path*`

Redirecciones creadas:

- `/nosotros` -> `/quienes-somos` con `permanent: true`.
- `/nosotros/:path*` -> `/quienes-somos` con `permanent: true`.

Control final:

- Coincidencias de "nosotros" en codigo fuente: 2, ambas son las reglas de redireccion en `next.config.ts`.
- No hay enlaces internos, breadcrumbs, sitemap ni metadata apuntando a `/nosotros`.

## 5. Sitemap y robots

Sitemap:

- Incluye 67 URLs canonicas publicas: home, servicios, servicios SEO, paginas prioritarias, casos, blog y articulos.
- Excluye `/admin`, `/portal-clientes`, login/registro/recuperacion, APIs, checkout/gracias, pagos/gracias, `/roadmap` y `/ciudades`.
- Usa `lastModified` real de `updatedAt` o `publishedAt` para blog y casos.

Robots:

- `Allow: /`
- `Sitemap: https://www.zyteron.cl/sitemap.xml`
- `Disallow: /api/`
- `Disallow: /admin/`
- `Disallow: /portal-clientes/`

No se bloquean CSS, JS, imagenes ni paginas publicas necesarias para renderizado.

## 6. Schema

Implementado o validado:

- `Organization` y `WebSite` global.
- `WebPage` por pagina publica.
- `BreadcrumbList` en rutas anidadas donde existen breadcrumbs visibles.
- `Service` en paginas de servicio.
- `ProfessionalService` en paginas comerciales, sin direccion fisica inventada.
- `FAQPage` solo con FAQs visibles.
- `BlogPosting` para articulos de blog.
- `ContactPage` para contacto.
- `OfferCatalog` para planes publicados.

Omitido por falta de verificacion:

- `LocalBusiness`: no se publica hasta tener direccion/perfil comercial verificable y consistente.
- `Review` y `AggregateRating`: no se publican hasta tener reviews reales, visibles y aprobadas.
- SameAs de WhatsApp: no se usa como perfil social; se mantiene como canal de contacto.

## 7. Rendimiento

Problemas detectados:

- Riesgo de contenido falso por reviews placeholder.
- Riesgo de indexacion de landings locales generadas por plantilla.
- Riesgo de duplicacion de marca en titulos.
- Warnings de lint que ensuciaban validacion tecnica.

Cambios realizados:

- Eliminadas reviews placeholder y fallback ficticio.
- `/ciudades` y detalles locales quedan `noindex` y fuera del sitemap.
- Metadata central normaliza titulos para evitar `| Zyteron | Zyteron`.
- Eventos de conversion se implementan con un componente cliente pequeno y sin bloquear formularios.
- Se limpio lint completo sin errores ni warnings.
- Se mantuvo el uso de fuentes Next con `display: swap`.

Pendiente para rendimiento real de campo:

- Medir Core Web Vitals en produccion con PageSpeed Insights, Search Console y datos reales de Chrome UX Report cuando exista trafico suficiente.

## 8. Pendientes manuales externos

- Validar propiedad en Google Search Console y definir `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.
- Enviar `https://www.zyteron.cl/sitemap.xml` en Search Console.
- Solicitar reindexacion de `/quienes-somos`, home, servicios principales y sitemap.
- Verificar que hosting aplique redirecciones de `http://zyteron.cl`, `http://www.zyteron.cl` y `https://zyteron.cl` hacia `https://www.zyteron.cl`.
- Crear o corregir Google Business Profile solo con datos reales y visibles.
- Conseguir backlinks reales desde clientes, partners o directorios legitimos.
- Publicar testimonios solo con autorizacion verificable.
- Completar biografias reales de autores si se quieren perfiles personales; por ahora se mantiene autoria editorial.
- Incorporar direccion comercial solo si es publica, verificable y aprobada.

## 9. Comandos ejecutados

- `npm run lint`: correcto, sin errores ni warnings.
- `npx tsc --noEmit`: correcto.
- `npm run build`: correcto. Genero 166 rutas. En entorno local aviso que no hay keys validas de Supabase para leer `ClientReview`; esto no bloquea el build y evita publicar reseñas falsas.
- Busquedas SEO:
  - `/nosotros`: solo quedan redirects 301.
  - Telefono antiguo `+56 9 8475 2936`, fragmentos `8475`, `2936`, `+14155238886`: 0 coincidencias finales.
  - `LocalBusiness`, `AggregateRating`, `Review` ficticio, nombres de reviews placeholder: 0 coincidencias en codigo publico; solo queda una nota documental indicando no usarlos sin datos verificables.
