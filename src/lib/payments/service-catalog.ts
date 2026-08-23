import { MAINTENANCE_PRICE_AMOUNTS, clp, monthlyPrice } from "@/config/pricing";

export type ServicePaymentMode = "checkout" | "subscription";

export type ServicePaymentItem = {
  key: string;
  title: string;
  description: string;
  amount: number;
  mode: ServicePaymentMode;
  cta: string;
  priceLabel: string;
};

/**
 * Gestiones de inicio de proyecto. No son servicios del tarifario publicado en
 * `@/config/pricing`: son abonos que se descuentan del proyecto aprobado, por eso
 * son los únicos montos declarados en este archivo. Todo lo que sí corresponde a un
 * servicio publicado (mantención y soporte) se lee desde la fuente única de precios.
 */
export const PROJECT_INTAKE_AMOUNTS = {
  diagnostico: 19990,
  reserva: 39990,
  abono: 80000,
} as const;

export const SERVICE_PAYMENT_ITEMS: ServicePaymentItem[] = [
  {
    key: "diagnostico_inicial",
    title: "Diagnóstico inicial ZYTERON",
    description:
      "Revisión inicial de requerimiento, recomendación de plan y estimación base. Se puede descontar si contratas el proyecto.",
    amount: PROJECT_INTAKE_AMOUNTS.diagnostico,
    mode: "checkout",
    cta: "Pagar diagnóstico",
    priceLabel: `${clp(PROJECT_INTAKE_AMOUNTS.diagnostico)} + IVA`,
  },
  {
    key: "reserva_proyecto",
    title: "Reserva de proyecto",
    description:
      "Reserva cupo de inicio y preparación técnica inicial. Se descuenta del total del proyecto aprobado.",
    amount: PROJECT_INTAKE_AMOUNTS.reserva,
    mode: "checkout",
    cta: "Reservar proyecto",
    priceLabel: `${clp(PROJECT_INTAKE_AMOUNTS.reserva)} + IVA`,
  },
  {
    key: "abono_inicial",
    title: "Abono inicial",
    description:
      "Pago inicial para iniciar proyecto aprobado por cotización. Se descuenta del total acordado.",
    amount: PROJECT_INTAKE_AMOUNTS.abono,
    mode: "checkout",
    cta: "Pagar abono",
    priceLabel: `${clp(PROJECT_INTAKE_AMOUNTS.abono)} + IVA`,
  },
  {
    key: "plan_web_administrada_mensual",
    title: "Plan Web Administrada mensual",
    description:
      "Servicio mensual para presencia digital básica con soporte y mantención menor.",
    amount: MAINTENANCE_PRICE_AMOUNTS.basic,
    mode: "subscription",
    cta: "Contratar mensualidad",
    priceLabel: monthlyPrice(MAINTENANCE_PRICE_AMOUNTS.basic),
  },
  {
    key: "mantencion_mensual",
    title: "Mantención mensual",
    description: "Mantención técnica base y ajustes menores de contenido.",
    amount: MAINTENANCE_PRICE_AMOUNTS.basic,
    mode: "checkout",
    cta: "Pagar mantención",
    priceLabel: monthlyPrice(MAINTENANCE_PRICE_AMOUNTS.basic),
  },
  {
    key: "soporte_prioritario",
    title: "Soporte prioritario",
    description: "Atención prioritaria y gestión técnica avanzada según SLA.",
    amount: MAINTENANCE_PRICE_AMOUNTS.professional,
    mode: "checkout",
    cta: "Pagar soporte prioritario",
    priceLabel: monthlyPrice(MAINTENANCE_PRICE_AMOUNTS.professional),
  },
];

export function getServicePaymentItem(key: string) {
  return SERVICE_PAYMENT_ITEMS.find((item) => item.key === key) || null;
}
