import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import {
  ContractDocumentService,
  renderContractText,
} from "../dist/contracts/contract-document.service.js";
import {
  contractBlocks,
  normalizeContractPdfText,
  renderContractPdf,
} from "../dist/contracts/contract-pdf-layout.js";
import { chileanContractTemplates } from "../dist/contracts/contract-template-catalog.js";

const compact = (text) => normalizeContractPdfText(text).replace(/\s+/g, "");
const contentKinds = new Set(["section", "heading", "body", "identity", "signature"]);
const fixture = () => ({
  contractNumber: "CTR-2026-000001",
  name: "Contrato de revisión de diseño",
  version: 1,
  templateCodes: chileanContractTemplates.map((template) => template.code),
  builderValues: Object.fromEntries(
    chileanContractTemplates.flatMap((template) =>
      template.variables.map((variable) => [variable.key, "Valor contractual de prueba"]),
    ),
  ),
});

test("layout classification preserves every word, clause number and signature", () => {
  const source =
    "====================================================================\n\nCONTRATO N.º CTR-1\n\nPRIMERA. OBJETO.\nTexto íntegro con “comillas”, RUT 76.710.961-k y $2.368.100.\n\n1. Entregable\nDetalle del servicio.\n\nFirmas:\nZYTERON: representante\nCLIENTE: representante";
  const blocks = contractBlocks(source);
  assert.equal(
    compact(
      blocks
        .filter((block) => block.kind !== "divider")
        .map((block) => block.text)
        .join(""),
    ),
    compact(source.replace(/^=+$/gm, "")),
  );
  assert.equal(blocks.find((block) => block.text.startsWith("PRIMERA"))?.kind, "heading");
  assert.equal(blocks.find((block) => block.text.startsWith("Firmas"))?.kind, "signature");
});

test("all contract templates retain their complete text in the PDF", async () => {
  const contract = fixture(),
    placements = [];
  const result = await new ContractDocumentService().render(contract, {
    onText: (run) => placements.push(run),
  });
  const sections = renderContractText(contract);
  const expected = sections
    .map((section) => section.name + section.text.replace(/^=+$/gm, ""))
    .join("");
  assert.equal(
    compact(
      placements
        .filter((run) => contentKinds.has(run.kind))
        .map((run) => run.text)
        .join(""),
    ),
    compact(expected),
  );
  assert.equal(result.unresolved.length, 0);
  assert.equal(result.filename, "CTR-2026-000001-v1.pdf");
  assert.equal(result.hash, createHash("sha256").update(result.bytes).digest("hex"));
  for (const run of placements) {
    assert.ok(run.x >= 59.9 && run.x + run.width <= 535.4, `Horizontal overflow: ${run.text}`);
    assert.ok(run.y >= 34 && run.y + run.height <= 821, `Vertical overflow: ${run.text}`);
    if (contentKinds.has(run.kind)) assert.ok(run.y >= 73, `Body overlaps footer: ${run.text}`);
  }
  const pdf = await PDFDocument.load(result.bytes);
  assert.equal(pdf.getPageCount(), Math.max(...placements.map((run) => run.page)) + 1);
  for (const page of pdf.getPages())
    assert.deepEqual(page.getSize(), { width: 595.28, height: 841.89 });
});

test("long clauses and unbroken references wrap inside the printable margins", async () => {
  const placements = [],
    reference = "referencia".repeat(90);
  const sections = [
    {
      code: "ZT-PRUEBA-CL",
      name: "Contrato de prueba de paginación",
      text: `PRIMERA. ALCANCE.\n\n${"Contenido contractual sin cambios. ".repeat(220)}${reference}\n\nSEGUNDA. CIERRE.\n\nLas partes mantienen el texto original.\n\nFirmas:\nRepresentante Zyteron\nRepresentante Cliente`,
    },
  ];
  await renderContractPdf(fixture(), sections, { onText: (run) => placements.push(run) });
  assert.ok(Math.max(...placements.map((run) => run.page)) > 0);
  assert.equal(
    compact(
      placements
        .filter((run) => contentKinds.has(run.kind))
        .map((run) => run.text)
        .join(""),
    ),
    compact(sections[0].name + sections[0].text),
  );
  for (const run of placements.filter((run) => contentKinds.has(run.kind)))
    assert.ok(run.x + run.width <= 535.4 && run.y >= 73);
  for (const heading of placements.filter((run) => run.kind === "heading")) {
    assert.ok(
      placements.some(
        (run) => run.page === heading.page && run.kind === "body" && run.y < heading.y,
      ),
      "A clause heading must stay with its body.",
    );
  }
  const signature = placements.find((run) => run.kind === "signature");
  assert.ok(
    placements.some((run) => run.page === signature.page && run.kind === "body"),
    "Signatures stay with the closing text.",
  );
});
