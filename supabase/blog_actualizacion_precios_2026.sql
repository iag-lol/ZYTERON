-- =========================================================
-- ACTUALIZACION DE PRECIOS DEL BLOG - escalera comercial 2026
-- =========================================================
--
-- QUE HACE
-- --------
-- Reescribe los precios citados dentro de los articulos del blog que ya
-- estan PUBLICADOS en produccion, para que dejen de contradecir a /planes.
-- La escalera comercial cambio (src/config/pricing.ts es la fuente unica) y
-- los seeds originales usan ON CONFLICT (slug) DO NOTHING: corregirlos no
-- basta, porque sobre una fila existente no escriben nada. Este archivo es el
-- que efectivamente actualiza el contenido ya publicado.
--
-- Toca 12 articulos sembrados por:
--   * blog_seo_articles_parte1.sql
--   * blog_seo_articles_parte2.sql
--   * blog_restauracion_404.sql
-- y actualiza content, excerpt y "metaDescription" ademas de "updatedAt".
--
-- CUANDO EJECUTARLO
-- -----------------
-- Una sola vez, en el SQL Editor de Supabase, DESPUES de que el deploy con
-- los precios nuevos este en produccion. Requiere que blog_cases_bootstrap.sql
-- ya haya creado la tabla "BlogPost". Si los seeds nunca se ejecutaron, este
-- archivo no encuentra filas y simplemente no hace nada (no falla).
--
-- POR QUE REPLACE() Y NO UN CONTENIDO NUEVO COMPLETO
-- --------------------------------------------------
-- Para no pisar las ediciones hechas a mano desde /admin/blog. Solo se
-- sustituyen las frases exactas que contienen un precio.
--
-- IDEMPOTENTE
-- -----------
-- Cada sustitucion busca la frase completa CON el precio viejo; despues de la
-- primera ejecucion esa frase ya no existe, asi que volver a correr el archivo
-- no cambia nada. Ademas cada UPDATE lleva un guard "is distinct from", de
-- modo que en una segunda pasada no se toca ninguna fila ni se mueve
-- "updatedAt".
--
-- CUIDADO CON LOS NUMEROS AMBIGUOS
-- --------------------------------
-- El mismo monto significa cosas distintas segun el contexto, por eso NO se
-- reemplazan numeros sueltos sino frases completas. Casos reales:
--   * $79.990  -> web basica ($99.990), mantencion profesional ($99.990) o
--                 pagina adicional ($79.990, que NO cambia).
--   * $129.990 -> plan emprendedor ($179.990) o mantencion ecommerce
--                 ($169.990).
--   * $299.990 -> catalogo por WhatsApp ($349.990) o login de usuarios
--                 ($399.990).
--   * $249.990 -> automatizacion WhatsApp ($349.990), gestion de stock
--                 ($399.990) o generador de PDF ($349.990).
--   * $1.290.000 -> sistema web ($1.990.000), IA de cotizaciones ($1.690.000)
--                 o panel administrativo completo ($1.290.000, que NO cambia).
--   * $49.990  -> soporte TI por requerimiento: NO cambia.
--
-- Al final del archivo hay una consulta de verificacion: deberia devolver 0.
-- =========================================================

begin;

-- ---------------------------------------------------------
-- Cuanto cuesta una pagina web para una empresa en Chile
-- slug: cuanto-cuesta-pagina-web-empresa-chile  (22 sustituciones)
-- ---------------------------------------------------------
with nuevo as (
  select id,
         replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           content,
           'cuesta desde $79.990 + IVA en su versión más simple',
           'cuesta desde $99.990 + IVA en su versión más simple'),
           'entre $129.990 y $219.990 + IVA para sitios de emprendedores y pymes',
           'entre $179.990 y $299.990 + IVA para sitios de emprendedores y pymes'),
           'desde $399.990 + IVA para un sitio corporativo completo',
           'desde $549.990 + IVA para un sitio corporativo completo'),
           'desde $599.990 + IVA si necesitas una tienda online',
           'desde $749.990 + IVA si necesitas una tienda online'),
           'y desde $1.290.000 + IVA cuando el proyecto es un sistema web a medida',
           'y desde $1.990.000 + IVA cuando el proyecto es un sistema web a medida'),
           'integraciones) desde $1.000.000 hacia arriba',
           'integraciones) desde $1.500.000 hacia arriba'),
           -- Al pasar a "desde", la etiqueta de pago cerrado se contradice.
           '- **Web Básica**: $79.990 + IVA, pago único.',
           '- **Web Básica**: desde $99.990 + IVA.'),
           '- **Plan Emprendedor**: Desde $129.990 + IVA.',
           '- **Plan Emprendedor**: Desde $179.990 + IVA.'),
           '- **Plan Pyme**: Desde $219.990 + IVA.',
           '- **Plan Pyme**: Desde $299.990 + IVA.'),
           '- **Plan Empresa**: Desde $399.990 + IVA.',
           '- **Plan Empresa**: Desde $549.990 + IVA.'),
           '- **Catálogo por WhatsApp**: Desde $299.990 + IVA.',
           '- **Catálogo por WhatsApp**: Desde $349.990 + IVA.'),
           '- **Ecommerce con carrito y pagos**: Desde $599.990 + IVA.',
           '- **Ecommerce con carrito y pagos**: Desde $749.990 + IVA.'),
           '- **Sistema web administrativo**: Desde $1.290.000 + IVA.',
           '- **Sistema web administrativo**: Desde $1.990.000 + IVA.'),
           '- **Sistema avanzado a medida**: Desde $2.490.000 + IVA.',
           '- **Sistema avanzado a medida**: Desde $3.490.000 + IVA.'),
           'Con $79.990 + IVA de pago único',
           'Con $99.990 + IVA de pago único'),
           'Entre $129.990 y $399.990 + IVA según alcance.',
           'Entre $179.990 y $549.990 + IVA según alcance.'),
           'Desde $599.990 + IVA. Incluye catálogo de productos',
           'Desde $749.990 + IVA. Incluye catálogo de productos'),
           '[catálogo por WhatsApp](/tiendas-online) desde $299.990 + IVA',
           '[catálogo por WhatsApp](/tiendas-online) desde $349.990 + IVA'),
           'Desde $1.290.000 + IVA (y desde $2.490.000 + IVA en proyectos avanzados)',
           'Desde $1.990.000 + IVA (y desde $3.490.000 + IVA en proyectos avanzados)'),
           -- La Web Básica dejó de ser precio cerrado: decir "pago único"
           -- junto a un "desde" se contradice a sí mismo.
           '- **Web Básica**: desde $99.990 + IVA, pago único. Una página profesional',
           '- **Web Básica**: desde $99.990 + IVA. Una página profesional'),
           'Con $99.990 + IVA de pago único resuelves presencia, seriedad y contacto directo.',
           'Desde $99.990 + IVA resuelves presencia, seriedad y contacto directo.'),
           'va desde $39.990 + IVA al mes en sitios simples, desde $79.990 + IVA la mantención profesional, desde $129.990 + IVA en ecommerce y desde $199.990 + IVA en sistemas',
           'va desde $49.990 + IVA al mes en sitios simples, desde $99.990 + IVA la mantención profesional, desde $169.990 + IVA en ecommerce y desde $299.990 + IVA en sistemas'),
           'una web profesional desde $79.990 + IVA, un sitio corporativo serio en torno a los $219.990 + IVA, y proyectos de venta u operación desde $599.990 + IVA hacia arriba',
           'una web profesional desde $99.990 + IVA, un sitio corporativo serio en torno a los $299.990 + IVA, y proyectos de venta u operación desde $749.990 + IVA hacia arriba'),
           'una web básica parte en $79.990 + IVA, un sitio pyme desde $219.990, uno corporativo desde $399.990 y una tienda online desde $599.990.',
           'una web básica parte en $99.990 + IVA, un sitio pyme desde $299.990, uno corporativo desde $549.990 y una tienda online desde $749.990.') as content,
         replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           excerpt,
           'cuesta desde $79.990 + IVA en su versión más simple',
           'cuesta desde $99.990 + IVA en su versión más simple'),
           'entre $129.990 y $219.990 + IVA para sitios de emprendedores y pymes',
           'entre $179.990 y $299.990 + IVA para sitios de emprendedores y pymes'),
           'desde $399.990 + IVA para un sitio corporativo completo',
           'desde $549.990 + IVA para un sitio corporativo completo'),
           'desde $599.990 + IVA si necesitas una tienda online',
           'desde $749.990 + IVA si necesitas una tienda online'),
           'y desde $1.290.000 + IVA cuando el proyecto es un sistema web a medida',
           'y desde $1.990.000 + IVA cuando el proyecto es un sistema web a medida'),
           'integraciones) desde $1.000.000 hacia arriba',
           'integraciones) desde $1.500.000 hacia arriba'),
           -- Al pasar a "desde", la etiqueta de pago cerrado se contradice.
           '- **Web Básica**: $79.990 + IVA, pago único.',
           '- **Web Básica**: desde $99.990 + IVA.'),
           '- **Plan Emprendedor**: Desde $129.990 + IVA.',
           '- **Plan Emprendedor**: Desde $179.990 + IVA.'),
           '- **Plan Pyme**: Desde $219.990 + IVA.',
           '- **Plan Pyme**: Desde $299.990 + IVA.'),
           '- **Plan Empresa**: Desde $399.990 + IVA.',
           '- **Plan Empresa**: Desde $549.990 + IVA.'),
           '- **Catálogo por WhatsApp**: Desde $299.990 + IVA.',
           '- **Catálogo por WhatsApp**: Desde $349.990 + IVA.'),
           '- **Ecommerce con carrito y pagos**: Desde $599.990 + IVA.',
           '- **Ecommerce con carrito y pagos**: Desde $749.990 + IVA.'),
           '- **Sistema web administrativo**: Desde $1.290.000 + IVA.',
           '- **Sistema web administrativo**: Desde $1.990.000 + IVA.'),
           '- **Sistema avanzado a medida**: Desde $2.490.000 + IVA.',
           '- **Sistema avanzado a medida**: Desde $3.490.000 + IVA.'),
           'Con $79.990 + IVA de pago único',
           'Con $99.990 + IVA de pago único'),
           'Entre $129.990 y $399.990 + IVA según alcance.',
           'Entre $179.990 y $549.990 + IVA según alcance.'),
           'Desde $599.990 + IVA. Incluye catálogo de productos',
           'Desde $749.990 + IVA. Incluye catálogo de productos'),
           '[catálogo por WhatsApp](/tiendas-online) desde $299.990 + IVA',
           '[catálogo por WhatsApp](/tiendas-online) desde $349.990 + IVA'),
           'Desde $1.290.000 + IVA (y desde $2.490.000 + IVA en proyectos avanzados)',
           'Desde $1.990.000 + IVA (y desde $3.490.000 + IVA en proyectos avanzados)'),
           'va desde $39.990 + IVA al mes en sitios simples, desde $79.990 + IVA la mantención profesional, desde $129.990 + IVA en ecommerce y desde $199.990 + IVA en sistemas',
           'va desde $49.990 + IVA al mes en sitios simples, desde $99.990 + IVA la mantención profesional, desde $169.990 + IVA en ecommerce y desde $299.990 + IVA en sistemas'),
           'una web profesional desde $79.990 + IVA, un sitio corporativo serio en torno a los $219.990 + IVA, y proyectos de venta u operación desde $599.990 + IVA hacia arriba',
           'una web profesional desde $99.990 + IVA, un sitio corporativo serio en torno a los $299.990 + IVA, y proyectos de venta u operación desde $749.990 + IVA hacia arriba'),
           'una web básica parte en $79.990 + IVA, un sitio pyme desde $219.990, uno corporativo desde $399.990 y una tienda online desde $599.990.',
           'una web básica parte en $99.990 + IVA, un sitio pyme desde $299.990, uno corporativo desde $549.990 y una tienda online desde $749.990.') as excerpt,
         replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           "metaDescription",
           'cuesta desde $79.990 + IVA en su versión más simple',
           'cuesta desde $99.990 + IVA en su versión más simple'),
           'entre $129.990 y $219.990 + IVA para sitios de emprendedores y pymes',
           'entre $179.990 y $299.990 + IVA para sitios de emprendedores y pymes'),
           'desde $399.990 + IVA para un sitio corporativo completo',
           'desde $549.990 + IVA para un sitio corporativo completo'),
           'desde $599.990 + IVA si necesitas una tienda online',
           'desde $749.990 + IVA si necesitas una tienda online'),
           'y desde $1.290.000 + IVA cuando el proyecto es un sistema web a medida',
           'y desde $1.990.000 + IVA cuando el proyecto es un sistema web a medida'),
           'integraciones) desde $1.000.000 hacia arriba',
           'integraciones) desde $1.500.000 hacia arriba'),
           -- Al pasar a "desde", la etiqueta de pago cerrado se contradice.
           '- **Web Básica**: $79.990 + IVA, pago único.',
           '- **Web Básica**: desde $99.990 + IVA.'),
           '- **Plan Emprendedor**: Desde $129.990 + IVA.',
           '- **Plan Emprendedor**: Desde $179.990 + IVA.'),
           '- **Plan Pyme**: Desde $219.990 + IVA.',
           '- **Plan Pyme**: Desde $299.990 + IVA.'),
           '- **Plan Empresa**: Desde $399.990 + IVA.',
           '- **Plan Empresa**: Desde $549.990 + IVA.'),
           '- **Catálogo por WhatsApp**: Desde $299.990 + IVA.',
           '- **Catálogo por WhatsApp**: Desde $349.990 + IVA.'),
           '- **Ecommerce con carrito y pagos**: Desde $599.990 + IVA.',
           '- **Ecommerce con carrito y pagos**: Desde $749.990 + IVA.'),
           '- **Sistema web administrativo**: Desde $1.290.000 + IVA.',
           '- **Sistema web administrativo**: Desde $1.990.000 + IVA.'),
           '- **Sistema avanzado a medida**: Desde $2.490.000 + IVA.',
           '- **Sistema avanzado a medida**: Desde $3.490.000 + IVA.'),
           'Con $79.990 + IVA de pago único',
           'Con $99.990 + IVA de pago único'),
           'Entre $129.990 y $399.990 + IVA según alcance.',
           'Entre $179.990 y $549.990 + IVA según alcance.'),
           'Desde $599.990 + IVA. Incluye catálogo de productos',
           'Desde $749.990 + IVA. Incluye catálogo de productos'),
           '[catálogo por WhatsApp](/tiendas-online) desde $299.990 + IVA',
           '[catálogo por WhatsApp](/tiendas-online) desde $349.990 + IVA'),
           'Desde $1.290.000 + IVA (y desde $2.490.000 + IVA en proyectos avanzados)',
           'Desde $1.990.000 + IVA (y desde $3.490.000 + IVA en proyectos avanzados)'),
           'va desde $39.990 + IVA al mes en sitios simples, desde $79.990 + IVA la mantención profesional, desde $129.990 + IVA en ecommerce y desde $199.990 + IVA en sistemas',
           'va desde $49.990 + IVA al mes en sitios simples, desde $99.990 + IVA la mantención profesional, desde $169.990 + IVA en ecommerce y desde $299.990 + IVA en sistemas'),
           'una web profesional desde $79.990 + IVA, un sitio corporativo serio en torno a los $219.990 + IVA, y proyectos de venta u operación desde $599.990 + IVA hacia arriba',
           'una web profesional desde $99.990 + IVA, un sitio corporativo serio en torno a los $299.990 + IVA, y proyectos de venta u operación desde $749.990 + IVA hacia arriba'),
           'una web básica parte en $79.990 + IVA, un sitio pyme desde $219.990, uno corporativo desde $399.990 y una tienda online desde $599.990.',
           'una web básica parte en $99.990 + IVA, un sitio pyme desde $299.990, uno corporativo desde $549.990 y una tienda online desde $749.990.') as meta_description
  from public."BlogPost"
  where slug = 'cuanto-cuesta-pagina-web-empresa-chile'
)
update public."BlogPost" b
set content           = n.content,
    excerpt           = n.excerpt,
    "metaDescription" = n.meta_description,
    "updatedAt"       = now()
