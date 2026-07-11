-- =========================================================
-- AUTORIDAD: enlazado interno en los 5 posts seedeados
-- Ejecutar en Supabase SQL Editor DESPUÉS de seed_blog_casos_julio2026.sql.
--
-- Agrega una sección "## Sigue aprendiendo" al final de cada artículo con
-- enlaces internos a: otros artículos del blog, casos de éxito y páginas de
-- servicio. Esto distribuye autoridad entre URLs y ayuda a Google a entender
-- la relación temática del contenido.
--
-- Idempotente: sólo agrega la sección si el post no la tiene todavía
-- (content NOT LIKE '%## Sigue aprendiendo%'), se puede re-ejecutar.
-- El trigger de la tabla pondrá updatedAt = now(), lo que es correcto:
-- el contenido realmente cambió hoy.
-- =========================================================

update public."BlogPost"
set content = content || $md$

## Sigue aprendiendo

- [Velocidad web en mobile: el factor invisible que decide si te contactan](/blog/velocidad-web-mobile-conversion-pymes)
- [Correo con dominio propio: la señal de confianza más barata para tu pyme](/blog/correo-corporativo-dominio-propio-confianza)
- Si quieres que tu sitio acompañe al perfil con una base técnica sólida, revisa nuestro servicio de [SEO para empresas](/servicios/seo-para-empresas-chile).
$md$
where slug = 'perfil-empresa-google-pymes-chile'
  and status = 'published'
  and content not like '%## Sigue aprendiendo%';

update public."BlogPost"
set content = content || $md$

## Sigue aprendiendo

- [Agenda online para pymes de servicios: menos llamadas, más horas reservadas](/blog/agenda-online-pymes-servicios-chile)
- Mira cómo aplicamos esto en un caso real: [portal de clientes para estudio contable](/casos-exito/estudio-contable-portal-clientes-documentos)
- ¿Quieres un flujo de cotización que responda solo? Revisa [automatización para empresas](/automatizacion) o prueba el [cotizador online](/cotizador).
$md$
where slug = 'responder-cotizaciones-rapido-ganar-clientes'
  and status = 'published'
  and content not like '%## Sigue aprendiendo%';

update public."BlogPost"
set content = content || $md$

## Sigue aprendiendo

- [Responder cotizaciones en minutos: el hábito que más ventas genera en una pyme](/blog/responder-cotizaciones-rapido-ganar-clientes)
- Caso real con agenda: [reservas online y recordatorios para un centro dental](/casos-exito/centro-dental-agenda-online-recordatorios)
- Si tu operación necesita más que una agenda, revisa [sistemas web a medida](/sistemas-web).
$md$
where slug = 'agenda-online-pymes-servicios-chile'
  and status = 'published'
  and content not like '%## Sigue aprendiendo%';

update public."BlogPost"
set content = content || $md$

## Sigue aprendiendo

- [Perfil de Empresa en Google: cómo lograr que tu pyme aparezca en el mapa](/blog/perfil-empresa-google-pymes-chile)
- Un sitio rápido parte por una buena base: conoce nuestro [desarrollo web para empresas](/desarrollo-web)
- Si tu sitio actual necesita diagnóstico y mantención, revisa [soporte TI para pymes](/soporte-ti).
$md$
where slug = 'velocidad-web-mobile-conversion-pymes'
  and status = 'published'
  and content not like '%## Sigue aprendiendo%';

update public."BlogPost"
set content = content || $md$

## Sigue aprendiendo

- [Perfil de Empresa en Google: cómo lograr que tu pyme aparezca en el mapa](/blog/perfil-empresa-google-pymes-chile)
- Dominio, sitio y correo funcionan mejor como un solo proyecto: revisa [páginas web para pymes](/paginas-web-para-pymes)
- ¿Necesitas configurar tu correo corporativo con SPF, DKIM y DMARC? [Conversemos](/contacto).
$md$
where slug = 'correo-corporativo-dominio-propio-confianza'
  and status = 'published'
  and content not like '%## Sigue aprendiendo%';

-- Verificación rápida: debe devolver 5 filas con linked = true.
select slug, content like '%## Sigue aprendiendo%' as linked
from public."BlogPost"
where slug in (
  'perfil-empresa-google-pymes-chile',
  'responder-cotizaciones-rapido-ganar-clientes',
  'agenda-online-pymes-servicios-chile',
  'velocidad-web-mobile-conversion-pymes',
  'correo-corporativo-dominio-propio-confianza'
);
