/**
 * Renderizador de Markdown mínimo y SIN dependencias.
 *
 * Diseñado para el contenido del blog administrado (un único autor de confianza).
 * Escapa primero todo el HTML para evitar XSS almacenado y luego aplica un
 * subconjunto seguro de Markdown. El resultado se inyecta con
 * `dangerouslySetInnerHTML`, por eso el escape es obligatorio.
 *
 * Soporta: encabezados (## y ###), negrita, itálica, código en línea,
 * enlaces, listas con viñetas y numeradas, citas, separadores y párrafos.
 * Se evita `#` (h1) a propósito para no romper la jerarquía de un solo H1 por página.
 */

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Aplica formato en línea sobre texto YA escapado. */
function renderInline(text: string): string {
  let out = text;
  // Código en línea: `code`
  out = out.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
  // Enlaces: [texto](url) — sólo http(s), mailto o rutas internas.
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) => {
    const safeHref = /^(https?:\/\/|mailto:|\/)/i.test(href) ? href : "#";
    const external = /^https?:\/\//i.test(safeHref);
    const rel = external ? ' rel="noopener noreferrer" target="_blank"' : "";
    return `<a href="${safeHref}"${rel}>${label}</a>`;
  });
  // Negrita: **texto**
  out = out.replace(/\*\*([^*]+)\*\*/g, (_m, t) => `<strong>${t}</strong>`);
  // Itálica: *texto*
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, (_m, pre, t) => `${pre}<em>${t}</em>`);
  return out;
}

export function renderMarkdown(markdown: string): string {
  if (!markdown) return "";
  const escaped = escapeHtml(markdown.replace(/\r\n/g, "\n"));
  const lines = escaped.split("\n");

  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];
  let quote: string[] = [];

  function flushParagraph() {
    if (paragraph.length) {
      html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  }
  function flushList() {
    if (listType && listItems.length) {
      const items = listItems.map((i) => `<li>${renderInline(i)}</li>`).join("");
      html.push(`<${listType}>${items}</${listType}>`);
    }
    listType = null;
    listItems = [];
  }
  function flushQuote() {
    if (quote.length) {
      html.push(`<blockquote>${renderInline(quote.join(" "))}</blockquote>`);
      quote = [];
    }
  }
  function flushAll() {
    flushParagraph();
    flushList();
    flushQuote();
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      flushAll();
      continue;
    }

    // Separador ---
    if (/^---+$/.test(line.trim())) {
      flushAll();
      html.push("<hr />");
      continue;
    }

    // Encabezados ### / ##
    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushAll();
      const level = heading[1].length; // 2 o 3
      html.push(`<h${level}>${renderInline(heading[2].trim())}</h${level}>`);
      continue;
    }

    // Cita >
    const quoteMatch = /^>\s?(.*)$/.exec(line);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quote.push(quoteMatch[1]);
      continue;
    }

    // Lista numerada 1.
    const ol = /^\d+\.\s+(.*)$/.exec(line.trim());
    if (ol) {
      flushParagraph();
      flushQuote();
      if (listType !== "ol") flushList();
      listType = "ol";
      listItems.push(ol[1]);
      continue;
    }

    // Lista con viñetas - o *
    const ul = /^[-*]\s+(.*)$/.exec(line.trim());
    if (ul) {
      flushParagraph();
      flushQuote();
      if (listType !== "ul") flushList();
      listType = "ul";
      listItems.push(ul[1]);
      continue;
    }

    // Texto normal -> acumula párrafo
    flushList();
    flushQuote();
    paragraph.push(line.trim());
  }

  flushAll();
  return html.join("\n");
}
