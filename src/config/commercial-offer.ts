import { PLAN_CATALOG, type PlanId } from "@/config/pricing";

export const OFFER_CONDITIONS = {
  currency: "CLP",
  taxRate: 0.19,
  taxIncluded: false,
  delivery:
    "Plazos referenciales desde la aprobación del alcance y la recepción de contenidos y accesos. Las revisiones e integraciones pueden modificar el calendario.",
  recurring:
    "Dominio y renovación anual, hosting, mantenimiento, licencias y consumos de terceros se cotizan por separado. El presupuesto especifica proveedor, periodicidad y responsable de pago.",
  ownership:
    "La cotización y el contrato establecen titularidad, accesos, entregables, licencias, garantía y soporte. Revisa las condiciones antes de contratar.",
} as const;

export function planOffer(id: PlanId) {
  const plan = PLAN_CATALOG.find((item) => item.id === id);
  if (!plan) throw new Error(`Plan no definido: ${id}`);
  return { ...plan, ...OFFER_CONDITIONS };
}

export function planDeadline(id: PlanId) {
  return planOffer(id).deadline;
}
