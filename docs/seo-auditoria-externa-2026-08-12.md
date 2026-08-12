# Auditoría SEO externa y conversión — 12 de agosto de 2026

## Resumen ejecutivo

Zyteron está indexado y sus páginas principales son rastreables. No se observaron señales públicas de un bloqueo general de Google: la marca aparece, pero el dominio todavía no gana posiciones visibles para búsquedas comerciales genéricas como diseño web para pymes, desarrollo web en Santiago o sistemas web a medida. Una acción manual solo puede descartarse por completo desde Google Search Console.

Los bloqueos de mayor impacto detectados fueron:

1. Respuesta inicial lenta del servidor y HTML sin caché de borde de Cloudflare.
2. Portada dependiente de tres consultas remotas ejecutadas en secuencia.
3. Formulario comercial con demasiada fricción antes del primer contacto.
4. Dos URLs compitiendo por la misma intención local de diseño web en Santiago.
5. Marcado `LocalBusiness` sin una oficina pública verificable y una dirección distinta publicada en un directorio externo.
6. Autoridad externa existente, pero todavía débil para competir por términos genéricos.
7. Hasta 165 landings por ubicación generadas desde cinco plantillas con contenido muy similar.
8. Duplicación adicional entre `/tiendas-online` y `/tiendas-online-chile`, y entre `/sistemas-web` y `/sistemas-web-a-medida`.
9. Blog, casos y productos forzados a renderizar dinámicamente pese a contar con invalidación desde el administrador.
10. El cotizador era dinámico solo por leer parámetros de preselección y alcanzó el peor TTFB de las páginas comerciales revisadas.

## Evidencia externa

### Indexación y posicionamiento

Google muestra la portada y páginas como `/desarrollo-web`, `/servicios`, `/planes`, `/contacto`, `/demos`, `/casos-exito`, `/paginas-web-para-pymes` y `/blog` al buscar la marca.

En búsquedas comerciales genéricas revisadas, Zyteron no apareció entre los resultados visibles. Esto apunta a un problema de autoridad, rendimiento y consolidación temática, no de indexación básica.

Una segunda revisión de búsquedas no marcarias confirmó además que los resultados públicos todavía conservan URLs antiguas de Zyteron, entre ellas `/servicios/paginas-web-para-pymes` y `/servicios/diseno-web-santiago`. Esas páginas compiten con las rutas canónicas nuevas y deben desaparecer gradualmente del índice después del despliegue, el redirect permanente y un nuevo rastreo.

### Benchmark comercial no marcario

La muestra pública para `páginas web Chile`, `páginas web para pymes Chile`, `páginas web para empresas Chile` y `diseño web Santiago` mostró competidores con cuatro señales recurrentes:

1. frase de búsqueda principal en el título y H1;
2. precios o rangos visibles antes de contactar;
3. proceso, inclusiones y preguntas de compra desarrolladas en la misma página;
4. portafolio, trayectoria o evidencia comercial visible.

Kroki concentra la intención nacional, precios, proceso y contacto en su portada. Vínculo desarrolla tipos de sitio y preguntas de compra. Diseñando.cl reúne pymes y empresas con encabezados y valores específicos. Zyteron ya dispone de planes, proceso, demos, casos y una base técnica más amplia; el trabajo realizado concentra ahora esas señales en las URLs correctas, sin copiar contenidos ni crear afirmaciones no verificables.

### Mapa de intención no marcaria

| Búsqueda principal | URL canónica | Función de la página | Evitar |
| --- | --- | --- | --- |
| `páginas web Chile` | `/` | Autoridad nacional y acceso a soluciones | Crear otra `/paginas-web-chile` |
| `desarrollo web Chile` | `/desarrollo-web` | Implementación y capacidad técnica | Mezclarla con diseño corporativo |
| `páginas web para pymes Chile` | `/paginas-web-para-pymes` | Oferta, necesidades y precio para pyme | Variantes por ciudad o un segundo servicio duplicado |
| `páginas web para empresas Chile` | `/diseno-web-empresas` | Sitio corporativo, B2B y rediseño | Mantener `/servicios/paginas-web-para-empresas` indexable |
| `desarrollo web Santiago` | `/desarrollo-web-santiago` | Única intención local prioritaria | Landings repetidas por comuna |
| `precio página web Chile` | `/planes` | Comparación de valores y alcance | Un artículo que compita con la página comercial |

