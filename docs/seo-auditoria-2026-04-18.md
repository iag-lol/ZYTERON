# Auditoria SEO Zyteron.cl (2026-04-18)

## Diagnostico tecnico (antes de cambios)

### P0 (critico)
- Canonical global apuntando a `https://www.zyteron.com` en vez de `https://www.zyteron.cl`.
- `robots.txt` y `sitemap.xml` publicaban dominio `.com`.
- Sitemap incluia URL inexistente (`/blog`).
- Sin metadata por pagina en la mayoria de rutas publicas.
- Sin schema JSON-LD por pagina (home con `jsonld_count=0`).
- Enlaces a `/privacidad` y `/terminos` sin rutas creadas (404).
- Email de contacto con typo `.cly`.

### P1 (alto)
- `/servicios` era una sola pagina general sin cluster por keyword; alta probabilidad de canibalizacion.
- Home con foco disperso (servicios TI/hardware mezclados con keywords web objetivo).
- Enlazado interno sin estrategia de intencion (casi todos los CTAs iban a rutas genericas).

### P2 (medio)
- `img` en catalogo de productos sin optimizacion de `next/image`.
- Provider global de React Query cargado sin uso real en frontend publico.

## Benchmark competitivo Chile (snapshot)

| Sitio | Title SEO | H1 | Canonical | JSON-LD | Notas |
|---|---|---|---|---|---|
| zyteron.cl (antes) | Zyteron \| Soluciones web... | Tecnologia que impulsa ventas... | `https://www.zyteron.com` | 0 | Senales de indexacion contradictorias |
| jumpseller.cl | Crea tu Tienda Online... | Crea tu tienda online | Correcto | 2 | Fuerte estructura ecommerce y marca |
| agenciabull.cl | Home - Agenciabull | No claro en home | Correcto | 1 | Marca fuerte, SEO on-page irregular |
| syde.cl | SYDE - Diseno de paginas web... | DISENO DE PAGINAS WEB | Correcto | 1 | Mensaje comercial directo a pymes |
| vulix.cl | Vulix \| Diseno y Desarrollo... | Tu negocio merece una web... | Correcto | 2 | Keyword targeting local agresivo |
| exacto.cl | Exacto.cl - Desarrollo Web... | Diseno Web Agencia Digital... | Correcto | 1 | Stack tecnico y foco B2B claro |

## Keyword map Chile (implementado)

| Keyword principal | URL objetivo | Intencion |
|---|---|---|
| paginas web para empresas | `/servicios/paginas-web-para-empresas` | Transaccional B2B |
| diseno web chile | `/servicios/diseno-web-chile` | Servicio principal |
| desarrollo web chile | `/servicios/desarrollo-web-chile` | Servicio tecnico |
| agencia diseno web chile | `/servicios/agencia-diseno-web-chile` | Comparativa/proveedor |
| diseno web santiago | `/servicios/diseno-web-santiago` | Local transaccional |
| creacion de sitios web para empresas | `/servicios/creacion-de-sitios-web-para-empresas` | Solucion end-to-end |

## Arquitectura SEO aplicada

- Home transaccional: `/`
- Hub de servicios: `/servicios`
- Cluster de servicios (6 URLs objetivo)
- URLs de conversion: `/contacto`, `/paquetes`, `/planes`
- Soporte legal indexable: `/privacidad`, `/terminos`

## Cambios implementados en codigo

### SEO tecnico
- Dominio canonico corregido a `.cl` en configuracion central.
- Metadata por pagina en Home, Servicios, Servicios/slug, Contacto, Nosotros, Planes, Paquetes, Productos, Privacidad, Terminos.
- `robots.txt` actualizado con host/sitemap correctos y exclusiones de `/admin` y `/api`.
- `sitemap.xml` actualizado con URLs reales + cluster de servicios.
- `admin/*` marcado `noindex`.

### Schema markup
- Grafo global `Organization + WebSite + ProfessionalService`.
- JSON-LD por pagina:
  - `WebPage` + `BreadcrumbList`.
  - `Service` en cada pagina de servicio.
  - `FAQPage` en home/servicios/servicio-detalle.
  - `ItemList` en home y hub de servicios.

### Contenido y arquitectura
- Reescritura SEO de Home con enfoque en keywords objetivo.
- Reescritura completa de `/servicios` como hub de intencion.
- Creacion de 6 landing pages de servicio orientadas a keyword exacta.
- Enlazado interno estrategico entre Home, Hub, Servicio, Contacto, Planes y Cotizador.

### Core Web Vitals (quick wins)
- Migracion de imagenes de productos a `next/image` con dimensiones y `sizes`.
- Configuracion `images.remotePatterns` para optimizacion de recursos remotos.
- Activacion de `optimizePackageImports` para `lucide-react`.
- Eliminacion de provider global no usado en layout publico.

## Roadmap 30/60/90 dias

### 0-30 dias
- Publicar cambios y validar en Search Console (inspeccion URL + sitemap).
- Corregir canibalizacion residual de titulos/metas detectada en coverage.
- Medir baseline: CTR, impresiones y conversion por URL de servicio.
- Crear 3 casos de exito (contenido BOFU) enlazados desde paginas de servicio.

### 31-60 dias
- Crear cluster de contenidos informacionales (8-12 articulos) enlazados a servicios.
- Implementar comparativas comerciales (Zyteron vs plantilla/freelance) con enfoque EEAT.
- Mejorar CRO en contacto/paquetes con tracking de eventos y pruebas A/B de CTA.

### 61-90 dias
- Expandir SEO local por ciudad prioritaria (Santiago, Valparaiso, Concepcion).
- Construir enlazado externo con alianzas/directorios B2B de Chile.
- Iterar por GSC: consolidar paginas top, refrescar contenido y resolver consultas con alto potencial.

## KPIs sugeridos

- Impresiones no-marca en keywords objetivo.
- CTR por URL de servicio.
- Leads por canal organico (form + WhatsApp).
- % URLs validas en indexacion y errores de cobertura.
- LCP/CLS/INP en plantillas clave (home, servicios, detalle servicio).