from nuevo n
where b.id = n.id
  and (b.content           is distinct from n.content
    or b.excerpt           is distinct from n.excerpt
    or b."metaDescription" is distinct from n.meta_description);

-- ---------------------------------------------------------
-- Que debe tener una pagina web profesional para una pyme
-- slug: que-debe-tener-pagina-web-profesional-pyme  (1 sustituciones)
-- ---------------------------------------------------------
with nuevo as (
  select id,
         replace(
           content,
           'el Plan Pyme parte desde $219.990 + IVA',
           'el Plan Pyme parte desde $299.990 + IVA') as content,
         replace(
           excerpt,
           'el Plan Pyme parte desde $219.990 + IVA',
           'el Plan Pyme parte desde $299.990 + IVA') as excerpt,
         replace(
           "metaDescription",
           'el Plan Pyme parte desde $219.990 + IVA',
           'el Plan Pyme parte desde $299.990 + IVA') as meta_description
  from public."BlogPost"
  where slug = 'que-debe-tener-pagina-web-profesional-pyme'
)
update public."BlogPost" b
set content           = n.content,
    excerpt           = n.excerpt,
    "metaDescription" = n.meta_description,
    "updatedAt"       = now()
from nuevo n
where b.id = n.id
  and (b.content           is distinct from n.content
    or b.excerpt           is distinct from n.excerpt
    or b."metaDescription" is distinct from n.meta_description);