No se asignan volúmenes estimados porque no existe una fuente conectada con ubicación Chile en este entorno. El orden definitivo debe contrastarse con Search Console y Keyword Planner/Keyword Surfer configurado para Chile, sin inventar cifras.

### Rendimiento observado en producción

Mediciones de respuesta inicial realizadas desde fuera del sitio:

| Ruta              | TTFB observado | HTML transferido |
| ----------------- | -------------: | ---------------: |
| `/`               |         4,42 s |    417.261 bytes |
| `/desarrollo-web` |         3,05 s |    141.373 bytes |
| `/planes`         |         2,75 s |    178.580 bytes |
| `/contacto`       |         3,38 s |     87.168 bytes |
| `/blog`           |         3,25 s |                — |
| `/casos-exito`    |         3,01 s |                — |

La portada también mostró respuestas repetidas entre 4,5 y 14,1 segundos. Los encabezados devolvieron `cf-cache-status: DYNAMIC`, por lo que Cloudflare no estaba sirviendo el HTML desde su caché de borde.

Un rastreo posterior de las 45 URLs declaradas en el sitemap confirmó que todas respondían, pero mantuvo tiempos altos en producción:

| Ruta                            | TTFB observado |
| ------------------------------- | -------------: |
| `/contacto`                     |         5,18 s |
| `/cotizador`                    |         6,70 s |
| `/becas-web-pyme`               |         6,24 s |
| `/sistemas-web-a-medida`        |         4,67 s |
| Páginas principales de servicio |      2,7–3,8 s |

### Arquitectura e indexación

Se detectaron cinco familias programáticas por comuna o ciudad: desarrollo web, diseño web, páginas para pymes, soporte TI y sistemas web. Con 33 ubicaciones, la arquitectura podía generar hasta 165 páginas de contenido muy parecido, enlazadas desde `/ciudades`. Aunque no estaban en el sitemap, sí eran descubribles mediante enlaces internos.

Esa multiplicación no aporta suficiente evidencia local individual y diluye las señales que deberían concentrarse en las páginas comerciales principales. Se decidió conservar una sola página local fuerte para Santiago y consolidar el resto mediante redirecciones permanentes.

### Conversión

El formulario de contacto pedía 13 campos visibles antes de enviar: datos personales, presupuesto, fecha y seis decisiones técnicas. Ese nivel de detalle es más apropiado para una segunda conversación que para captar el primer contacto.

## Correcciones implementadas

