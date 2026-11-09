import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import type { ManualSelection } from "../src/lib/manual-quote/catalog";
const require = createRequire(import.meta.url);
const {
  CATALOG_VERSION,
  CLOSED_ADDONS,
  addonAvailability,
  calculateManualQuote,
  selectManualAddon,
} = require("../src/lib/manual-quote/catalog") as typeof import("../src/lib/manual-quote/catalog");
const { generateManualQuoteDocument } =
  require("../src/lib/manual-quote/document") as typeof import("../src/lib/manual-quote/document");

const output = "output/pdf";
await mkdir(output, { recursive: true });
const empty = (planId: string): ManualSelection => ({
  version: CATALOG_VERSION,
  planId,
  addons: [],
});
let extensive = empty("ecommerce");
for (const addon of CLOSED_ADDONS) {
  if (!addonAvailability(extensive.planId, addon, extensive.addons))
    extensive = selectManualAddon(extensive, addon.id, 1);
}
const examples: [string, ManualSelection][] = [
  ["cotizacion-web-zyteron", empty("web-basica")],
  [
    "cotizacion-profesional-zyteron",
    {
      ...empty("ecommerce"),
      addons: [
        "emailSetup15",
        "databaseMedium",
        "booking",
        "crm",
        "productVariants",
        "products100",
        "whatsappTemplateSetup",
        "pdfGenerator",
      ].map((id) => ({ id, quantity: 1 })),
    },
  ],
  ["cotizacion-extensa-zyteron", extensive],
];
for (const [name, selection] of examples) {
  const snapshot = calculateManualQuote(selection);
  const bytes = await generateManualQuoteDocument({
    id: "a1000000-0000-4000-a000-000000000001",
    name: "Empresa de demostración",
    email: "proyectos@example.com",
    createdAt: "2026-11-09T12:00:00Z",
    snapshot,
  });
  const path = `${output}/${name}.pdf`;
  await writeFile(path, bytes);
  console.log(JSON.stringify({ path, modules: snapshot.addons.length, total: snapshot.total }));
}