-- ---------------------------------------------------------
-- Pagina web, tienda online o sistema web
-- slug: diferencia-pagina-web-tienda-online-sistema-web  (9 sustituciones)
-- ---------------------------------------------------------
with nuevo as (
  select id,
         replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           content,
           'genera contactos (desde $79.990 + IVA)',
           'genera contactos (desde $99.990 + IVA)'),
           'cobra en línea (desde $599.990 + IVA)',
           'cobra en línea (desde $749.990 + IVA)'),
           'clientes, stock (desde $1.290.000 + IVA)',
           'clientes, stock (desde $1.990.000 + IVA)'),
           'desde $79.990 + IVA una web básica de una página, desde $129.990 a $219.990 + IVA un sitio para emprendedores y pymes, y desde $399.990 + IVA un sitio corporativo completo',
           'desde $99.990 + IVA una web básica de una página, desde $179.990 a $299.990 + IVA un sitio para emprendedores y pymes, y desde $549.990 + IVA un sitio corporativo completo'),
           '**Precio de referencia**: desde $599.990 + IVA con carrito y pagos integrados. Y hay',
           '**Precio de referencia**: desde $749.990 + IVA con carrito y pagos integrados. Y hay'),
           '**catálogo por WhatsApp**, desde $299.990 + IVA,',
           '**catálogo por WhatsApp**, desde $349.990 + IVA,'),
           'desde $1.290.000 + IVA un sistema administrativo, y desde $2.490.000 + IVA proyectos avanzados',
           'desde $1.990.000 + IVA un sistema administrativo, y desde $3.490.000 + IVA proyectos avanzados'),
           'Página web: $79.990 + IVA (pyme desde $219.990, corporativo desde $399.990 + IVA). Tienda online: $599.990 + IVA (catálogo WhatsApp desde $299.990 + IVA). Sistema web: $1.290.000 + IVA.',
           'Página web: desde $99.990 + IVA (pyme desde $299.990, corporativo desde $549.990 + IVA). Tienda online: desde $749.990 + IVA (catálogo WhatsApp desde $349.990 + IVA). Sistema web: desde $1.990.000 + IVA.'),
           'que capte clientes (desde $79.990 + IVA)',
           'que capte clientes (desde $99.990 + IVA)') as content,
         replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           excerpt,
           'genera contactos (desde $79.990 + IVA)',
           'genera contactos (desde $99.990 + IVA)'),
           'cobra en línea (desde $599.990 + IVA)',
           'cobra en línea (desde $749.990 + IVA)'),
           'clientes, stock (desde $1.290.000 + IVA)',
           'clientes, stock (desde $1.990.000 + IVA)'),
           'desde $79.990 + IVA una web básica de una página, desde $129.990 a $219.990 + IVA un sitio para emprendedores y pymes, y desde $399.990 + IVA un sitio corporativo completo',
           'desde $99.990 + IVA una web básica de una página, desde $179.990 a $299.990 + IVA un sitio para emprendedores y pymes, y desde $549.990 + IVA un sitio corporativo completo'),
           '**Precio de referencia**: desde $599.990 + IVA con carrito y pagos integrados. Y hay',
           '**Precio de referencia**: desde $749.990 + IVA con carrito y pagos integrados. Y hay'),
           '**catálogo por WhatsApp**, desde $299.990 + IVA,',
           '**catálogo por WhatsApp**, desde $349.990 + IVA,'),
           'desde $1.290.000 + IVA un sistema administrativo, y desde $2.490.000 + IVA proyectos avanzados',
           'desde $1.990.000 + IVA un sistema administrativo, y desde $3.490.000 + IVA proyectos avanzados'),
           'Página web: $79.990 + IVA (pyme desde $219.990, corporativo desde $399.990 + IVA). Tienda online: $599.990 + IVA (catálogo WhatsApp desde $299.990 + IVA). Sistema web: $1.290.000 + IVA.',
           'Página web: desde $99.990 + IVA (pyme desde $299.990, corporativo desde $549.990 + IVA). Tienda online: desde $749.990 + IVA (catálogo WhatsApp desde $349.990 + IVA). Sistema web: desde $1.990.000 + IVA.'),
           'que capte clientes (desde $79.990 + IVA)',
           'que capte clientes (desde $99.990 + IVA)') as excerpt,
         replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           "metaDescription",
           'genera contactos (desde $79.990 + IVA)',
           'genera contactos (desde $99.990 + IVA)'),
           'cobra en línea (desde $599.990 + IVA)',
           'cobra en línea (desde $749.990 + IVA)'),
           'clientes, stock (desde $1.290.000 + IVA)',
           'clientes, stock (desde $1.990.000 + IVA)'),
           'desde $79.990 + IVA una web básica de una página, desde $129.990 a $219.990 + IVA un sitio para emprendedores y pymes, y desde $399.990 + IVA un sitio corporativo completo',
           'desde $99.990 + IVA una web básica de una página, desde $179.990 a $299.990 + IVA un sitio para emprendedores y pymes, y desde $549.990 + IVA un sitio corporativo completo'),
           '**Precio de referencia**: desde $599.990 + IVA con carrito y pagos integrados. Y hay',
           '**Precio de referencia**: desde $749.990 + IVA con carrito y pagos integrados. Y hay'),
           '**catálogo por WhatsApp**, desde $299.990 + IVA,',
           '**catálogo por WhatsApp**, desde $349.990 + IVA,'),
           'desde $1.290.000 + IVA un sistema administrativo, y desde $2.490.000 + IVA proyectos avanzados',
           'desde $1.990.000 + IVA un sistema administrativo, y desde $3.490.000 + IVA proyectos avanzados'),
           'Página web: $79.990 + IVA (pyme desde $219.990, corporativo desde $399.990 + IVA). Tienda online: $599.990 + IVA (catálogo WhatsApp desde $299.990 + IVA). Sistema web: $1.290.000 + IVA.',
           'Página web: desde $99.990 + IVA (pyme desde $299.990, corporativo desde $549.990 + IVA). Tienda online: desde $749.990 + IVA (catálogo WhatsApp desde $349.990 + IVA). Sistema web: desde $1.990.000 + IVA.'),
           'que capte clientes (desde $79.990 + IVA)',
           'que capte clientes (desde $99.990 + IVA)') as meta_description
  from public."BlogPost"
  where slug = 'diferencia-pagina-web-tienda-online-sistema-web'
)
update public."BlogPost" b
set content           = n.content,
    excerpt           = n.excerpt,
    "metaDescription" = n.meta_description,
    "updatedAt"       = now()
from nuevo n
where b.id = n.id
  and (b.content           is distinct from n.content
    or b.excerpt           is distinct from n.excerpt
    or b."metaDescription" is distinct from n.meta_description);

-- ---------------------------------------------------------
-- Que es un sistema web a medida
-- slug: que-es-sistema-web-a-medida  (6 sustituciones)
-- ---------------------------------------------------------
with nuevo as (
  select id,
         replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           content,
           'un sistema web administrativo parte desde $1.290.000 CLP + IVA',
           'un sistema web administrativo parte desde $1.990.000 CLP + IVA'),
           '- **Sistema web administrativo**: desde $1.290.000 CLP + IVA.',
           '- **Sistema web administrativo**: desde $1.990.000 CLP + IVA.'),
           '- **Sistema avanzado a medida**: desde $2.490.000 CLP + IVA.',
           '- **Sistema avanzado a medida**: desde $3.490.000 CLP + IVA.'),
           '- **Mantención mensual de sistema**: desde $199.990 CLP + IVA al mes',
           '- **Mantención mensual de sistema**: desde $299.990 CLP + IVA al mes'),
           'panel administrativo completo (desde $990.000 CLP + IVA), un sistema de reservas (desde $499.990 CLP + IVA) o un dashboard de reportes (desde $399.990 CLP + IVA)',
           'panel administrativo completo (desde $1.290.000 CLP + IVA), un sistema de reservas (desde $649.990 CLP + IVA) o un dashboard de reportes (desde $549.990 CLP + IVA)'),
           'precios desde $1.290.000 CLP + IVA y plazos reales por fase.',
           'precios desde $1.990.000 CLP + IVA y plazos reales por fase.') as content,
         replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           excerpt,
           'un sistema web administrativo parte desde $1.290.000 CLP + IVA',
           'un sistema web administrativo parte desde $1.990.000 CLP + IVA'),
           '- **Sistema web administrativo**: desde $1.290.000 CLP + IVA.',
           '- **Sistema web administrativo**: desde $1.990.000 CLP + IVA.'),
           '- **Sistema avanzado a medida**: desde $2.490.000 CLP + IVA.',
           '- **Sistema avanzado a medida**: desde $3.490.000 CLP + IVA.'),
           '- **Mantención mensual de sistema**: desde $199.990 CLP + IVA al mes',
           '- **Mantención mensual de sistema**: desde $299.990 CLP + IVA al mes'),
           'panel administrativo completo (desde $990.000 CLP + IVA), un sistema de reservas (desde $499.990 CLP + IVA) o un dashboard de reportes (desde $399.990 CLP + IVA)',
           'panel administrativo completo (desde $1.290.000 CLP + IVA), un sistema de reservas (desde $649.990 CLP + IVA) o un dashboard de reportes (desde $549.990 CLP + IVA)'),
           'precios desde $1.290.000 CLP + IVA y plazos reales por fase.',
           'precios desde $1.990.000 CLP + IVA y plazos reales por fase.') as excerpt,
         replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           "metaDescription",
           'un sistema web administrativo parte desde $1.290.000 CLP + IVA',
           'un sistema web administrativo parte desde $1.990.000 CLP + IVA'),
           '- **Sistema web administrativo**: desde $1.290.000 CLP + IVA.',
           '- **Sistema web administrativo**: desde $1.990.000 CLP + IVA.'),
           '- **Sistema avanzado a medida**: desde $2.490.000 CLP + IVA.',
           '- **Sistema avanzado a medida**: desde $3.490.000 CLP + IVA.'),
           '- **Mantención mensual de sistema**: desde $199.990 CLP + IVA al mes',
           '- **Mantención mensual de sistema**: desde $299.990 CLP + IVA al mes'),
           'panel administrativo completo (desde $990.000 CLP + IVA), un sistema de reservas (desde $499.990 CLP + IVA) o un dashboard de reportes (desde $399.990 CLP + IVA)',
           'panel administrativo completo (desde $1.290.000 CLP + IVA), un sistema de reservas (desde $649.990 CLP + IVA) o un dashboard de reportes (desde $549.990 CLP + IVA)'),
           'precios desde $1.290.000 CLP + IVA y plazos reales por fase.',
           'precios desde $1.990.000 CLP + IVA y plazos reales por fase.') as meta_description
  from public."BlogPost"
  where slug = 'que-es-sistema-web-a-medida'
)
update public."BlogPost" b
set content           = n.content,
    excerpt           = n.excerpt,
    "metaDescription" = n.meta_description,
    "updatedAt"       = now()
from nuevo n
where b.id = n.id
  and (b.content           is distinct from n.content
    or b.excerpt           is distinct from n.excerpt
    or b."metaDescription" is distinct from n.meta_description);