- Consultas de reseñas y casos ejecutadas en paralelo.
- Eliminada de la portada la consulta remota de perfiles de becas, que no es necesaria para la intención comercial principal.
- Revalidación de portada y sitemap ampliada a una hora; las mutaciones administrativas conservan su invalidación explícita.
- Formulario reducido a cinco campos obligatorios: nombre, correo, WhatsApp, tipo de proyecto y descripción.
- Empresa y presupuesto quedan opcionales; las decisiones técnicas se recopilan después.
- Compatibilidad conservada con el formato de lead utilizado por administración y notificaciones.
- Redirect permanente de `/servicios/diseno-web-santiago` a `/desarrollo-web-santiago`.
- URL duplicada retirada del sitemap.
- Eliminado `LocalBusiness` de portada y contacto mientras no exista una ubicación pública verificada y coherente.
- Calidades de imagen utilizadas por el sitio declaradas en la configuración de Next.js.
- Redirecciones permanentes de las familias geográficas hacia seis páginas canónicas fuertes; `/desarrollo-web/santiago` se consolida específicamente en `/desarrollo-web-santiago`.
- Eliminada la generación estática de hasta 165 landings geográficas; las rutas de compatibilidad solo redirigen.
- Consolidadas además las 18 fichas antiguas `/ciudades/{ubicación}`; Santiago apunta a su landing propia y las demás a desarrollo web nacional.
- `/ciudades` convertido en página informativa `noindex,follow`, sin enlaces a plantillas locales ni texto interno sobre manipulación de indexación.
- Retirada de la portada la cinta que duplicaba 17 nombres de ciudades en el HTML; se conserva una declaración de cobertura nacional útil para personas.
- Consolidación de `/tiendas-online-chile` en `/tiendas-online` y de `/sistemas-web-a-medida` en `/sistemas-web`.
- Duplicados retirados del sitemap y enlaces internos actualizados para apuntar directamente a las URLs canónicas.
- Títulos SEO comerciales acortados para evitar truncado y repetición de marca.
- Eliminado `ProfessionalService` de las páginas de servicio: ese tipo hereda de `LocalBusiness` y no corresponde mientras no exista una oficina pública verificable.
- Entidad `Organization` reforzada con área servida, especialidades y perfiles externos existentes de GoodFirms y The Manifest.
- Precios estructurados alineados con la fuente única de precios del sitio e indicación explícita de que no incluyen IVA.
- Blog, casos de éxito y productos migrados de renderizado obligatorio por solicitud a ISR de una hora; el administrador mantiene invalidación inmediata al publicar.
- Consultas duplicadas entre metadata y detalle de artículos/casos deduplicadas durante el render.
- Cotizador convertido en página cacheable; la preselección por `tipo` y `plan` se resuelve en el navegador sin cambiar sus URLs existentes.
- Enlaces de blog seleccionados por tema en vez de mostrar siempre los mismos cinco servicios.
- Formularios y casos ahora conservan el origen comercial en la URL para saber qué servicio, artículo o caso generó el contacto.
- Medición global añadida para clics internos hacia contacto y cotizador, además de los eventos existentes de WhatsApp, teléfono, correo y envío exitoso.
- Formulario de contacto con autocompletado, tipos de proyecto para automatización y SEO, y preselección desde las páginas de servicio.
- Texto duplicado de resultados eliminado del encabezado de los casos de éxito.
- Portada reasignada desde una intención principalmente marcaria a `páginas web Chile`, con title, H1 y descripción comercial coherentes.
- Página de pymes ampliada con contenido propio sobre descubrimiento, confianza, conversión, crecimiento, proceso técnico y preguntas de compra.
- `/diseno-web-empresas` reposicionada explícitamente para `páginas web para empresas en Chile`, conservando `diseño web corporativo` como variante secundaria.
- Alias `/paginas-web-para-empresas` y servicio histórico `/servicios/paginas-web-para-empresas` consolidados mediante `308` en `/diseno-web-empresas`.
- Navegación, footer, portada y páginas relacionadas reforzados con enlaces descriptivos hacia pymes y empresas.
- Artículos y casos administrados enlazan ahora la solución canónica más cercana al tema, en vez de enviar todos los proyectos web a una ruta genérica.
- `/planes` optimizada para `precio página web Chile`, con la pregunta exacta, valores leídos desde la misma fuente de precios y contenido visible consistente con el schema.
- Una sola URL asignada a cada grupo comercial para impedir que Zyteron compita contra sí mismo.

## Validación técnica realizada

- Lint dirigido sobre todos los archivos modificados: aprobado sin errores.
- El lint y el type-check globales del repositorio todavía reportan errores preexistentes en módulos administrativos de becas y en el sidebar; no pertenecen a los archivos SEO modificados y deben corregirse en una intervención funcional separada.
- Compilación de Next.js: código compilado correctamente.
- La recolección completa de datos del build local se detuvo únicamente porque este entorno no contiene `DATABASE_URL`/`POSTGRES_URL`; el fallo se produce en una ruta administrativa y no en los cambios SEO.
- Prueba HTTP local de páginas comerciales: respuestas `200`.
- Prueba de diez redirecciones representativas: respuestas permanentes `308` y destinos correctos.
- `/ciudades`: `noindex, follow, nocache` confirmado.
- Sitemap local: 27 URLs públicas sin contenido de base de datos; cero URLs duplicadas consolidadas.
- Páginas principales de servicio: cero schemas `ProfessionalService`.
- Organización: perfiles externos, `areaServed` y `knowsAbout` presentes en JSON-LD.
- Rastreo automatizado de 13 rutas comerciales: `200`, un solo H1, canonical correcto y JSON-LD válido en todas.
- Títulos de las rutas comerciales revisadas: entre 41 y 62 caracteres; descripciones: entre 121 y 149 caracteres.
- Precios de servicio visibles en HTML y coincidentes con las ofertas estructuradas.
- Segunda carga local del cotizador: aproximadamente 0,08 s tras compilación, manteniendo parámetros de preselección.
- Rastreo adicional de `/`, `/paginas-web-para-pymes`, `/diseno-web-empresas`, `/desarrollo-web` y `/planes`: respuestas `200`, un H1, canonical correcto y cuatro bloques JSON-LD válidos por página.
- Títulos no marcarios prioritarios comprobados entre 41 y 59 caracteres, incluyendo la marca una sola vez.
- Precios visibles confirmados en pymes, empresas, desarrollo web y planes; valores estructurados alineados con la misma fuente numérica.
- Alias y servicios históricos de pymes, empresas y Santiago comprobados con respuesta `308` hacia su destino canónico.

