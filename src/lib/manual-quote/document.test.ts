import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument, PDFPage, type PDFPageDrawTextOptions } from "pdf-lib";
import {
  CATALOG_VERSION,
  CLOSED_ADDONS,
  calculateManualQuote,
  addonAvailability,
  selectManualAddon,
  type ManualSelection,
} from "./catalog";
import { generateManualQuoteDocument } from "./document";
import { clp } from "@/config/pricing";

test("PDF: el subtotal, IVA y total de una cotización con tres adicionales permanecen en la primera hoja", async (t) => {
  const snapshot = calculateManualQuote({
    version: CATALOG_VERSION,
    planId: "pyme",
    addons: [
      { id: "multiStepForm", quantity: 1 },
      { id: "whatsappForm", quantity: 1 },
      { id: "technicalSeo", quantity: 1 },
    ],
  });
  const byPage = new Map<PDFPage, string[]>(),
    original = PDFPage.prototype.drawText;
  t.mock.method(
    PDFPage.prototype,
    "drawText",
    function (this: PDFPage, text: string, options: PDFPageDrawTextOptions = {}) {
      const values = byPage.get(this) || [];
      values.push(text);
      byPage.set(this, values);
      return original.call(this, text, options);
    },
  );
  const bytes = await generateManualQuoteDocument({
    id: "a1000000-0000-4000-a000-000000000001",
    name: "Cliente de demostración",
    email: "proyectos@example.com",
    createdAt: "2026-11-09T12:00:00Z",
    snapshot,
  });
  const first = [...byPage.values()][0];
  assert.ok(
    first.includes("Subtotal neto") && first.includes("IVA (19%)") && first.includes("TOTAL CLP"),
  );
  assert.ok(first.includes("$1.130.452"));
  assert.ok((await PDFDocument.load(bytes)).getPageCount() <= 4);
});

test("PDF: alcance extenso, límites de página, importes y datos largos", async (t) => {
  let selection: ManualSelection = { version: CATALOG_VERSION, planId: "ecommerce", addons: [] };
  for (const a of CLOSED_ADDONS)
    if (!addonAvailability(selection.planId, a, selection.addons))
      selection = selectManualAddon(selection, a.id, 1);
  const snapshot = calculateManualQuote(selection),
    written: string[] = [];
  const regions: {
    page: PDFPage;
    text: string;
    x: number;
    right: number;
    bottom: number;
    top: number;
  }[] = [];
  const original = PDFPage.prototype.drawText;
  t.mock.method(
    PDFPage.prototype,
    "drawText",
    function (this: PDFPage, text: string, options: PDFPageDrawTextOptions = {}) {
      const { x = 0, y = 0, size = 10, font } = options;
      const textWidth = Array.from(text).reduce(
        (sum, c) => sum + (font?.widthOfTextAtSize(c, size) || 0),
        0,
      );
      assert.ok(
        x >= 40 && x + textWidth <= this.getWidth() - 40 + 0.1,
        `Texto fuera del ancho: ${text}`,
      );
      assert.ok(y >= 18 && y + size <= this.getHeight() - 20, `Texto fuera de altura: ${text}`);
      written.push(text);
      const bottom = y - size * 0.3,
        top = y + size * 1.08;
      for (const region of regions.filter((r) => r.page === this)) {
        const overlapWidth = Math.min(x + textWidth, region.right) - Math.max(x, region.x);
        const overlapHeight = Math.min(top, region.top) - Math.max(bottom, region.bottom);
        assert.ok(
          overlapWidth <= 2 || overlapHeight <= 2,
          `Textos superpuestos: ${region.text} / ${text}`,
        );
      }
      regions.push({ page: this, text, x, right: x + textWidth, bottom, top });
      return original.call(this, text, options);
    },
  );
  const bytes = await generateManualQuoteDocument({
    id: "a1000000-0000-4000-a000-000000000001",
    name: "Empresa de demostración con razón social extensa y caracteres áéíóú ñ ".repeat(2),
    email: "departamento.comercial." + "a".repeat(150) + "@example.com",
    createdAt: "2026-11-09T12:00:00Z",
    snapshot,
  });
  const pdf = await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount() > 5);
  const text = written.join(" ").replace(/\s+/g, " ");
  for (const a of snapshot.addons) assert.ok(text.includes(a.name), a.name);
  assert.ok(text.includes(clp(snapshot.total)));
  assert.ok(text.includes("IVA (19%)") && text.includes("09-11-2026"));
  assert.equal(written.filter((s) => /^[0-9]+ \/ [0-9]+$/.test(s)).length, pdf.getPageCount());
});

test("PDF: usa el snapshot anterior sin alterar valores contratados", async (t) => {
  const snapshot = JSON.parse(
    JSON.stringify(
      calculateManualQuote({ version: CATALOG_VERSION, planId: "web-basica", addons: [] }),
    ),
  );
  snapshot.version = "08-11-2026.1";
  snapshot.total = 123456;
  const written: string[] = [],
    original = PDFPage.prototype.drawText;
  t.mock.method(
    PDFPage.prototype,
    "drawText",
    function (this: PDFPage, text: string, options: PDFPageDrawTextOptions = {}) {
      written.push(text);
      return original.call(this, text, options);
    },
  );
  const pdf = await PDFDocument.load(
    await generateManualQuoteDocument({
      id: "a1000000-0000-4000-a000-000000000001",
      name: "Cliente de demostración",
      email: "proyectos@example.com",
      createdAt: "2026-11-08T12:00:00Z",
      acceptedAt: "2026-11-08T13:00:00Z",
      snapshot,
    }),
  );
  assert.ok(pdf.getPageCount() >= 3);
  assert.ok(written.includes("08-11-2026.1"));
  assert.ok(written.includes("$123.456"));
  assert.match(written.join(" "), /no acredita una transacción pagada/);
});
