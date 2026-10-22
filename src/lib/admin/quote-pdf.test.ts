import assert from "node:assert/strict";
import test, { afterEach, mock } from "node:test";
import { PDFDocument, PDFPage, StandardFonts, type PDFPageDrawTextOptions } from "pdf-lib";
import { generateQuotePdf } from "./quote-pdf";

type Input = Parameters<typeof generateQuotePdf>[0];
const compact = (value: string) => value.replace(/\s/g, "");
const fixture = (): Input => ({
  quoteId: "67c798a3-example",
  clientName: "Empresa Ejemplo",
  clientEmail: "contacto@example.com",
  createdAt: "2026-10-20T12:00:00Z",
  meta: {
    validUntil: "2026-10-30",
    paymentTerms: "50% de anticipo.\n50% contra entrega del proyecto.",
    notes: "Propuesta comercial de desarrollo web.",
    terms: "El servicio incluye las configuraciones descritas.",
    includeIva: true,
    subtotal: 419980,
    totalDescuento: 60000,
    iva: 79796,
    grandTotal: 499776,
    items: [
      {
        description: "Desarrollo de sitio web corporativo",
        detail: "Diseño adaptable a móviles y publicación.",
        qty: 1,
        unit: "unidad",
        unitPrice: 419980,
      },
    ],
  },
});
function capture() {
  const calls: { text: string; options: PDFPageDrawTextOptions; page: PDFPage }[] = [];
  const drawText = PDFPage.prototype.drawText;
  mock.method(
    PDFPage.prototype,
    "drawText",
    function (this: PDFPage, text: string, options: PDFPageDrawTextOptions = {}) {
      calls.push({ text, options, page: this });
      return drawText.call(this, text, options);
    },
  );
  return calls;
}
afterEach(() => mock.restoreAll());

test("cotización breve: una página, fechas locales, descripción normal y total sin descontar dos veces", async () => {
  const calls = capture();
  const bytes = await generateQuotePdf(fixture());
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 1);
  const text = calls.map((call) => call.text).join(" ");
  assert.match(text, /20-10-2026/);
  assert.match(text, /30-10-2026/);
  assert.match(text, /\$499\.776/);
  assert.match(text, /\$419\.980/);
  assert.match(text, /Descuento incluido/);
  assert.match(text, /50% contra entrega del proyecto/);
  assert.equal(
    calls.find((call) => call.text === fixture().meta.items[0].description)?.options.font?.name,
    StandardFonts.Helvetica,
  );
});

test("textos extensos: conserva todas las descripciones, detalles, notas, pagos y términos en múltiples páginas", async () => {
  const calls = capture();
  const input = fixture();
  const longText = (prefix: string, count: number) =>
    Array.from(
      { length: count },
      (_, i) => `${prefix}${i}: configuración y validación del servicio solicitado.`,
    ).join("\n");
  input.meta.notes = longText("Resumen", 75);
  input.meta.paymentTerms = longText("Pago", 75);
  input.meta.terms = longText("Condición", 150);
  input.meta.items = [
    {
      ...input.meta.items[0],
      description: longText("Servicio", 155),
      detail: longText("Detalle", 75),
    },
    {
      ...input.meta.items[0],
      description: `Correo: ${"cuenta".repeat(150)}@example.com FIN-CORREO`,
    },
    ...Array.from({ length: 24 }, (_, i) => ({
      ...input.meta.items[0],
      description: `Servicio adicional ${i}`,
      detail: `Detalle completo ${i}`,
    })),
  ];
  const pdf = await PDFDocument.load(await generateQuotePdf(input));
  assert.ok(pdf.getPageCount() > 8);
  const bodyText = (x: number, size: number) =>
    compact(
      calls
        .filter(
          ({ options }) =>
            options.x === x &&
            options.size === size &&
            options.font?.name === StandardFonts.Helvetica,
        )
        .map(({ text }) => text)
        .join(" "),
    );
  assert.ok(bodyText(36, 8.5).includes(compact(input.meta.notes)));
  assert.ok(bodyText(36, 8.5).includes(compact(input.meta.paymentTerms)));
  assert.ok(bodyText(36, 8).includes(compact(input.meta.terms)));
  for (const item of input.meta.items) {
    assert.ok(
      bodyText(46, 8.5).includes(
        compact([item.description, item.detail].filter(Boolean).join("\n")),
      ),
    );
  }
  const text = compact(calls.map(({ text }) => text).join(" "));
  assert.ok(text.includes("Ítem1·continuación"));
  assert.ok(!text.includes("Serviciosadicionalescotizados"));
  for (let i = 1; i <= pdf.getPageCount(); i += 1)
    assert.ok(text.includes(compact(`Página ${i} de ${pdf.getPageCount()}`)));
  for (const { text, options, page } of calls) {
    if (!text || !options.font || !options.size) continue;
    const width = Array.from(text).reduce(
      (sum, ch) => sum + options.font!.widthOfTextAtSize(ch, options.size!),
      0,
    );
    assert.ok(options.x! + width <= page.getWidth() - 35);
    assert.ok(options.x! >= 36);
    assert.ok(options.y! >= 18);
    if (/^(Resumen|Servicio\d|Pago|Condición|Detalle\d)/.test(text)) {
      assert.ok(options.y! > 62);
      assert.equal(options.font.name, StandardFonts.Helvetica);
    }
  }
});

test("conserva unidades largas y maneja caracteres especiales sin abortar el PDF", async () => {
  const calls = capture();
  const input = fixture();
  input.meta.items[0].unit = "licencias corporativas anuales";
  input.meta.items[0].description = "Configuración → validación ✓ y publicación";
  input.meta.includeIva = false;
  input.meta.iva = 0;
  input.meta.grandTotal = input.meta.subtotal;
  await generateQuotePdf(input);
  const units = calls
    .filter(
      ({ options }) =>
        options.x !== undefined && options.x >= 339 && options.x < 375 && options.size === 7.5,
    )
    .map(({ text }) => text)
    .join(" ");
  assert.ok(compact(units).includes(compact(input.meta.items[0].unit)));
  assert.match(calls.map(({ text }) => text).join(" "), /Se aplican al facturar/);
});