## Acciones externas pendientes

1. Configurar una regla de caché de Cloudflare solo para HTML público `GET/HEAD`. Excluir `/api/*`, `/admin/*`, `/portal-clientes/*`, `/portal-comercial/*`, `/checkout/*`, `/pagos/*`, solicitudes RSC de Next.js, cookies de sesión y respuestas personalizadas. Cloudflare advierte que “Cache Everything” puede exponer contenido dinámico si se aplica sin condiciones.
2. Confirmar que el servicio de Render sea productivo y no pueda entrar en suspensión. Si usa una instancia gratuita, migrarla a una instancia pagada: Render documenta suspensión tras 15 minutos sin tráfico y una reactivación cercana a un minuto.
3. Corregir o retirar la dirección `251 Antonio Bellet, Providencia` del directorio externo si no corresponde a una oficina pública real.
4. Mantener una sola identidad comercial en Google Business Profile y directorios: nombre, teléfono, zona atendida y sitio web deben coincidir.
5. Conseguir menciones y enlaces editoriales relevantes desde clientes, asociaciones de pymes, cámaras de comercio y medios de negocios/tecnología de Chile.
6. Revisar en Search Console, después del despliegue, impresiones, consultas no marcarias, páginas de entrada y conversiones durante 28 días.
7. Solicitar en Search Console la validación de las páginas canónicas principales y vigilar que las URLs consolidadas pasen a estado de redirección o exclusión.
8. Publicar contenido nuevo solo cuando responda una intención distinta y aporte evidencia propia; no volver a generar páginas por comuna desde una plantilla común.

### Ejecución de autoridad y demanda orgánica

Prioridad 1 — medición e indexación tras desplegar:

1. Inspeccionar y solicitar indexación de `/`, `/desarrollo-web`, `/paginas-web-para-pymes`, `/diseno-web-empresas`, `/desarrollo-web-santiago` y `/planes`.
2. Volver a enviar `/sitemap.xml` y comprobar que las rutas antiguas pasan a `Página con redirección`, no a duplicado indexado.
3. Crear un filtro de consultas no marcarias excluyendo `zyteron` y variantes; comparar cada 28 días clics, impresiones, CTR, posición y página de destino.
4. Medir como conversiones primarias formulario enviado, WhatsApp, llamada y avance al cotizador; no evaluar SEO solo por visitas.

Prioridad 2 — reputación y enlaces legítimos:

