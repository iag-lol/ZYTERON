import type { DbBlogPost } from "@/lib/admin/blog-cases-repository";
import { PLAN_PRICE_AMOUNTS, fromPrice } from "@/config/pricing";
import { planDeadline, OFFER_CONDITIONS } from "@/config/commercial-offer";

const revisionDate = "2026-11-08T08:58:00.000Z";
const revisions: Record<string, { title: string; excerpt: string; appendix: string }> = {
  "diferencia-pagina-web-tienda-online-sistema-web": {
    title: "Página web, catálogo y ecommerce: diferencias, costes y evolución",
    excerpt:
      "Compara alcance, inversión inicial, costes recurrentes y condiciones para evolucionar desde una web hacia ecommerce o sistemas internos.",
    appendix: `## Alcance, coste total y siguiente etapa

Web Básica: ${fromPrice(PLAN_PRICE_AMOUNTS["web-basica"])} y plazo referencial de ${planDeadline("web-basica")}. Catálogo WhatsApp: ${fromPrice(PLAN_PRICE_AMOUNTS.catalogo)}, con pago y entrega coordinados por el negocio. Ecommerce Profesional: ${fromPrice(PLAN_PRICE_AMOUNTS.ecommerce)} y plazo referencial de ${planDeadline("ecommerce")}, con catálogo, carrito y pasarela según alcance.

${OFFER_CONDITIONS.recurring} ${OFFER_CONDITIONS.delivery}

Antes de evolucionar, revisa demanda, cantidad y calidad de fichas, stock, método de cobro y capacidad de despacho. El presupuesto confirma carga inicial, administración y revisiones. La inversión no garantiza ventas ni se presume que una etapa financie la siguiente.

Consulta [planes e inclusiones](/planes), prueba una [demostración](/demos) o prepara una [estimación con tus necesidades](/calculadora-precio-pagina-web). Para priorizar un proceso interno, usa la [guía de elección por necesidades](/blog/pagina-web-tienda-online-o-sistema-web-cual-necesita-tu-empresa).`,
  },
  "pagina-web-tienda-online-o-sistema-web-cual-necesita-tu-empresa": {
    title: "Cómo elegir entre web, tienda y sistema según tu proceso",
    excerpt:
      "Una guía de diagnóstico para identificar la necesidad prioritaria, las personas involucradas y la primera entrega útil para tu empresa.",
    appendix: `## Diagnóstico antes de especificar funcionalidades

1. Describe una tarea concreta: recibir consultas, preparar pedidos, cobrar, revisar inventario o aprobar documentos.
2. Identifica quién la inicia, quién decide y quién recibe el resultado. Anota usuarios aproximados y permisos necesarios.
3. Registra dónde están los datos, qué herramienta usan hoy y qué integración o migración sería necesaria.
4. Define una primera entrega y cómo comprobarla: una solicitud registrada, un pedido preparado o un documento aprobado con trazabilidad.
5. Separa necesidades actuales de ampliaciones y acuerda soporte, accesos y continuidad por escrito.

En [Fenice](/casos-exito/fenice-spa), el alcance publicado se concentra en presentar servicios y facilitar consultas. En [Negocios Eliana](/casos-exito/casos-exito-sistema-control-interno-negocios-eliana), se centraliza la operación de dos tiendas. Son necesidades distintas y se evalúan con criterios distintos.

Para comparar inversión y operación, revisa la [guía de diferencias y costes](/blog/diferencia-pagina-web-tienda-online-sistema-web). Si ya identificaste un proceso, [solicita un diagnóstico](/contacto?tipo=sistema&origen=guia-diagnostico).`,
  },
};

/** Corrección acotada a las versiones auditadas; una edición posterior del CMS tiene prioridad. */
export function revisePublicArticle(post: DbBlogPost): DbBlogPost {
  const revision = revisions[post.slug];
  if (!revision || (post.updatedAt && post.updatedAt > revisionDate)) return post;
  let content = post.content
    .replace(
      /un catálogo por WhatsApp entrega el 80% del beneficio con la mitad de la inversión/gi,
      "un catálogo por WhatsApp permite validar el flujo de pedidos con un alcance menor que un ecommerce completo",
    )
    .replace(
      /un sistema web se paga solo con ese tiempo recuperado/gi,
      "conviene medir ese tiempo y comparar el coste del sistema con el beneficio esperado",
    )
    .replace(
      /Cada etapa se financia con los resultados de la anterior/gi,
      "Cada etapa requiere evaluar presupuesto y resultados antes de ampliar el alcance",
    );
  content += `\n\n${revision.appendix}`;
  return {
    ...post,
    title: revision.title,
    metaTitle: revision.title,
    excerpt: revision.excerpt,
    metaDescription: revision.excerpt,
    content,
    updatedAt: revisionDate,
  };
}
