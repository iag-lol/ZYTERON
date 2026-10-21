/** Catálogo de documentos; su presencia no acredita implementación ni autorización del emisor. */
export const siiDocumentCatalog = [
  {
    code: 33,
    name: "Factura electrónica",
    family: "Ventas",
    description: "Ventas y servicios afectos a IVA.",
    fields: ["Emisor y receptor", "Detalle y descuentos", "Neto, IVA y total", "Condición de pago"],
  },
  {
    code: 34,
    name: "Factura no afecta o exenta electrónica",
    family: "Ventas",
    description: "Ventas y servicios no afectos o exentos.",
    fields: ["Emisor y receptor", "Detalle exento", "Monto exento y total", "Condición de pago"],
  },
  {
    code: 39,
    name: "Boleta electrónica",
    family: "Boletas",
    description: "Comprobante tributario de ventas y servicios al consumidor.",
    fields: ["Emisor", "Detalle de venta", "Impuestos y total", "Flujo de envío de boletas"],
  },
  {
    code: 41,
    name: "Boleta no afecta o exenta electrónica",
    family: "Boletas",
    description: "Ventas y servicios no afectos o exentos al consumidor.",
    fields: ["Emisor", "Detalle exento", "Monto exento y total", "Flujo de envío de boletas"],
  },
  {
    code: 43,
    name: "Liquidación factura electrónica",
    family: "Liquidaciones",
    description:
      "Operaciones por cuenta de terceros y sus comisiones. Documento distinto de una liquidación de sueldo.",
    fields: [
      "Mandante y emisor",
      "Operaciones liquidadas",
      "Comisiones e impuestos",
      "Referencias y totales",
    ],
  },
  {
    code: 46,
    name: "Factura de compra electrónica",
    family: "Compras",
    description: "Compras que requieren emisión por el comprador según la operación autorizada.",
    fields: [
      "Comprador y vendedor",
      "Detalle de compra",
      "Retenciones aplicables",
      "Impuestos y totales",
    ],
  },
  {
    code: 52,
    name: "Guía de despacho electrónica",
    family: "Despachos",
    description: "Traslado de bienes con su motivo y antecedentes de transporte.",
    fields: [
      "Tipo y motivo del traslado",
      "Origen y destino",
      "Bienes y cantidades",
      "Antecedentes del transporte",
    ],
  },
  {
    code: 56,
    name: "Nota de débito electrónica",
    family: "Ajustes",
    description: "Ajuste tributario vinculado a un documento original.",
    fields: [
      "Documento original y folio",
      "Código y motivo de referencia",
      "Detalle del ajuste",
      "Impuestos y totales",
    ],
  },
  {
    code: 61,
    name: "Nota de crédito electrónica",
    family: "Ajustes",
    description: "Anulación o corrección tributaria con referencia al documento original.",
    fields: [
      "Documento original y folio",
      "Código y motivo de referencia",
      "Detalle del ajuste",
      "Impuestos y totales",
    ],
  },
  {
    code: 110,
    name: "Factura de exportación electrónica",
    family: "Exportación",
    description: "Operaciones de exportación y sus antecedentes comerciales y aduaneros.",
    fields: [
      "Receptor extranjero",
      "Moneda y tipo de cambio",
      "Detalle y valores de exportación",
      "Antecedentes aduaneros aplicables",
    ],
  },
  {
    code: 111,
    name: "Nota de débito de exportación electrónica",
    family: "Exportación",
    description: "Ajuste de exportación vinculado al documento original.",
    fields: [
      "Documento de exportación original",
      "Moneda y valores del ajuste",
      "Motivo y referencias",
      "Antecedentes aduaneros aplicables",
    ],
  },
  {
    code: 112,
    name: "Nota de crédito de exportación electrónica",
    family: "Exportación",
    description: "Anulación o corrección de exportación con referencia al original.",
    fields: [
      "Documento de exportación original",
      "Moneda y valores del ajuste",
      "Motivo y referencias",
      "Antecedentes aduaneros aplicables",
    ],
  },
] as const;

export type SiiDocumentCode = (typeof siiDocumentCatalog)[number]["code"];
export const siiDocumentDefinition = (code: number) =>
  siiDocumentCatalog.find((item) => item.code === code);