-- ---------------------------------------------------------
-- Automatizacion de WhatsApp para empresas
-- slug: automatizacion-whatsapp-empresas-casos-reales-chile  (8 sustituciones)
-- ---------------------------------------------------------
with nuevo as (
  select id,
         replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           content,
           'una automatización de WhatsApp parte desde $249.990 CLP + IVA como módulo de un sitio web',
           'una automatización de WhatsApp parte desde $349.990 CLP + IVA como módulo de un sitio web'),
           'atienden web y WhatsApp a la vez parten desde $1.690.000 CLP + IVA más un cargo mensual',
           'atienden web y WhatsApp a la vez parten desde $2.490.000 CLP + IVA más un cargo mensual'),
           'Como proyecto parte desde $299.990 CLP + IVA.',
           'Como proyecto parte desde $349.990 CLP + IVA.'),
           'respuestas y flujos estructurados): desde $249.990 CLP + IVA, más costos de consumo de mensajería',
           'respuestas y flujos estructurados): desde $349.990 CLP + IVA, más costos de consumo de mensajería'),
           'pedidos por conversación): desde $299.990 CLP + IVA.',
           'pedidos por conversación): desde $349.990 CLP + IVA.'),
           'panel de prospectos): desde $899.990 CLP + IVA de implementación, más desde $99.990 CLP + IVA mensuales.',
           'panel de prospectos): desde $1.190.000 CLP + IVA de implementación, más desde $129.990 CLP + IVA mensuales.'),
           'flujos automatizados): desde $1.690.000 CLP + IVA de implementación, más desde $199.990 CLP + IVA mensuales.',
           'flujos automatizados): desde $2.490.000 CLP + IVA de implementación, más desde $249.990 CLP + IVA mensuales.'),
           'Precios en Chile desde $249.990 CLP + IVA y cómo partir.',
           'Precios en Chile desde $349.990 CLP + IVA y cómo partir.') as content,
         replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           excerpt,
           'una automatización de WhatsApp parte desde $249.990 CLP + IVA como módulo de un sitio web',
           'una automatización de WhatsApp parte desde $349.990 CLP + IVA como módulo de un sitio web'),
           'atienden web y WhatsApp a la vez parten desde $1.690.000 CLP + IVA más un cargo mensual',
           'atienden web y WhatsApp a la vez parten desde $2.490.000 CLP + IVA más un cargo mensual'),
           'Como proyecto parte desde $299.990 CLP + IVA.',
           'Como proyecto parte desde $349.990 CLP + IVA.'),
           'respuestas y flujos estructurados): desde $249.990 CLP + IVA, más costos de consumo de mensajería',
           'respuestas y flujos estructurados): desde $349.990 CLP + IVA, más costos de consumo de mensajería'),
           'pedidos por conversación): desde $299.990 CLP + IVA.',
           'pedidos por conversación): desde $349.990 CLP + IVA.'),
           'panel de prospectos): desde $899.990 CLP + IVA de implementación, más desde $99.990 CLP + IVA mensuales.',
           'panel de prospectos): desde $1.190.000 CLP + IVA de implementación, más desde $129.990 CLP + IVA mensuales.'),
           'flujos automatizados): desde $1.690.000 CLP + IVA de implementación, más desde $199.990 CLP + IVA mensuales.',
           'flujos automatizados): desde $2.490.000 CLP + IVA de implementación, más desde $249.990 CLP + IVA mensuales.'),
           'Precios en Chile desde $249.990 CLP + IVA y cómo partir.',
           'Precios en Chile desde $349.990 CLP + IVA y cómo partir.') as excerpt,
         replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           replace(
           "metaDescription",
           'una automatización de WhatsApp parte desde $249.990 CLP + IVA como módulo de un sitio web',
           'una automatización de WhatsApp parte desde $349.990 CLP + IVA como módulo de un sitio web'),
           'atienden web y WhatsApp a la vez parten desde $1.690.000 CLP + IVA más un cargo mensual',
           'atienden web y WhatsApp a la vez parten desde $2.490.000 CLP + IVA más un cargo mensual'),
           'Como proyecto parte desde $299.990 CLP + IVA.',
           'Como proyecto parte desde $349.990 CLP + IVA.'),
           'respuestas y flujos estructurados): desde $249.990 CLP + IVA, más costos de consumo de mensajería',
           'respuestas y flujos estructurados): desde $349.990 CLP + IVA, más costos de consumo de mensajería'),
           'pedidos por conversación): desde $299.990 CLP + IVA.',
           'pedidos por conversación): desde $349.990 CLP + IVA.'),
           'panel de prospectos): desde $899.990 CLP + IVA de implementación, más desde $99.990 CLP + IVA mensuales.',
           'panel de prospectos): desde $1.190.000 CLP + IVA de implementación, más desde $129.990 CLP + IVA mensuales.'),
           'flujos automatizados): desde $1.690.000 CLP + IVA de implementación, más desde $199.990 CLP + IVA mensuales.',
           'flujos automatizados): desde $2.490.000 CLP + IVA de implementación, más desde $249.990 CLP + IVA mensuales.'),
           'Precios en Chile desde $249.990 CLP + IVA y cómo partir.',
           'Precios en Chile desde $349.990 CLP + IVA y cómo partir.') as meta_description
  from public."BlogPost"
  where slug = 'automatizacion-whatsapp-empresas-casos-reales-chile'
)
update public."BlogPost" b
set content           = n.content,
    excerpt           = n.excerpt,
    "metaDescription" = n.meta_description,
    "updatedAt"       = now()
from nuevo n
where b.id = n.id
  and (b.content           is distinct from n.content
    or b.excerpt           is distinct from n.excerpt
    or b."metaDescription" is distinct from n.meta_description);

-- ---------------------------------------------------------
-- Que debe incluir un sistema de gestion interno
-- slug: que-debe-incluir-sistema-gestion-interno-pymes  (5 sustituciones)
-- ---------------------------------------------------------
with nuevo as (
  select id,
         replace(
           replace(
           replace(
           replace(
           replace(
           content,
           '- **Mini panel administrativo**: desde $349.990 + IVA.',
           '- **Mini panel administrativo**: desde $499.990 + IVA.'),
           '- **Panel administrativo completo**: desde $990.000 + IVA, como servicio adicional',
           '- **Panel administrativo completo**: desde $1.290.000 + IVA, como servicio adicional'),
           '- **Sistema web administrativo**: desde $1.290.000 + IVA.',
           '- **Sistema web administrativo**: desde $1.990.000 + IVA.'),
           '- **Sistema avanzado a medida**: desde $2.490.000 + IVA, para proyectos',
           '- **Sistema avanzado a medida**: desde $3.490.000 + IVA, para proyectos'),
           'dashboard y reportes desde $399.990 + IVA, generador de PDF desde $249.990 + IVA, integración de API personalizada desde $349.990 + IVA.',
           'dashboard y reportes desde $549.990 + IVA, generador de PDF desde $349.990 + IVA, integración de API personalizada desde $499.990 + IVA.') as content,
         replace(
           replace(
           replace(
           replace(
           replace(
           excerpt,
           '- **Mini panel administrativo**: desde $349.990 + IVA.',
           '- **Mini panel administrativo**: desde $499.990 + IVA.'),
           '- **Panel administrativo completo**: desde $990.000 + IVA, como servicio adicional',
           '- **Panel administrativo completo**: desde $1.290.000 + IVA, como servicio adicional'),
           '- **Sistema web administrativo**: desde $1.290.000 + IVA.',
           '- **Sistema web administrativo**: desde $1.990.000 + IVA.'),
           '- **Sistema avanzado a medida**: desde $2.490.000 + IVA, para proyectos',
           '- **Sistema avanzado a medida**: desde $3.490.000 + IVA, para proyectos'),
           'dashboard y reportes desde $399.990 + IVA, generador de PDF desde $249.990 + IVA, integración de API personalizada desde $349.990 + IVA.',
           'dashboard y reportes desde $549.990 + IVA, generador de PDF desde $349.990 + IVA, integración de API personalizada desde $499.990 + IVA.') as excerpt,
         replace(
           replace(
           replace(
           replace(
           replace(
           "metaDescription",
           '- **Mini panel administrativo**: desde $349.990 + IVA.',
           '- **Mini panel administrativo**: desde $499.990 + IVA.'),
           '- **Panel administrativo completo**: desde $990.000 + IVA, como servicio adicional',
           '- **Panel administrativo completo**: desde $1.290.000 + IVA, como servicio adicional'),
           '- **Sistema web administrativo**: desde $1.290.000 + IVA.',
           '- **Sistema web administrativo**: desde $1.990.000 + IVA.'),
           '- **Sistema avanzado a medida**: desde $2.490.000 + IVA, para proyectos',
           '- **Sistema avanzado a medida**: desde $3.490.000 + IVA, para proyectos'),
           'dashboard y reportes desde $399.990 + IVA, generador de PDF desde $249.990 + IVA, integración de API personalizada desde $349.990 + IVA.',
           'dashboard y reportes desde $549.990 + IVA, generador de PDF desde $349.990 + IVA, integración de API personalizada desde $499.990 + IVA.') as meta_description
  from public."BlogPost"
  where slug = 'que-debe-incluir-sistema-gestion-interno-pymes'
)
update public."BlogPost" b
set content           = n.content,
    excerpt           = n.excerpt,
    "metaDescription" = n.meta_description,
    "updatedAt"       = now()
from nuevo n
where b.id = n.id
  and (b.content           is distinct from n.content
    or b.excerpt           is distinct from n.excerpt
    or b."metaDescription" is distinct from n.meta_description);

-- ---------------------------------------------------------
-- Soporte TI para pymes en Santiago
-- slug: soporte-ti-pymes-santiago-que-buscar-evitar  (2 sustituciones)
-- ---------------------------------------------------------
with nuevo as (
  select id,
         replace(
           replace(
           content,
           'y desde $39.990 + IVA al mes cuando la necesidad es recurrente',
           'y desde $49.990 + IVA al mes cuando la necesidad es recurrente'),
           'mantención mensual desde $39.990 + IVA para sitios simples, desde $79.990 + IVA para mantención profesional, desde $129.990 + IVA en ecommerce y desde $199.990 + IVA en sistemas.',
           'mantención mensual desde $49.990 + IVA para sitios simples, desde $99.990 + IVA para mantención profesional, desde $169.990 + IVA en ecommerce y desde $299.990 + IVA en sistemas.') as content,
         replace(
           replace(
           excerpt,
           'y desde $39.990 + IVA al mes cuando la necesidad es recurrente',
           'y desde $49.990 + IVA al mes cuando la necesidad es recurrente'),
           'mantención mensual desde $39.990 + IVA para sitios simples, desde $79.990 + IVA para mantención profesional, desde $129.990 + IVA en ecommerce y desde $199.990 + IVA en sistemas.',
           'mantención mensual desde $49.990 + IVA para sitios simples, desde $99.990 + IVA para mantención profesional, desde $169.990 + IVA en ecommerce y desde $299.990 + IVA en sistemas.') as excerpt,
         replace(
           replace(
           "metaDescription",
           'y desde $39.990 + IVA al mes cuando la necesidad es recurrente',
           'y desde $49.990 + IVA al mes cuando la necesidad es recurrente'),
           'mantención mensual desde $39.990 + IVA para sitios simples, desde $79.990 + IVA para mantención profesional, desde $129.990 + IVA en ecommerce y desde $199.990 + IVA en sistemas.',
           'mantención mensual desde $49.990 + IVA para sitios simples, desde $99.990 + IVA para mantención profesional, desde $169.990 + IVA en ecommerce y desde $299.990 + IVA en sistemas.') as meta_description
  from public."BlogPost"
  where slug = 'soporte-ti-pymes-santiago-que-buscar-evitar'
)
update public."BlogPost" b
set content           = n.content,
    excerpt           = n.excerpt,
    "metaDescription" = n.meta_description,
    "updatedAt"       = now()
