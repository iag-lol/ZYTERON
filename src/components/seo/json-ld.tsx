type JsonLdData = Record<string, unknown> | Array<Record<string, unknown>>;

/**
 * Evita que contenido administrable con `</script>` cierre el bloque JSON-LD
 * e inyecte HTML. Los escapes siguen siendo JSON válido para los crawlers.
 */
export function serializeJsonLd(data: JsonLdData) {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function JsonLd({ data, id }: { data: JsonLdData; id?: string }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(data),
      }}
    />
  );
}