1. Corregir de inmediato el año `2020` publicado por GoodFirms y The Manifest al año oficial `2024`. Diferenciar claramente “empresa fundada en 2024” de “más de 7 años de experiencia del equipo/fundador”.
2. Completar y mantener coherentes esos perfiles: nombre, `contacto@zyteron.cl`, `+56 9 3952 6626`, Santiago como base, atención remota nacional y servicios principales.
3. Completar en The Manifest las secciones que hoy aparecen vacías: experiencia por industria, distribución de clientes, tamaño de proyectos y clientes autorizados. El perfil también informa que no tiene reseñas.
4. Revisar en GoodFirms el rango público `$50–$99/h` y conservarlo solo si corresponde al modelo comercial real de Zyteron; el perfil figura como reclamado y por tanto puede administrarse.
5. Corregir el directorio que publica `251 Antonio Bellet, Providencia` si esa dirección no corresponde a una oficina pública.
6. Pedir a clientes que autorizan mostrar el proyecto una mención editorial desde su sitio hacia el caso o servicio pertinente; usar el nombre del proyecto o servicio como contexto, no anchors forzados repetidos.
7. Convertir casos autorizados en evidencia: problema, alcance, capturas, proceso y resultado medible. No publicar logos, nombres ni métricas sin permiso.
8. Evaluar directorios de asociaciones o cámaras chilenas únicamente cuando Zyteron sea miembro real y el perfil aporte información útil. No comprar paquetes masivos de backlinks.
9. Usar un Perfil de Empresa de Google solo si Zyteron presta atención presencial o visita clientes y cumple elegibilidad como negocio de área de servicio; ocultar la dirección si no recibe público. Un negocio exclusivamente online no debe forzar esta ficha.

Prioridad 3 — contenido que sí puede ganar enlaces y búsquedas:

1. Profundizar casos propios por industria solo cuando exista evidencia distinta y autorización.
2. Publicar comparativas basadas en experiencia real —por ejemplo, web corporativa frente a landing, catálogo o sistema— enlazando la solución correspondiente.
3. Actualizar contenidos que ya obtengan impresiones antes de abrir nuevas URLs.
4. Crear nuevas páginas por rubro únicamente cuando Search Console muestre demanda, Zyteron tenga una oferta diferenciada y sea posible aportar ejemplos propios. Sin esas tres condiciones, ampliar la URL principal.

### Tablero de seguimiento de 90 días

| Frecuencia | Revisión | Decisión |
| --- | --- | --- |
| Semanal | errores de indexación, formularios y disponibilidad | corregir fallas que impidan rastreo o contacto |
| Cada 28 días | consultas no marcarias, landing, CTR y posición | mejorar la página que ya recibe impresiones |
| Mensual | leads por origen y calidad comercial | priorizar servicios que generan oportunidades reales |
| Días 45–60 | URLs antiguas, redirects y cobertura del sitemap | mantener, reforzar o retirar señales duplicadas |
| Día 90 | tendencia por grupo de intención y conversiones | decidir el siguiente contenido o campaña con evidencia |

## Criterio de éxito

La mejora debe evaluarse con datos, no solo con posiciones aisladas:

- menor TTFB en páginas públicas;
- crecimiento de impresiones y clics no marcarios;
- aumento de visitas a `/contacto` desde páginas de servicio;
- mayor tasa de envío del formulario;
- leads con origen y tipo de proyecto correctamente registrados.

## Referencias primarias

- [Políticas de spam de Google: doorway abuse y contenido escalado](https://developers.google.com/search/docs/essentials/spam-policies)
- [Google Search Central: redirecciones permanentes 301 y 308](https://developers.google.com/search/docs/crawling-indexing/301-redirects)
- [Google Search Central: directrices de datos estructurados](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Google Search Essentials: palabras usadas por las personas y enlaces rastreables](https://developers.google.com/search/docs/essentials)
- [Google Search Central: buenas prácticas de enlaces y anchor text](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
- [Search Console: consultas con impresiones y CTR como oportunidades](https://support.google.com/webmasters/answer/17011259)
- [Kroki: estructura comercial observada para diseño web Chile](https://kroki.cl/)
- [Vínculo: tipos de páginas y preguntas de compra observadas](https://vinculo.cl/diseno-paginas-web)
- [Diseñando.cl: oferta observada para pymes y empresas](https://disenando.cl/diseno-paginas-web-para-pymes-empresas-landing-page/)
- [GoodFirms: perfil público actual de Zyteron](https://www.goodfirms.co/company/zyteron-spa)
- [The Manifest: perfil público actual de Zyteron](https://themanifest.com/company/zyteron-spa)
- [Cloudflare: regla Cache Everything y advertencias](https://developers.cloudflare.com/cache/how-to/cache-rules/examples/cache-everything/)
- [Render: limitaciones de servicios gratuitos](https://render.com/docs/free)