from nuevo n
where b.id = n.id
  and (b.content           is distinct from n.content
    or b.excerpt           is distinct from n.excerpt
    or b."metaDescription" is distinct from n.meta_description);

-- ---------------------------------------------------------
-- Vender online en Chile sin Shopify
-- slug: vender-online-chile-sin-shopify-alternativas-pymes  (4 sustituciones)
-- ---------------------------------------------------------
with nuevo as (
  select id,
         replace(
           replace(
           replace(
           replace(
           content,
           'pedido por WhatsApp (desde $299.990 + IVA), una tienda a medida integrada a tu sitio (desde $599.990 + IVA)',
           'pedido por WhatsApp (desde $349.990 + IVA), una tienda a medida integrada a tu sitio (desde $749.990 + IVA)'),
           '**Precio de referencia**: desde $299.990 + IVA. Está desarrollado en detalle',
           '**Precio de referencia**: desde $349.990 + IVA. Está desarrollado en detalle'),
           '**Precio de referencia**: desde $599.990 + IVA con carrito y pagos integrados. Los complementos más pedidos son gestión de stock desde $249.990 + IVA e integración de pagos (Flow, Webpay, Mercado Pago) desde $149.990 + IVA.',
           '**Precio de referencia**: desde $749.990 + IVA con carrito y pagos integrados. Los complementos más pedidos son gestión de stock desde $399.990 + IVA e integración de pagos (Flow, Webpay, Mercado Pago) desde $199.990 + IVA.'),
           'Desde $129.990 + IVA al mes en ecommerce',
           'Desde $169.990 + IVA al mes en ecommerce') as content,
         replace(
           replace(
           replace(
           replace(
           excerpt,
           'pedido por WhatsApp (desde $299.990 + IVA), una tienda a medida integrada a tu sitio (desde $599.990 + IVA)',
           'pedido por WhatsApp (desde $349.990 + IVA), una tienda a medida integrada a tu sitio (desde $749.990 + IVA)'),
           '**Precio de referencia**: desde $299.990 + IVA. Está desarrollado en detalle',
           '**Precio de referencia**: desde $349.990 + IVA. Está desarrollado en detalle'),
           '**Precio de referencia**: desde $599.990 + IVA con carrito y pagos integrados. Los complementos más pedidos son gestión de stock desde $249.990 + IVA e integración de pagos (Flow, Webpay, Mercado Pago) desde $149.990 + IVA.',
           '**Precio de referencia**: desde $749.990 + IVA con carrito y pagos integrados. Los complementos más pedidos son gestión de stock desde $399.990 + IVA e integración de pagos (Flow, Webpay, Mercado Pago) desde $199.990 + IVA.'),
           'Desde $129.990 + IVA al mes en ecommerce',
           'Desde $169.990 + IVA al mes en ecommerce') as excerpt,
         replace(
           replace(
           replace(
           replace(
           "metaDescription",
           'pedido por WhatsApp (desde $299.990 + IVA), una tienda a medida integrada a tu sitio (desde $599.990 + IVA)',
           'pedido por WhatsApp (desde $349.990 + IVA), una tienda a medida integrada a tu sitio (desde $749.990 + IVA)'),
           '**Precio de referencia**: desde $299.990 + IVA. Está desarrollado en detalle',
           '**Precio de referencia**: desde $349.990 + IVA. Está desarrollado en detalle'),
           '**Precio de referencia**: desde $599.990 + IVA con carrito y pagos integrados. Los complementos más pedidos son gestión de stock desde $249.990 + IVA e integración de pagos (Flow, Webpay, Mercado Pago) desde $149.990 + IVA.',
           '**Precio de referencia**: desde $749.990 + IVA con carrito y pagos integrados. Los complementos más pedidos son gestión de stock desde $399.990 + IVA e integración de pagos (Flow, Webpay, Mercado Pago) desde $199.990 + IVA.'),
           'Desde $129.990 + IVA al mes en ecommerce',
           'Desde $169.990 + IVA al mes en ecommerce') as meta_description
  from public."BlogPost"
  where slug = 'vender-online-chile-sin-shopify-alternativas-pymes'
)
update public."BlogPost" b
set content           = n.content,
    excerpt           = n.excerpt,
    "metaDescription" = n.meta_description,
    "updatedAt"       = now()
from nuevo n
where b.id = n.id
  and (b.content           is distinct from n.content
    or b.excerpt           is distinct from n.excerpt
    or b."metaDescription" is distinct from n.meta_description);

-- ---------------------------------------------------------
-- Panel administrativo vs Excel
-- slug: panel-administrativo-vs-excel-salto-digital  (3 sustituciones)
-- ---------------------------------------------------------
with nuevo as (
  select id,
         replace(
           replace(
           replace(
           content,
           'que parte desde $349.990 + IVA en un mini panel y desde $1.290.000 + IVA en un sistema completo.',
           'que parte desde $499.990 + IVA en un mini panel y desde $1.990.000 + IVA en un sistema completo.'),
           'inversión de proyecto, desde $349.990 + IVA en versiones acotadas.',
           'inversión de proyecto, desde $499.990 + IVA en versiones acotadas.'),
           'mini panel administrativo desde $349.990 + IVA, panel administrativo completo desde $990.000 + IVA, sistema web administrativo desde $1.290.000 + IVA y dashboard con reportes desde $399.990 + IVA.',
           'mini panel administrativo desde $499.990 + IVA, panel administrativo completo desde $1.290.000 + IVA, sistema web administrativo desde $1.990.000 + IVA y dashboard con reportes desde $549.990 + IVA.') as content,
         replace(
           replace(
           replace(
           excerpt,
           'que parte desde $349.990 + IVA en un mini panel y desde $1.290.000 + IVA en un sistema completo.',
           'que parte desde $499.990 + IVA en un mini panel y desde $1.990.000 + IVA en un sistema completo.'),
           'inversión de proyecto, desde $349.990 + IVA en versiones acotadas.',
           'inversión de proyecto, desde $499.990 + IVA en versiones acotadas.'),
           'mini panel administrativo desde $349.990 + IVA, panel administrativo completo desde $990.000 + IVA, sistema web administrativo desde $1.290.000 + IVA y dashboard con reportes desde $399.990 + IVA.',
           'mini panel administrativo desde $499.990 + IVA, panel administrativo completo desde $1.290.000 + IVA, sistema web administrativo desde $1.990.000 + IVA y dashboard con reportes desde $549.990 + IVA.') as excerpt,
         replace(
           replace(
           replace(
           "metaDescription",
           'que parte desde $349.990 + IVA en un mini panel y desde $1.290.000 + IVA en un sistema completo.',
           'que parte desde $499.990 + IVA en un mini panel y desde $1.990.000 + IVA en un sistema completo.'),
           'inversión de proyecto, desde $349.990 + IVA en versiones acotadas.',
           'inversión de proyecto, desde $499.990 + IVA en versiones acotadas.'),
           'mini panel administrativo desde $349.990 + IVA, panel administrativo completo desde $990.000 + IVA, sistema web administrativo desde $1.290.000 + IVA y dashboard con reportes desde $399.990 + IVA.',
           'mini panel administrativo desde $499.990 + IVA, panel administrativo completo desde $1.290.000 + IVA, sistema web administrativo desde $1.990.000 + IVA y dashboard con reportes desde $549.990 + IVA.') as meta_description
  from public."BlogPost"
  where slug = 'panel-administrativo-vs-excel-salto-digital'
)
update public."BlogPost" b
set content           = n.content,
    excerpt           = n.excerpt,
    "metaDescription" = n.meta_description,
    "updatedAt"       = now()
from nuevo n
where b.id = n.id
  and (b.content           is distinct from n.content
    or b.excerpt           is distinct from n.excerpt
    or b."metaDescription" is distinct from n.meta_description);

-- ---------------------------------------------------------
-- Landing page vs sitio web completo
-- slug: landing-page-vs-sitio-web-completo-negocio  (5 sustituciones)
-- ---------------------------------------------------------
with nuevo as (
  select id,
         replace(
           replace(
           replace(
           replace(
           replace(
           content,
           -- Al pasar a "desde", la etiqueta de pago cerrado se contradice.
           '- **Web Básica**: $79.990 + IVA, pago único.',
           '- **Web Básica**: desde $99.990 + IVA.'),
           '- **Plan Emprendedor**: desde $129.990 + IVA.',
           '- **Plan Emprendedor**: desde $179.990 + IVA.'),
           '- **Plan Pyme**: desde $219.990 + IVA.',
           '- **Plan Pyme**: desde $299.990 + IVA.'),
           '- **Plan Empresa**: desde $399.990 + IVA.',
           '- **Plan Empresa**: desde $549.990 + IVA.'),
           '- **Página adicional**: desde $59.990 + IVA,',
           '- **Página adicional**: desde $79.990 + IVA,') as content,
         replace(
           replace(
           replace(
           replace(
           replace(
           excerpt,
           -- Al pasar a "desde", la etiqueta de pago cerrado se contradice.
           '- **Web Básica**: $79.990 + IVA, pago único.',
           '- **Web Básica**: desde $99.990 + IVA.'),
           '- **Plan Emprendedor**: desde $129.990 + IVA.',
           '- **Plan Emprendedor**: desde $179.990 + IVA.'),
           '- **Plan Pyme**: desde $219.990 + IVA.',
           '- **Plan Pyme**: desde $299.990 + IVA.'),
           '- **Plan Empresa**: desde $399.990 + IVA.',
           '- **Plan Empresa**: desde $549.990 + IVA.'),
           '- **Página adicional**: desde $59.990 + IVA,',
           '- **Página adicional**: desde $79.990 + IVA,') as excerpt,
         replace(
           replace(
           replace(
           replace(
           replace(
           "metaDescription",
           -- Al pasar a "desde", la etiqueta de pago cerrado se contradice.
           '- **Web Básica**: $79.990 + IVA, pago único.',
           '- **Web Básica**: desde $99.990 + IVA.'),
           '- **Plan Emprendedor**: desde $129.990 + IVA.',
           '- **Plan Emprendedor**: desde $179.990 + IVA.'),
           '- **Plan Pyme**: desde $219.990 + IVA.',
           '- **Plan Pyme**: desde $299.990 + IVA.'),
           '- **Plan Empresa**: desde $399.990 + IVA.',
           '- **Plan Empresa**: desde $549.990 + IVA.'),
           '- **Página adicional**: desde $59.990 + IVA,',
           '- **Página adicional**: desde $79.990 + IVA,') as meta_description
  from public."BlogPost"
  where slug = 'landing-page-vs-sitio-web-completo-negocio'
)
update public."BlogPost" b
set content           = n.content,
    excerpt           = n.excerpt,
    "metaDescription" = n.meta_description,
    "updatedAt"       = now()
