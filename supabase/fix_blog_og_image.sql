-- =========================================================
-- Limpieza de BlogPost."ogImageUrl" corrupto (BUG og:image)
-- Ejecutar en Supabase SQL Editor sobre el proyecto de producción.
--
-- Causa: el campo "imagen para compartir / og_image" del CMS guardó el TEXTO
-- DE AYUDA del editor ("Déjala vacía. Tu sistema usará automáticamente la
-- imagen de portada...") en vez de una URL. Al renderizar se emitía como
-- og:image roto (https://www.zyteron.cl/Déjala%20vacía...), rompiendo la
-- miniatura al compartir en WhatsApp/LinkedIn.
--
-- Esta limpieza vacía (NULL) cualquier ogImageUrl que NO sea una URL usable:
--   - que no empiece con http(s):// ni con "/"  (texto suelto), o
--   - que contenga espacios o saltos de línea  (frases del instructivo).
-- Las URLs de imagen reales (sin espacios, http/https o ruta interna) se
-- conservan intactas. Es idempotente: correrla varias veces es seguro.
--
-- Nota: el código ya valida og:image en runtime y cae a la imagen OG dinámica,
-- así que producción ya no emite og:image roto aunque este campo siga sucio.
-- Esta limpieza es para dejar el dato consistente también en la base/CMS.
-- =========================================================

-- 1) Inspección previa: ver qué filas se verán afectadas (no modifica nada).
select id, slug, "ogImageUrl"
from public."BlogPost"
where "ogImageUrl" is not null
  and (
    "ogImageUrl" !~ '^(https?://|/)'   -- no empieza como URL ni ruta
    or "ogImageUrl" ~ '\s'             -- contiene espacios / saltos
  );

-- 2) Limpieza efectiva.
update public."BlogPost"
set "ogImageUrl" = null
where "ogImageUrl" is not null
  and (
    "ogImageUrl" !~ '^(https?://|/)'
    or "ogImageUrl" ~ '\s'
  );

-- 3) Verificación post-limpieza: debe devolver 0 filas.
select count(*) as og_image_invalidos_restantes
from public."BlogPost"
where "ogImageUrl" is not null
  and (
    "ogImageUrl" !~ '^(https?://|/)'
    or "ogImageUrl" ~ '\s'
  );
