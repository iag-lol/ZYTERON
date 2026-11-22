import { writeFileSync } from "node:fs";
import {
  PLAN_CATALOG,
  MAINTENANCE_CATALOG,
  ADDON_CATALOG,
  PRICING_NOTE,
} from "../src/config/pricing";
const plans = [
  ...PLAN_CATALOG.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.block,
    amount: p.amount,
    billingType: "ONE_TIME",
    description: p.summary,
    features: p.features,
  })),
  ...MAINTENANCE_CATALOG.map((p, i) => ({
    id: `maintenance-${i}`,
    name: p.name,
    category: "mantencion",
    amount: p.amount,
    billingType: "SUBSCRIPTION",
    description: p.note ?? "Mantención mensual",
    features: p.includes,
  })),
  ...ADDON_CATALOG.map((p) => ({
    id: `addon-${p.id}`,
    name: p.name,
    category: "adicional",
    amount: p.amount,
    billingType: "ONE_TIME",
    description: p.note ?? "Servicio adicional",
    features: [],
  })),
];
writeFileSync(
  new URL("../control-runtime/src/sales-workspace/public-plans.ts", import.meta.url),
  `// Catálogo comercial derivado de src/config/pricing.ts.\nexport const publicPlans = ${JSON.stringify(plans, null, 2)} as const;\nexport const pricingNote = ${JSON.stringify(PRICING_NOTE)};\n`,
);