from nuevo n
where b.id = n.id
  and (b.content           is distinct from n.content
    or b.excerpt           is distinct from n.excerpt
    or b."metaDescription" is distinct from n.meta_description);

-- ---------------------------------------------------------
-- Tienda online sin inventario (catalogo por WhatsApp)
-- slug: tienda-online-sin-inventario-catalogo-whatsapp  (4 sustituciones)
-- ---------------------------------------------------------
with nuevo as (
  select id,
         replace(
           replace(
           replace(
           replace(
           content,
           'Cuesta desde $299.990 + IVA, se lanza en semanas',
           'Cuesta desde $349.990 + IVA, se lanza en semanas'),
           'invertir en un ecommerce completo desde $599.990 + IVA.',
           'invertir en un ecommerce completo desde $749.990 + IVA.'),
           '[automatización](/automatizacion) y parte desde $249.990 + IVA.',
           '[automatización](/automatizacion) y parte desde $349.990 + IVA.'),
           'pasarela de pagos (integración desde $149.990 + IVA) y gestión de stock (desde $249.990 + IVA), o pasar directo a un ecommerce completo desde $599.990 + IVA.',
           'pasarela de pagos (integración desde $199.990 + IVA) y gestión de stock (desde $399.990 + IVA), o pasar directo a un ecommerce completo desde $749.990 + IVA.') as content,
         replace(
           replace(
           replace(
           replace(
           excerpt,
           'Cuesta desde $299.990 + IVA, se lanza en semanas',
           'Cuesta desde $349.990 + IVA, se lanza en semanas'),
           'invertir en un ecommerce completo desde $599.990 + IVA.',
           'invertir en un ecommerce completo desde $749.990 + IVA.'),
           '[automatización](/automatizacion) y parte desde $249.990 + IVA.',
           '[automatización](/automatizacion) y parte desde $349.990 + IVA.'),
           'pasarela de pagos (integración desde $149.990 + IVA) y gestión de stock (desde $249.990 + IVA), o pasar directo a un ecommerce completo desde $599.990 + IVA.',
           'pasarela de pagos (integración desde $199.990 + IVA) y gestión de stock (desde $399.990 + IVA), o pasar directo a un ecommerce completo desde $749.990 + IVA.') as excerpt,
         replace(
           replace(
           replace(
           replace(
           "metaDescription",
           'Cuesta desde $299.990 + IVA, se lanza en semanas',
           'Cuesta desde $349.990 + IVA, se lanza en semanas'),
           'invertir en un ecommerce completo desde $599.990 + IVA.',
           'invertir en un ecommerce completo desde $749.990 + IVA.'),
           '[automatización](/automatizacion) y parte desde $249.990 + IVA.',
           '[automatización](/automatizacion) y parte desde $349.990 + IVA.'),
           'pasarela de pagos (integración desde $149.990 + IVA) y gestión de stock (desde $249.990 + IVA), o pasar directo a un ecommerce completo desde $599.990 + IVA.',
           'pasarela de pagos (integración desde $199.990 + IVA) y gestión de stock (desde $399.990 + IVA), o pasar directo a un ecommerce completo desde $749.990 + IVA.') as meta_description
  from public."BlogPost"
  where slug = 'tienda-online-sin-inventario-catalogo-whatsapp'
)
update public."BlogPost" b
set content           = n.content,
    excerpt           = n.excerpt,
    "metaDescription" = n.meta_description,
    "updatedAt"       = now()
from nuevo n
where b.id = n.id
  and (b.content           is distinct from n.content
    or b.excerpt           is distinct from n.excerpt
    or b."metaDescription" is distinct from n.meta_description);

-- ---------------------------------------------------------
-- Como medir el ROI de una pagina web B2B
-- slug: medir-roi-pagina-web-empresa-b2b  (1 sustituciones)
-- ---------------------------------------------------------
with nuevo as (
  select id,
         replace(
           content,
           'Si el sitio costó $399.990 + IVA y esperas que sirva tres años, son unos $11.100 mensuales.',
           'Si el sitio costó $549.990 + IVA y esperas que sirva tres años, son unos $15.300 mensuales.') as content,
         replace(
           excerpt,
           'Si el sitio costó $399.990 + IVA y esperas que sirva tres años, son unos $11.100 mensuales.',
           'Si el sitio costó $549.990 + IVA y esperas que sirva tres años, son unos $15.300 mensuales.') as excerpt,
         replace(
           "metaDescription",
           'Si el sitio costó $399.990 + IVA y esperas que sirva tres años, son unos $11.100 mensuales.',
           'Si el sitio costó $549.990 + IVA y esperas que sirva tres años, son unos $15.300 mensuales.') as meta_description
  from public."BlogPost"
  where slug = 'medir-roi-pagina-web-empresa-b2b'
)
update public."BlogPost" b
set content           = n.content,
    excerpt           = n.excerpt,
    "metaDescription" = n.meta_description,
    "updatedAt"       = now()
from nuevo n
where b.id = n.id
  and (b.content           is distinct from n.content
    or b.excerpt           is distinct from n.excerpt
    or b."metaDescription" is distinct from n.meta_description);

commit;

-- =========================================================
-- VERIFICACION 1 (la principal): cuantos articulos siguen conteniendo
-- alguna de las frases con cifra antigua. Debe devolver 0.
-- =========================================================
with frases_antiguas (slug, frase) as (values
  ('cuanto-cuesta-pagina-web-empresa-chile', 'cuesta desde $79.990 + IVA en su versión más simple'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'entre $129.990 y $219.990 + IVA para sitios de emprendedores y pymes'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'desde $399.990 + IVA para un sitio corporativo completo'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'desde $599.990 + IVA si necesitas una tienda online'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'y desde $1.290.000 + IVA cuando el proyecto es un sistema web a medida'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'integraciones) desde $1.000.000 hacia arriba'),
  ('cuanto-cuesta-pagina-web-empresa-chile', '- **Web Básica**: $79.990 + IVA, pago único.'),
  ('cuanto-cuesta-pagina-web-empresa-chile', '- **Plan Emprendedor**: Desde $129.990 + IVA.'),
  ('cuanto-cuesta-pagina-web-empresa-chile', '- **Plan Pyme**: Desde $219.990 + IVA.'),
  ('cuanto-cuesta-pagina-web-empresa-chile', '- **Plan Empresa**: Desde $399.990 + IVA.'),
  ('cuanto-cuesta-pagina-web-empresa-chile', '- **Catálogo por WhatsApp**: Desde $299.990 + IVA.'),
  ('cuanto-cuesta-pagina-web-empresa-chile', '- **Ecommerce con carrito y pagos**: Desde $599.990 + IVA.'),
  ('cuanto-cuesta-pagina-web-empresa-chile', '- **Sistema web administrativo**: Desde $1.290.000 + IVA.'),
  ('cuanto-cuesta-pagina-web-empresa-chile', '- **Sistema avanzado a medida**: Desde $2.490.000 + IVA.'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'Con $79.990 + IVA de pago único'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'Entre $129.990 y $399.990 + IVA según alcance.'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'Desde $599.990 + IVA. Incluye catálogo de productos'),
  ('cuanto-cuesta-pagina-web-empresa-chile', '[catálogo por WhatsApp](/tiendas-online) desde $299.990 + IVA'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'Desde $1.290.000 + IVA (y desde $2.490.000 + IVA en proyectos avanzados)'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'va desde $39.990 + IVA al mes en sitios simples, desde $79.990 + IVA la mantención profesional, desde $129.990 + IVA en ecommerce y desde $199.990 + IVA en sistemas'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'una web profesional desde $79.990 + IVA, un sitio corporativo serio en torno a los $219.990 + IVA, y proyectos de venta u operación desde $599.990 + IVA hacia arriba'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'una web básica parte en $79.990 + IVA, un sitio pyme desde $219.990, uno corporativo desde $399.990 y una tienda online desde $599.990.'),
  ('que-debe-tener-pagina-web-profesional-pyme', 'el Plan Pyme parte desde $219.990 + IVA'),
  ('diferencia-pagina-web-tienda-online-sistema-web', 'genera contactos (desde $79.990 + IVA)'),
  ('diferencia-pagina-web-tienda-online-sistema-web', 'cobra en línea (desde $599.990 + IVA)'),
  ('diferencia-pagina-web-tienda-online-sistema-web', 'clientes, stock (desde $1.290.000 + IVA)'),
  ('diferencia-pagina-web-tienda-online-sistema-web', 'desde $79.990 + IVA una web básica de una página, desde $129.990 a $219.990 + IVA un sitio para emprendedores y pymes, y desde $399.990 + IVA un sitio corporativo completo'),
  ('diferencia-pagina-web-tienda-online-sistema-web', '**Precio de referencia**: desde $599.990 + IVA con carrito y pagos integrados. Y hay'),
  ('diferencia-pagina-web-tienda-online-sistema-web', '**catálogo por WhatsApp**, desde $299.990 + IVA,'),
  ('diferencia-pagina-web-tienda-online-sistema-web', 'desde $1.290.000 + IVA un sistema administrativo, y desde $2.490.000 + IVA proyectos avanzados'),
  ('diferencia-pagina-web-tienda-online-sistema-web', 'Página web: $79.990 + IVA (pyme desde $219.990, corporativo desde $399.990 + IVA). Tienda online: $599.990 + IVA (catálogo WhatsApp desde $299.990 + IVA). Sistema web: $1.290.000 + IVA.'),
  ('diferencia-pagina-web-tienda-online-sistema-web', 'que capte clientes (desde $79.990 + IVA)'),
  ('que-es-sistema-web-a-medida', 'un sistema web administrativo parte desde $1.290.000 CLP + IVA'),
  ('que-es-sistema-web-a-medida', '- **Sistema web administrativo**: desde $1.290.000 CLP + IVA.'),
  ('que-es-sistema-web-a-medida', '- **Sistema avanzado a medida**: desde $2.490.000 CLP + IVA.'),
  ('que-es-sistema-web-a-medida', '- **Mantención mensual de sistema**: desde $199.990 CLP + IVA al mes'),
  ('que-es-sistema-web-a-medida', 'panel administrativo completo (desde $990.000 CLP + IVA), un sistema de reservas (desde $499.990 CLP + IVA) o un dashboard de reportes (desde $399.990 CLP + IVA)'),
  ('que-es-sistema-web-a-medida', 'precios desde $1.290.000 CLP + IVA y plazos reales por fase.'),
  ('automatizacion-whatsapp-empresas-casos-reales-chile', 'una automatización de WhatsApp parte desde $249.990 CLP + IVA como módulo de un sitio web'),
  ('automatizacion-whatsapp-empresas-casos-reales-chile', 'atienden web y WhatsApp a la vez parten desde $1.690.000 CLP + IVA más un cargo mensual'),
  ('automatizacion-whatsapp-empresas-casos-reales-chile', 'Como proyecto parte desde $299.990 CLP + IVA.'),
  ('automatizacion-whatsapp-empresas-casos-reales-chile', 'respuestas y flujos estructurados): desde $249.990 CLP + IVA, más costos de consumo de mensajería'),
  ('automatizacion-whatsapp-empresas-casos-reales-chile', 'pedidos por conversación): desde $299.990 CLP + IVA.'),
  ('automatizacion-whatsapp-empresas-casos-reales-chile', 'panel de prospectos): desde $899.990 CLP + IVA de implementación, más desde $99.990 CLP + IVA mensuales.'),
  ('automatizacion-whatsapp-empresas-casos-reales-chile', 'flujos automatizados): desde $1.690.000 CLP + IVA de implementación, más desde $199.990 CLP + IVA mensuales.'),
  ('automatizacion-whatsapp-empresas-casos-reales-chile', 'Precios en Chile desde $249.990 CLP + IVA y cómo partir.'),
  ('que-debe-incluir-sistema-gestion-interno-pymes', '- **Mini panel administrativo**: desde $349.990 + IVA.'),
  ('que-debe-incluir-sistema-gestion-interno-pymes', '- **Panel administrativo completo**: desde $990.000 + IVA, como servicio adicional'),
  ('que-debe-incluir-sistema-gestion-interno-pymes', '- **Sistema web administrativo**: desde $1.290.000 + IVA.'),
  ('que-debe-incluir-sistema-gestion-interno-pymes', '- **Sistema avanzado a medida**: desde $2.490.000 + IVA, para proyectos'),
  ('que-debe-incluir-sistema-gestion-interno-pymes', 'dashboard y reportes desde $399.990 + IVA, generador de PDF desde $249.990 + IVA, integración de API personalizada desde $349.990 + IVA.'),
  ('soporte-ti-pymes-santiago-que-buscar-evitar', 'y desde $39.990 + IVA al mes cuando la necesidad es recurrente'),
  ('soporte-ti-pymes-santiago-que-buscar-evitar', 'mantención mensual desde $39.990 + IVA para sitios simples, desde $79.990 + IVA para mantención profesional, desde $129.990 + IVA en ecommerce y desde $199.990 + IVA en sistemas.'),
  ('vender-online-chile-sin-shopify-alternativas-pymes', 'pedido por WhatsApp (desde $299.990 + IVA), una tienda a medida integrada a tu sitio (desde $599.990 + IVA)'),
  ('vender-online-chile-sin-shopify-alternativas-pymes', '**Precio de referencia**: desde $299.990 + IVA. Está desarrollado en detalle'),
  ('vender-online-chile-sin-shopify-alternativas-pymes', '**Precio de referencia**: desde $599.990 + IVA con carrito y pagos integrados. Los complementos más pedidos son gestión de stock desde $249.990 + IVA e integración de pagos (Flow, Webpay, Mercado Pago) desde $149.990 + IVA.'),
  ('vender-online-chile-sin-shopify-alternativas-pymes', 'Desde $129.990 + IVA al mes en ecommerce'),
  ('panel-administrativo-vs-excel-salto-digital', 'que parte desde $349.990 + IVA en un mini panel y desde $1.290.000 + IVA en un sistema completo.'),
  ('panel-administrativo-vs-excel-salto-digital', 'inversión de proyecto, desde $349.990 + IVA en versiones acotadas.'),
  ('panel-administrativo-vs-excel-salto-digital', 'mini panel administrativo desde $349.990 + IVA, panel administrativo completo desde $990.000 + IVA, sistema web administrativo desde $1.290.000 + IVA y dashboard con reportes desde $399.990 + IVA.'),
  ('landing-page-vs-sitio-web-completo-negocio', '- **Web Básica**: $79.990 + IVA, pago único.'),
  ('landing-page-vs-sitio-web-completo-negocio', '- **Plan Emprendedor**: desde $129.990 + IVA.'),
  ('landing-page-vs-sitio-web-completo-negocio', '- **Plan Pyme**: desde $219.990 + IVA.'),
  ('landing-page-vs-sitio-web-completo-negocio', '- **Plan Empresa**: desde $399.990 + IVA.'),
  ('landing-page-vs-sitio-web-completo-negocio', '- **Página adicional**: desde $59.990 + IVA,'),
  ('tienda-online-sin-inventario-catalogo-whatsapp', 'Cuesta desde $299.990 + IVA, se lanza en semanas'),
  ('tienda-online-sin-inventario-catalogo-whatsapp', 'invertir en un ecommerce completo desde $599.990 + IVA.'),
  ('tienda-online-sin-inventario-catalogo-whatsapp', '[automatización](/automatizacion) y parte desde $249.990 + IVA.'),
  ('tienda-online-sin-inventario-catalogo-whatsapp', 'pasarela de pagos (integración desde $149.990 + IVA) y gestión de stock (desde $249.990 + IVA), o pasar directo a un ecommerce completo desde $599.990 + IVA.'),
  ('medir-roi-pagina-web-empresa-b2b', 'Si el sitio costó $399.990 + IVA y esperas que sirva tres años, son unos $11.100 mensuales.')
)
select count(*) as "articulos_con_cifras_antiguas"
from (
  select distinct b.slug
  from public."BlogPost" b
  join frases_antiguas f on f.slug = b.slug
  where coalesce(b.content, '') || ' ' || coalesce(b.excerpt, '') || ' ' ||
        coalesce(b."metaDescription", '') like '%' || f.frase || '%'
) t;

-- =========================================================
-- VERIFICACION 2 (detalle): que quedo sin migrar, si es que quedo algo.
-- Lo ideal es que no devuelva ninguna fila.
-- =========================================================
with frases_antiguas (slug, frase) as (values
  ('cuanto-cuesta-pagina-web-empresa-chile', 'cuesta desde $79.990 + IVA en su versión más simple'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'entre $129.990 y $219.990 + IVA para sitios de emprendedores y pymes'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'desde $399.990 + IVA para un sitio corporativo completo'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'desde $599.990 + IVA si necesitas una tienda online'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'y desde $1.290.000 + IVA cuando el proyecto es un sistema web a medida'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'integraciones) desde $1.000.000 hacia arriba'),
  ('cuanto-cuesta-pagina-web-empresa-chile', '- **Web Básica**: $79.990 + IVA, pago único.'),
  ('cuanto-cuesta-pagina-web-empresa-chile', '- **Plan Emprendedor**: Desde $129.990 + IVA.'),
  ('cuanto-cuesta-pagina-web-empresa-chile', '- **Plan Pyme**: Desde $219.990 + IVA.'),
  ('cuanto-cuesta-pagina-web-empresa-chile', '- **Plan Empresa**: Desde $399.990 + IVA.'),
  ('cuanto-cuesta-pagina-web-empresa-chile', '- **Catálogo por WhatsApp**: Desde $299.990 + IVA.'),
  ('cuanto-cuesta-pagina-web-empresa-chile', '- **Ecommerce con carrito y pagos**: Desde $599.990 + IVA.'),
  ('cuanto-cuesta-pagina-web-empresa-chile', '- **Sistema web administrativo**: Desde $1.290.000 + IVA.'),
  ('cuanto-cuesta-pagina-web-empresa-chile', '- **Sistema avanzado a medida**: Desde $2.490.000 + IVA.'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'Con $79.990 + IVA de pago único'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'Entre $129.990 y $399.990 + IVA según alcance.'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'Desde $599.990 + IVA. Incluye catálogo de productos'),
  ('cuanto-cuesta-pagina-web-empresa-chile', '[catálogo por WhatsApp](/tiendas-online) desde $299.990 + IVA'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'Desde $1.290.000 + IVA (y desde $2.490.000 + IVA en proyectos avanzados)'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'va desde $39.990 + IVA al mes en sitios simples, desde $79.990 + IVA la mantención profesional, desde $129.990 + IVA en ecommerce y desde $199.990 + IVA en sistemas'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'una web profesional desde $79.990 + IVA, un sitio corporativo serio en torno a los $219.990 + IVA, y proyectos de venta u operación desde $599.990 + IVA hacia arriba'),
  ('cuanto-cuesta-pagina-web-empresa-chile', 'una web básica parte en $79.990 + IVA, un sitio pyme desde $219.990, uno corporativo desde $399.990 y una tienda online desde $599.990.'),
  ('que-debe-tener-pagina-web-profesional-pyme', 'el Plan Pyme parte desde $219.990 + IVA'),
  ('diferencia-pagina-web-tienda-online-sistema-web', 'genera contactos (desde $79.990 + IVA)'),
  ('diferencia-pagina-web-tienda-online-sistema-web', 'cobra en línea (desde $599.990 + IVA)'),
  ('diferencia-pagina-web-tienda-online-sistema-web', 'clientes, stock (desde $1.290.000 + IVA)'),
  ('diferencia-pagina-web-tienda-online-sistema-web', 'desde $79.990 + IVA una web básica de una página, desde $129.990 a $219.990 + IVA un sitio para emprendedores y pymes, y desde $399.990 + IVA un sitio corporativo completo'),
  ('diferencia-pagina-web-tienda-online-sistema-web', '**Precio de referencia**: desde $599.990 + IVA con carrito y pagos integrados. Y hay'),
  ('diferencia-pagina-web-tienda-online-sistema-web', '**catálogo por WhatsApp**, desde $299.990 + IVA,'),
  ('diferencia-pagina-web-tienda-online-sistema-web', 'desde $1.290.000 + IVA un sistema administrativo, y desde $2.490.000 + IVA proyectos avanzados'),
  ('diferencia-pagina-web-tienda-online-sistema-web', 'Página web: $79.990 + IVA (pyme desde $219.990, corporativo desde $399.990 + IVA). Tienda online: $599.990 + IVA (catálogo WhatsApp desde $299.990 + IVA). Sistema web: $1.290.000 + IVA.'),
  ('diferencia-pagina-web-tienda-online-sistema-web', 'que capte clientes (desde $79.990 + IVA)'),
  ('que-es-sistema-web-a-medida', 'un sistema web administrativo parte desde $1.290.000 CLP + IVA'),
  ('que-es-sistema-web-a-medida', '- **Sistema web administrativo**: desde $1.290.000 CLP + IVA.'),
  ('que-es-sistema-web-a-medida', '- **Sistema avanzado a medida**: desde $2.490.000 CLP + IVA.'),
  ('que-es-sistema-web-a-medida', '- **Mantención mensual de sistema**: desde $199.990 CLP + IVA al mes'),
  ('que-es-sistema-web-a-medida', 'panel administrativo completo (desde $990.000 CLP + IVA), un sistema de reservas (desde $499.990 CLP + IVA) o un dashboard de reportes (desde $399.990 CLP + IVA)'),
  ('que-es-sistema-web-a-medida', 'precios desde $1.290.000 CLP + IVA y plazos reales por fase.'),
  ('automatizacion-whatsapp-empresas-casos-reales-chile', 'una automatización de WhatsApp parte desde $249.990 CLP + IVA como módulo de un sitio web'),
  ('automatizacion-whatsapp-empresas-casos-reales-chile', 'atienden web y WhatsApp a la vez parten desde $1.690.000 CLP + IVA más un cargo mensual'),
  ('automatizacion-whatsapp-empresas-casos-reales-chile', 'Como proyecto parte desde $299.990 CLP + IVA.'),
  ('automatizacion-whatsapp-empresas-casos-reales-chile', 'respuestas y flujos estructurados): desde $249.990 CLP + IVA, más costos de consumo de mensajería'),
  ('automatizacion-whatsapp-empresas-casos-reales-chile', 'pedidos por conversación): desde $299.990 CLP + IVA.'),
  ('automatizacion-whatsapp-empresas-casos-reales-chile', 'panel de prospectos): desde $899.990 CLP + IVA de implementación, más desde $99.990 CLP + IVA mensuales.'),
  ('automatizacion-whatsapp-empresas-casos-reales-chile', 'flujos automatizados): desde $1.690.000 CLP + IVA de implementación, más desde $199.990 CLP + IVA mensuales.'),
  ('automatizacion-whatsapp-empresas-casos-reales-chile', 'Precios en Chile desde $249.990 CLP + IVA y cómo partir.'),
  ('que-debe-incluir-sistema-gestion-interno-pymes', '- **Mini panel administrativo**: desde $349.990 + IVA.'),
  ('que-debe-incluir-sistema-gestion-interno-pymes', '- **Panel administrativo completo**: desde $990.000 + IVA, como servicio adicional'),
  ('que-debe-incluir-sistema-gestion-interno-pymes', '- **Sistema web administrativo**: desde $1.290.000 + IVA.'),
  ('que-debe-incluir-sistema-gestion-interno-pymes', '- **Sistema avanzado a medida**: desde $2.490.000 + IVA, para proyectos'),
  ('que-debe-incluir-sistema-gestion-interno-pymes', 'dashboard y reportes desde $399.990 + IVA, generador de PDF desde $249.990 + IVA, integración de API personalizada desde $349.990 + IVA.'),
  ('soporte-ti-pymes-santiago-que-buscar-evitar', 'y desde $39.990 + IVA al mes cuando la necesidad es recurrente'),
  ('soporte-ti-pymes-santiago-que-buscar-evitar', 'mantención mensual desde $39.990 + IVA para sitios simples, desde $79.990 + IVA para mantención profesional, desde $129.990 + IVA en ecommerce y desde $199.990 + IVA en sistemas.'),
  ('vender-online-chile-sin-shopify-alternativas-pymes', 'pedido por WhatsApp (desde $299.990 + IVA), una tienda a medida integrada a tu sitio (desde $599.990 + IVA)'),
  ('vender-online-chile-sin-shopify-alternativas-pymes', '**Precio de referencia**: desde $299.990 + IVA. Está desarrollado en detalle'),
  ('vender-online-chile-sin-shopify-alternativas-pymes', '**Precio de referencia**: desde $599.990 + IVA con carrito y pagos integrados. Los complementos más pedidos son gestión de stock desde $249.990 + IVA e integración de pagos (Flow, Webpay, Mercado Pago) desde $149.990 + IVA.'),
  ('vender-online-chile-sin-shopify-alternativas-pymes', 'Desde $129.990 + IVA al mes en ecommerce'),
  ('panel-administrativo-vs-excel-salto-digital', 'que parte desde $349.990 + IVA en un mini panel y desde $1.290.000 + IVA en un sistema completo.'),
  ('panel-administrativo-vs-excel-salto-digital', 'inversión de proyecto, desde $349.990 + IVA en versiones acotadas.'),
  ('panel-administrativo-vs-excel-salto-digital', 'mini panel administrativo desde $349.990 + IVA, panel administrativo completo desde $990.000 + IVA, sistema web administrativo desde $1.290.000 + IVA y dashboard con reportes desde $399.990 + IVA.'),
  ('landing-page-vs-sitio-web-completo-negocio', '- **Web Básica**: $79.990 + IVA, pago único.'),
  ('landing-page-vs-sitio-web-completo-negocio', '- **Plan Emprendedor**: desde $129.990 + IVA.'),
  ('landing-page-vs-sitio-web-completo-negocio', '- **Plan Pyme**: desde $219.990 + IVA.'),
  ('landing-page-vs-sitio-web-completo-negocio', '- **Plan Empresa**: desde $399.990 + IVA.'),
  ('landing-page-vs-sitio-web-completo-negocio', '- **Página adicional**: desde $59.990 + IVA,'),
  ('tienda-online-sin-inventario-catalogo-whatsapp', 'Cuesta desde $299.990 + IVA, se lanza en semanas'),
  ('tienda-online-sin-inventario-catalogo-whatsapp', 'invertir en un ecommerce completo desde $599.990 + IVA.'),
  ('tienda-online-sin-inventario-catalogo-whatsapp', '[automatización](/automatizacion) y parte desde $249.990 + IVA.'),
  ('tienda-online-sin-inventario-catalogo-whatsapp', 'pasarela de pagos (integración desde $149.990 + IVA) y gestión de stock (desde $249.990 + IVA), o pasar directo a un ecommerce completo desde $599.990 + IVA.'),
  ('medir-roi-pagina-web-empresa-b2b', 'Si el sitio costó $399.990 + IVA y esperas que sirva tres años, son unos $11.100 mensuales.')
)
select b.slug, f.frase
from public."BlogPost" b
join frases_antiguas f on f.slug = b.slug
where coalesce(b.content, '') || ' ' || coalesce(b.excerpt, '') || ' ' ||
      coalesce(b."metaDescription", '') like '%' || f.frase || '%'
order by b.slug, f.frase;

-- =========================================================
-- VERIFICACION 3 (red de seguridad): cifras que desaparecieron por completo
-- de src/config/pricing.ts. Si alguna sigue viva en estos articulos, quedo
-- texto sin migrar. Debe devolver 0 filas.
-- =========================================================
with articulos (slug) as (values
  ('cuanto-cuesta-pagina-web-empresa-chile'),
  ('que-debe-tener-pagina-web-profesional-pyme'),
  ('diferencia-pagina-web-tienda-online-sistema-web'),
  ('que-es-sistema-web-a-medida'),
  ('automatizacion-whatsapp-empresas-casos-reales-chile'),
  ('que-debe-incluir-sistema-gestion-interno-pymes'),
  ('soporte-ti-pymes-santiago-que-buscar-evitar'),
  ('vender-online-chile-sin-shopify-alternativas-pymes'),
  ('panel-administrativo-vs-excel-salto-digital'),
  ('landing-page-vs-sitio-web-completo-negocio'),
  ('tienda-online-sin-inventario-catalogo-whatsapp'),
  ('medir-roi-pagina-web-empresa-b2b')
), cifras_retiradas (cifra) as (values
  ('$219.990'),
  ('$599.990'),
  ('$990.000'),
  ('$1.690.000'),
  ('$39.990')
)
select b.slug, c.cifra
from public."BlogPost" b
join articulos a on a.slug = b.slug
join cifras_retiradas c
  on coalesce(b.content, '') || ' ' || coalesce(b.excerpt, '') || ' ' ||
     coalesce(b."metaDescription", '') like '%' || c.cifra || '%'
order by b.slug, c.cifra;
